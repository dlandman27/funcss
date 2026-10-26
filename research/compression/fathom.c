/*
 * fathom — a context-mixing file compressor
 *
 * Design: bitwise context mixing in the PAQ/lpaq lineage (Mahoney et al.),
 * implemented from scratch. Seven adaptive context models (orders 0-4, 6,
 * and a word model), a match model over the full history, a logistic mixer
 * with per-partial-byte weight sets, two SSE/APM refinement stages, and a
 * carryless 32-bit binary arithmetic coder.
 *
 * Goals: beat every mainstream general-purpose compressor (gzip, bzip2,
 * xz/LZMA, zstd, brotli) on compression ratio at practical speed and
 * modest memory (~0.5 GB), with a single symmetric encode/decode path.
 *
 * Usage:
 *   fathom c input output   (compress)
 *   fathom d input output   (decompress)
 *
 * License: MIT.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <math.h>

typedef uint8_t  u8;
typedef uint16_t u16;
typedef uint32_t u32;
typedef uint64_t u64;

#ifndef MIXSHIFT
#define MIXSHIFT 12
#endif
#ifndef SLOWCAP
#define SLOWCAP 6           /* adaptation-rate cap for low orders */
#endif
#ifndef FASTCAP
#define FASTCAP 4           /* adaptation-rate cap for high orders */
#endif
#ifndef MIXCTX2
#define MIXCTX2 3           /* extra mixer-context bits from previous byte */
#endif
typedef int32_t  i32;
typedef int64_t  i64;

static void die(const char *msg) { fprintf(stderr, "fathom: %s\n", msg); exit(1); }

/* ---------------- stretch/squash tables ---------------- */
/* probabilities are 12-bit (0..4095); stretch maps to logit domain
 * scaled by 256 and clamped to [-2047, 2047]. */
static short squash_tab[4096];   /* logit (-2048..2047) -> 12-bit prob */
static short stretch_tab[4096];  /* 12-bit prob -> logit */

static void init_tables(void) {
    for (int x = -2048; x < 2048; x++) {
        double v = 4096.0 / (1.0 + exp(-x / 256.0));
        int p = (int)v;
        if (p > 4095) p = 4095;
        squash_tab[x + 2048] = (short)p;
    }
    for (int p = 0; p < 4096; p++) {
        double pp = (p + 0.5) / 4096.0;
        int s = (int)lround(256.0 * log(pp / (1.0 - pp)));
        if (s < -2047) s = -2047;
        if (s > 2047) s = 2047;
        stretch_tab[p] = (short)s;
    }
}
static inline int squash(int x) {
    if (x < -2047) x = -2047;
    if (x > 2047) x = 2047;
    return squash_tab[x + 2048];
}
static inline int stretch(int p) { return stretch_tab[p]; }

/* ---------------- arithmetic coder ---------------- */
typedef struct {
    u32 x1, x2, x;
    FILE *f;
    int decode;
} Coder;

static void coder_init(Coder *c, FILE *f, int decode) {
    c->x1 = 0; c->x2 = 0xffffffffu; c->x = 0; c->f = f; c->decode = decode;
    if (decode)
        for (int i = 0; i < 4; i++) c->x = (c->x << 8) | (getc(f) & 255);
}

/* p = 16-bit probability that bit==1, in [1,65535] */
static inline int coder_bit(Coder *c, int bit, int p) {
    u32 xmid = c->x1 + (u32)(((u64)(c->x2 - c->x1) * (u32)p) >> 16);
    if (xmid < c->x1) xmid = c->x1;
    if (xmid >= c->x2) xmid = c->x2 - 1;
    if (c->decode) bit = (c->x <= xmid);
    if (bit) c->x2 = xmid; else c->x1 = xmid + 1;
    while (((c->x1 ^ c->x2) & 0xff000000u) == 0) {
        if (c->decode) c->x = (c->x << 8) | (getc(c->f) & 255);
        else putc(c->x2 >> 24, c->f);
        c->x1 <<= 8;
        c->x2 = (c->x2 << 8) | 255;
    }
    return bit;
}
static void coder_flush(Coder *c) {
    if (!c->decode) {
        /* flush enough bytes to disambiguate */
        putc(c->x1 >> 24, c->f);
        putc(c->x1 >> 16, c->f);
        putc(c->x1 >> 8, c->f);
        putc(c->x1, c->f);
    }
}

/* ---------------- adaptive bit predictors ---------------- */
/* slot = 16-bit prob (of 1) + 16-bit count; count-based learning rate:
 * fast adaptation while the context is young, slow when mature. */
typedef struct { u16 p; u16 n; } Slot;

