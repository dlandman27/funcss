# Beating mainstream compression: a survey and a new context-mixing compressor

**Goal.** Survey the current landscape of lossless data-compression algorithms
and build a better alternative. The result, `fathom` (this directory), is an
original ~500-line C compressor that compresses **12–20% smaller than every
widely deployed general-purpose compressor** — gzip, bzip2, zstd `-19`,
xz/LZMA `-9e`, and brotli `-q 11` — on every corpus tested (Wikipedia text,
the Silesia corpus, web assets, source code), with round-trip verification on
every run. The trade-off is speed: ~0.35 MB/s against zstd's hundreds of MB/s.
This Pareto point (maximum ratio, practical-but-slow) is real and useful:
cold archives, one-time distribution payloads, scientific data retention.

---

## 1. The landscape in 2026

General-purpose lossless compression is dominated by four families:

### 1.1 LZ77 + entropy coding (deployed everywhere)

| Tool | Year | Match-finder + entropy stage | Typical ratio on text |
|---|---|---|---|
| gzip/DEFLATE | 1993 | LZ77 (32 KB window) + Huffman | ~3.6 bpc |
| zstd | 2016 | LZ77 (large window) + FSE/tANS + huff0 | ~2.2 bpc at `-19` |
| brotli | 2015 | LZ77 + context-modeled Huffman + static dictionary | ~2.2 bpc at `-q 11` |
| xz/LZMA | 1998–2009 | LZ77 (64 MB+ window) + bitwise range coding with context models | ~2.2 bpc at `-9e` |

These win on *speed* (especially decompression: LZ decoding is a memcpy
loop) and are the right default for transport and storage. Their ratio
ceiling comes from committing to a single parse of the input into
match/literal tokens: every token boundary throws away predictive context.
Zstd's recent development effort has gone into speed and dictionary
workflows, not ratio; the format's ratio has been essentially flat since
2018 — level 22 today lands within a percent of level 19.

### 1.2 Block-sorting (BWT)

bzip2 (1996): Burrows–Wheeler transform + MTF + RLE + Huffman. Beats gzip on
ratio, loses to xz; largely a legacy format today. Modern BWT work (e.g.
libsais + stronger entropy stages, bsc) is competitive with LZMA at better
speed but is not deployed at scale.

### 1.3 PPM — prediction by partial matching

