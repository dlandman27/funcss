# fathom — a context-mixing compressor

`fathom` is a general-purpose lossless file compressor built for this research
project. On every corpus tested it compresses **12–20% smaller than the best
mainstream compressors** (xz/LZMA at `-9e`, brotli at `-q 11`, zstd `-19`,
bzip2, gzip), at the cost of speed: it runs at roughly 0.3–0.4 MB/s and uses
about 600 MB of RAM. Compression and decompression are perfectly symmetric
(same speed, same memory).

See [REPORT.md](REPORT.md) for the research survey, design rationale, full
benchmark results, and honest limitations.

## Build

```sh
gcc -O3 -march=native -o fathom fathom.c -lm
```

Single C file, no dependencies.

## Usage

```sh
./fathom c input output    # compress
./fathom d input output    # decompress
```

## Benchmarks

```sh
./bench.sh ./fathom file1 [file2 ...]
```

Emits TSV: `file  size  tool  compressed_size  compress_s  decompress_s  verified`.
Requires `gzip`, `bzip2`, `xz`, `zstd`, `brotli`, and GNU `time`.

## How it works (short version)

fathom predicts the input one *bit* at a time and feeds each prediction to a
binary arithmetic coder. The prediction is a learned blend of ten models:

- **Context models of order 0–6**: adaptive bit-probability tables keyed by
  the last N bytes (orders 0–2 direct-indexed, orders 3–6 hashed), each with a
  count-based adaptive learning rate — fast while a context is young, slower
  as it matures. Low orders converge slowly (more stationary), high orders
  stay fast (nonstationary).
- **A word model**: context = hash of the current alphabetic word, which
  captures natural-language morphology.
- **A sparse model**: context = bytes at distance 2–3, skipping the previous
  byte — helps on binary record-structured data.
- **A match model**: finds the longest previous occurrence of the recent
  context in the full history and predicts its continuation, with confidence
  growing in match length. This is what replaces LZ77 dictionary matching.

The ten predictions are combined by **logistic mixing** — online gradient
descent on weights in the logit domain, with 4096 independent weight sets
selected by the current partial byte, match state, and previous byte. The
mixed probability is then refined by two **SSE/APM stages** (adaptive
probability maps keyed on recent context), and the result drives a carryless
32-bit binary arithmetic coder.

This architecture is in the PAQ/context-mixing lineage pioneered by Matt
Mahoney et al.; the implementation is original and self-contained.