static u8 rate_slow[64], rate_fast[64];
static void init_rates(void) {
    for (int n = 0; n < 64; n++) {
        int sh = 1;
        while ((1 << sh) < n + 2) sh++;   /* sh ~ log2(n+2) */
        rate_slow[n] = (u8)(sh > SLOWCAP ? SLOWCAP : sh);
        rate_fast[n] = (u8)(sh > FASTCAP ? FASTCAP : sh);
    }
}
static inline int slot_p(const Slot *s) { return s->p >> 4; } /* 12-bit */
static inline void slot_update(Slot *s, int bit, const u8 *rate) {
    int target = bit ? 65535 : 0;
    int sh = rate[s->n];
    s->p = (u16)(s->p + ((target - (int)s->p) >> sh));
    if (s->n < 63) s->n++;
}

/* ---------------- model configuration ---------------- */
#ifndef SPARSE
#define SPARSE 1
#endif
#define NMODEL (9 + SPARSE) /* context models + match model */
#define NINPUT (NMODEL + 1) /* + bias */

#define O1_BITS   16        /* direct order-1: byte<<8 | c0 */
#define O2_BITS   24        /* direct order-2 */
#define HASH_BITS 24        /* hashed tables: 16M slots = 64MB each */
#define MM_HBITS  22        /* match-model position table */

typedef struct {
    /* context model tables */
    Slot o0[256];
    Slot *o1, *o2, *o3, *o4, *o5, *o6, *ow, *os;
    /* match model */
    u8  *hist;              /* full history buffer */
    u32 hsize, hpos;
    u32 *mpos;              /* hash -> last position */
    u32 matchptr;           /* position in hist of predicted next byte */
    u32 matchlen;
    /* rolling context state */
    u64 last8;              /* last 8 bytes, newest in low byte */
    u32 whash;              /* word-model hash */
    u32 h3, h4, h5, h6, hw, hs; /* per-byte context hashes */
    int c0;                 /* partial byte, leading 1 */
    int bitpos;
    /* mixer: weight sets selected by (c0, match-active) */
    i32 *mw;                /* 512 sets x NINPUT weights, <<16 fixed point */
    /* APM stages */
    u16 *apm1;              /* 256 ctx x 33 */
    u16 *apm2;              /* 65536 ctx x 33 */
    int c1;                 /* previous byte */
    int c2;
} Model;

static u32 hash_u64(u64 x, u32 seed) {
    x ^= seed * 0x9E3779B97F4A7C15ull;
    x *= 0xff51afd7ed558ccdull;
    x ^= x >> 33;
    x *= 0xc4ceb9fe1a85ec53ull;
    x ^= x >> 29;
    return (u32)x;
}

static Slot *alloc_slots(size_t n) {
    Slot *s = malloc(n * sizeof(Slot));
    if (!s) die("out of memory");
    for (size_t i = 0; i < n; i++) { s[i].p = 32768; s[i].n = 0; }
    return s;
}

static void apm_init(u16 *t, int nctx) {
    for (int c = 0; c < nctx; c++)
        for (int i = 0; i < 33; i++)
            t[c * 33 + i] = (u16)(squash((i - 16) * 128) * 16);
}

static void model_init(Model *m, u64 insize) {
    memset(m, 0, sizeof(*m));
    for (int i = 0; i < 256; i++) { m->o0[i].p = 32768; m->o0[i].n = 0; }
    m->o1 = alloc_slots((size_t)1 << O1_BITS);
    m->o2 = alloc_slots((size_t)1 << O2_BITS);
    m->o3 = alloc_slots((size_t)1 << HASH_BITS);
    m->o4 = alloc_slots((size_t)1 << HASH_BITS);
    m->o5 = alloc_slots((size_t)1 << HASH_BITS);
    m->o6 = alloc_slots((size_t)1 << HASH_BITS);
    m->ow = alloc_slots((size_t)1 << HASH_BITS);
#if SPARSE
    m->os = alloc_slots((size_t)1 << HASH_BITS);
#endif

    m->hsize = insize > 0xffffffffull ? 0xffffffffu : (u32)insize;
    if (m->hsize < 1) m->hsize = 1;
    m->hist = malloc(m->hsize);
    if (!m->hist) die("out of memory (history)");
    m->mpos = calloc((size_t)1 << MM_HBITS, sizeof(u32));
    if (!m->mpos) die("out of memory (match table)");
    m->matchptr = 0; m->matchlen = 0;

    int nmix = 512 << MIXCTX2;
    m->mw = malloc(nmix * NINPUT * sizeof(i32));
    if (!m->mw) die("out of memory (mixer)");
    for (int i = 0; i < nmix * NINPUT; i++) m->mw[i] = 65536 / NINPUT;

    m->apm1 = malloc(256 * 33 * sizeof(u16));
    m->apm2 = malloc(65536 * 33 * sizeof(u16));
    if (!m->apm1 || !m->apm2) die("out of memory (apm)");
    apm_init(m->apm1, 256);
    apm_init(m->apm2, 65536);

    m->c0 = 1;
}