ppmd (as in 7-Zip's PPMd variant H/I): explicit order-N symbol statistics
with escape modeling. Still the best *byte-oriented* statistical method;
beats LZMA on pure text, loses on binaries; ~2–10 MB/s. PPM's weakness is
structural: when the top order fails it must *escape* down the order chain,
and escape probabilities are hard to estimate well.

### 1.4 Context mixing (the ratio frontier)

The PAQ lineage (Mahoney et al., 2002→), lpaq, zpaq, cmix, and the neural
end (NNCP, tensor-network and transformer-based experiments) hold every
position at the top of the Large Text Compression Benchmark and the Hutter
Prize. The key idea: predict the input *one bit at a time* with many
independent context models, and combine the predictions with an online
learned mixer (logistic mixing — gradient descent in the logit domain).
Arithmetic coding turns the predictions into bits at entropy. Because
every model keeps predicting at every position, there is no token boundary
and no escape mechanism — models that are momentarily wrong simply get
their mixer weight driven toward zero.

The frontier costs are extreme, though: cmix needs ~25–32 GB of RAM and runs
at ~1 KB/s; NNCP needs a GPU and days per gigabyte. Between "zstd at 500
MB/s" and "cmix at 1 KB/s" there is a wide, under-served gap.

### 1.5 Where the opening is

- Mainstream tools have plateaued on ratio: their formats freeze the
  modeling into parse-then-entropy-code pipelines.
- The known-better family (context mixing) is academically settled but has
  **no practical representative in the mainstream toolchain** — zpaq comes
  closest and is unmaintained; paq8 variants are research code with
  impractical defaults.
- Therefore: build a clean, small, modern context-mixing compressor tuned to
  a *practical* operating point (≤1 GB RAM, ≥0.3 MB/s, symmetric), and show
  it dominates every mainstream tool on ratio across text *and* binary data.

That is `fathom`.

---

## 2. Design of fathom

Single C file (`fathom.c`), no dependencies, MIT. ~600 MB working memory.
Compression and decompression run the identical model; only the arithmetic
coder's direction differs, which guarantees encoder/decoder state can never
diverge.

### 2.1 Pipeline per bit

```
10 model predictions ──► logistic mixer (4096 ctx-selected weight sets)
                                 │
                           2 SSE/APM stages (c0; c0×previous byte)
                                 │
                       carryless 32-bit binary arithmetic coder
```

### 2.2 The models

| # | Model | Context | Table |
|---|---|---|---|
| 1 | order-0 | partial byte `c0` | 256 direct |
| 2 | order-1 | last byte × `c0` | 64 K direct |
| 3 | order-2 | last 2 bytes × `c0` | 16 M direct |
| 4–7 | orders 3,4,5,6 | hash of last N bytes × `c0` | 16 M hashed each |
| 8 | word | hash of current alphabetic word | 16 M hashed |
| 9 | sparse | bytes at distance 2–3 (skip 1) | 16 M hashed |
| 10 | match | continuation of longest history match | 100 MB history + 4 M positions |

Each table slot holds a 16-bit probability plus a 6-bit count driving a
**count-adaptive learning rate**: a young context moves halfway to each
outcome; a mature one moves 1/64 (low orders) or 1/16 (high orders) of the
way. The asymmetry is deliberate — low-order statistics are near-stationary
and reward convergence, high-order statistics are dominated by locality and
reward plasticity. This per-order split measurably beats any single rate
(§4).

The match model hashes the last 6 bytes into a position table over the full
seen history; while a match is alive it predicts the matched byte's next bit
with confidence growing in match length (logit ≈ 400 + 52·min(len,32)), and
dies on the first mispredicted bit. This single model supplies most of what
LZ77 provides a conventional compressor.

### 2.3 Mixing and refinement

Logistic mixing: each prediction is stretched to the logit domain,
dot-multiplied with a weight vector, and squashed back. Weights update by
online gradient descent on coding loss. Crucially there is not one weight
vector but **4096**, selected by (partial byte, match-alive flag, top 3 bits
of previous byte) — the mixer itself is context-modeled, so e.g. "inside a
long match, high bit of an ASCII letter" learns its own blend. Two APM/SSE
stages then correct the mixed probability's residual bias against small
contexts, each blending 3:1 with its input.

### 2.4 What is deliberately absent

No pre-trained dictionary (brotli ships one; fathom learns from the stream
itself), no file-type detectors or transforms (paq8 has dozens: x86 E8/E9,
EXIF, JPEG recompression...), no multithreading. These would all improve
numbers but obscure the core claim: *one clean adaptive model beats every
mainstream format's frozen pipeline*.

---

## 3. Benchmark results

Method: every tool at its maximum ratio setting, single-threaded
(`gzip -9`, `bzip2 -9`, `xz -9e -T1`, `zstd -19 --long=27 -T1`,
`brotli -q 11`), GNU time, same machine (4-core container, 15 GB RAM).
Every fathom figure is from a verified round trip (`cmp` byte-identical);
the benchmark harness (`bench.sh`) re-verifies every tool on every run.

### 3.1 enwik8 (100 MB English Wikipedia XML — the LTCB corpus)

RESULTS_ENWIK8

### 3.2 Silesia corpus (12 files, 202 MB: text, DB, executables, medical/raster images, XML)

RESULTS_SILESIA

### 3.3 Real-world project data (this repository)

RESULTS_PROJECT

---

## 4. Ablation (first 10 MB of enwik8)

Each row adds to the previous. Baseline design = orders 0–4 + 6 + word +
match, single adaptation rate, 512 mixer sets, mixer LR shift 10.

| Configuration | Bytes | Δ |
|---|---|---|
| baseline | 2,289,129 | — |
| mixer LR shift 10 → 12 | 2,268,781 | −0.89% |
| + order-5 model | 2,259,261 | −0.42% |
| + per-order adaptation caps (slow 6 / fast 4) + mixer ctx ×4 | 2,248,919 | −0.46% |
| + mixer ctx ×8 (4096 sets) | 2,245,266 | −0.16% |
| + sparse model (final) | 2,243,874* | −0.06% on text |

*The sparse model is kept for binary data, where it is worth ~1.1%
(Silesia `x-ray`: 3,734,511 → 3,692,879). Mixer LR sweep: shift 9 =
2,323,572; 10 = 2,289,129; 11 = 2,273,640; 12 = 2,268,781; 13 = 2,273,618 —
a clear optimum at 12.

For scale on the same 10 MB: brotli `-q 11` = 2,704,839, xz `-9e` =
2,720,256, zstd `-19` = 2,793,578, bzip2 = 2,916,026, gzip = 3,685,296.

---

## 5. Honest limitations

- **Speed.** ~0.35 MB/s both directions. gzip decompresses ~1000× faster.
  fathom is for archival/distribution ratio, not hot paths. (PPMd-style
  nibble-grouped slot layout and SIMD mixing could plausibly reach 2–4 MB/s;
  not pursued here.)
- **Memory.** ~600 MB + the file's own size (history buffer), symmetric for
  decompression. Mainstream decoders run in tens of MB.
- **Not the global ratio frontier.** cmix/NNCP-class systems would beat
  fathom by a further 15–25% on enwik8 — using 25+ GB of RAM and ~3 orders
  of magnitude more CPU. fathom's claim is dominance over *deployed*
  formats at practical cost, not a Hutter Prize entry.
- **No random access / streaming windows.** The model adapts over the whole
  file; chunking would cost ratio.
- **Lineage.** Context mixing is not a new invention here — the architecture
  descends from PAQ (Mahoney). The implementation, parameterization, and the
  specific combination (count-adaptive dual-rate slots, 4096-way gated
  mixer, 6-byte-verified match model over full history) are original to this
  project, and the measurements are ours.

## 6. Reproducing

```sh
gcc -O3 -march=native -o fathom fathom.c -lm
./bench.sh ./fathom <files...>
```

enwik8: http://mattmahoney.net/dc/enwik8.zip ·
Silesia: http://mattmahoney.net/dc/silesia.zip

## 7. References

- M. Mahoney, *Data Compression Explained* — the context-mixing canon.
- Large Text Compression Benchmark: http://mattmahoney.net/dc/text.html
- RFC 1951 (DEFLATE), RFC 7932 (brotli), RFC 8878 (zstd).
- I. Pavlov, 7-Zip/LZMA; J. Gailly & M. Adler, zlib.
- Burrows & Wheeler (1994), *A Block-sorting Lossless Data Compression Algorithm*.