static void model_free(Model *m) {
    free(m->o1); free(m->o2); free(m->o3); free(m->o4); free(m->o5); free(m->o6);
    free(m->ow); free(m->hist); free(m->mpos); free(m->mw);
#if SPARSE
    free(m->os);
#endif
    free(m->apm1); free(m->apm2);
}

/* APM: refine probability p12 given context; returns refined 12-bit prob.
 * Remembers the touched bins for the post-bit update. */
typedef struct { u16 *lo, *hi; int wlo; } ApmRef;

static inline int apm_apply(u16 *t, int ctx, int p12, ApmRef *ref) {
    int st = stretch(p12) + 2048;        /* 0..4095 */
    int idx = st >> 7;                   /* 0..31 */
    int w = st & 127;
    u16 *base = t + ctx * 33 + idx;
    ref->lo = base; ref->hi = base + 1; ref->wlo = 128 - w;
    return (base[0] * (128 - w) + base[1] * w) >> 11; /* back to ~12-bit */
}
static inline void apm_update(ApmRef *ref, int bit) {
    int target = bit ? 65535 : 0;
    *ref->lo = (u16)(*ref->lo + ((target - (int)*ref->lo) >> 6));
    *ref->hi = (u16)(*ref->hi + ((target - (int)*ref->hi) >> 6));
}

/* ---------------- per-byte context refresh ---------------- */
static inline int is_alpha(int c) {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
}

static inline void byte_boundary(Model *m, int byte) {
    /* append to history */
    if (m->hpos < m->hsize) m->hist[m->hpos] = (u8)byte;
    m->hpos++;

    m->c2 = m->c1;
    m->c1 = byte;
    m->last8 = (m->last8 << 8) | (u8)byte;

    if (is_alpha(byte)) m->whash = (m->whash + (u32)(byte | 32) + 1) * 0x6F4F2BA5u;
    else m->whash = 0;

    m->h3 = hash_u64(m->last8 & 0xffffffull, 3);
    m->h4 = hash_u64(m->last8 & 0xffffffffull, 4);
    m->h5 = hash_u64(m->last8 & 0xffffffffffull, 5);
    m->h6 = hash_u64(m->last8 & 0xffffffffffffull, 6);
    m->hw = hash_u64(m->whash, 7);
    /* sparse: bytes at distance 2 and 3, skipping the previous byte */
    m->hs = hash_u64((m->last8 >> 8) & 0xffffull, 13);

    /* match model: find continuation of the last 6 bytes */
    u32 key = hash_u64(m->last8 & 0xffffffffffffull, 11) & (((u32)1 << MM_HBITS) - 1);
    if (m->matchlen) {
        m->matchptr++;
        if (m->matchlen < 65535) m->matchlen++;
        /* validate: predicted byte must have matched (checked bitwise) */
        if (m->matchptr >= m->hpos) m->matchlen = 0;
    }
    if (!m->matchlen) {
        u32 cand = m->mpos[key];
        if (cand > 0 && cand < m->hpos && m->hpos >= 6) {
            /* verify the 6 bytes before cand equal our last 6 */
            u32 cp = cand;
            if (cp >= 6 && cp < m->hsize) {
                int ok = 1;
                for (int i = 1; i <= 6; i++)
                    if (m->hist[cp - i] != (u8)(m->last8 >> (8 * (i - 1)))) { ok = 0; break; }
                if (ok) { m->matchptr = cand; m->matchlen = 6; }
            }
        }
    }
    if (m->hpos <= m->hsize) m->mpos[key] = m->hpos;
}

/* ---------------- main predict/update loop ---------------- */
static u64 read_u64(FILE *f) {
    u64 v = 0;
    for (int i = 0; i < 8; i++) v = (v << 8) | (getc(f) & 255);
    return v;
}
static void write_u64(FILE *f, u64 v) {
    for (int i = 7; i >= 0; i--) putc((int)(v >> (8 * i)) & 255, f);
}

static void process(FILE *in, FILE *out, int decode) {
    u64 insize;
    if (decode) {
        char magic[4];
        if (fread(magic, 1, 4, in) != 4 || memcmp(magic, "FTH1", 4))
            die("not a fathom archive");
        insize = read_u64(in);
    } else {
        fseek(in, 0, SEEK_END);
        insize = (u64)ftell(in);
        fseek(in, 0, SEEK_SET);
        fwrite("FTH1", 1, 4, out);
        write_u64(out, insize);
    }

    Model *m = malloc(sizeof(Model));
    if (!m) die("out of memory");
    model_init(m, insize);

    Coder coder;
    coder_init(&coder, decode ? in : out, decode);

    const u32 hmask = ((u32)1 << HASH_BITS) - 1;

    for (u64 pos = 0; pos < insize; pos++) {
        int byte = 0;
        if (!decode) {
            byte = getc(in);
            if (byte == EOF) die("unexpected EOF");
        }
        m->c0 = 1;
        for (int bp = 7; bp >= 0; bp--) {
            int c0 = m->c0;
            u32 c0h = (u32)c0 * 0x2545F491u;

            /* gather predictions */
            Slot *s[NMODEL - 1];
            s[0] = &m->o0[c0];
            s[1] = &m->o1[((u32)m->c1 << 8) | c0];
            s[2] = &m->o2[((((u32)m->c2 << 8) | (u32)m->c1) << 8) | c0];
            s[3] = &m->o3[(m->h3 ^ c0h) & hmask];
            s[4] = &m->o4[(m->h4 ^ c0h) & hmask];
            s[5] = &m->o5[(m->h5 ^ c0h) & hmask];
            s[6] = &m->o6[(m->h6 ^ c0h) & hmask];
            s[7] = &m->ow[(m->hw ^ c0h) & hmask];
#if SPARSE
            s[8] = &m->os[(m->hs ^ c0h) & hmask];
#endif

            int t[NINPUT];
            for (int i = 0; i < NMODEL - 1; i++) t[i] = stretch(slot_p(s[i]));

            /* match model */
            int mbit = -1;
            if (m->matchlen && m->matchptr < m->hpos && m->matchptr < m->hsize) {
                /* matches die on any mispredicted bit, so the bit prefix of
                 * the predicted byte is always consistent with c0 here */
                int eb = m->hist[m->matchptr];
                mbit = (eb >> bp) & 1;
            }
            if (mbit >= 0) {
                int len = m->matchlen > 32 ? 32 : (int)m->matchlen;
                int str = 400 + len * 52;
                if (str > 2047) str = 2047;
                t[NMODEL - 1] = mbit ? str : -str;
            } else {
                t[NMODEL - 1] = 0;
            }
            t[NINPUT - 1] = 256; /* bias */

            /* mix */
            int mctx = c0 | (m->matchlen ? 256 : 0);
#if MIXCTX2
            mctx |= (m->c1 >> (8 - MIXCTX2)) << 9;
#endif
            i32 *w = &m->mw[mctx * NINPUT];
            i64 dot = 0;
            for (int i = 0; i < NINPUT; i++) dot += (i64)t[i] * w[i];
            int st_mix = (int)(dot >> 16);
            if (st_mix < -2047) st_mix = -2047;
            if (st_mix > 2047) st_mix = 2047;
            int p12 = squash(st_mix);

            /* SSE refinement */
            ApmRef r1, r2;
            int pa = apm_apply(m->apm1, c0, p12, &r1);
            int pb = (p12 + pa * 3) >> 2;
            int pc = apm_apply(m->apm2, (c0 << 8) | m->c1, pb, &r2);
            int pf = (pb + pc * 3) >> 2;

            int p16 = pf * 16 + 8;
            if (p16 < 32) p16 = 32;
            if (p16 > 65503) p16 = 65503;

            int bit;
            if (decode) bit = coder_bit(&coder, 0, p16);
            else { bit = (byte >> bp) & 1; coder_bit(&coder, bit, p16); }

            /* updates */
            int err12 = (bit << 12) - p12;
            for (int i = 0; i < NINPUT; i++) {
                w[i] += ((i64)t[i] * err12) >> MIXSHIFT;
                if (w[i] < -(1 << 20)) w[i] = -(1 << 20);
                if (w[i] > (1 << 20)) w[i] = (1 << 20);
            }
            for (int i = 0; i < 3; i++) slot_update(s[i], bit, rate_slow);
            for (int i = 3; i < NMODEL - 1; i++) slot_update(s[i], bit, rate_fast);
            apm_update(&r1, bit);
            apm_update(&r2, bit);

            /* match model bit validation */
            if (mbit >= 0 && mbit != bit) m->matchlen = 0;

            m->c0 = (c0 << 1) | bit;
        }
        byte = m->c0 & 0xff;
        if (decode) putc(byte, out);
        byte_boundary(m, byte);
    }

    coder_flush(&coder);
    model_free(m);
    free(m);
}

int main(int argc, char **argv) {
    if (argc != 4 || (argv[1][0] != 'c' && argv[1][0] != 'd'))
        die("usage: fathom c|d input output");
    init_tables();
    init_rates();
    FILE *in = fopen(argv[2], "rb");
    if (!in) die("cannot open input");
    FILE *out = fopen(argv[3], "wb");
    if (!out) die("cannot open output");
    process(in, out, argv[1][0] == 'd');
    fclose(in);
    if (fclose(out)) die("write error");
    return 0;
}
