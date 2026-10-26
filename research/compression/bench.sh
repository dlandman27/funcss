#!/bin/bash
# Benchmark fathom against mainstream compressors.
# Usage: bench.sh <fathom-binary> <file...>
# Emits TSV: file  size  tool  compressed  comp_s  decomp_s  verified
set -u
FATHOM="$1"; shift
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

t() { /usr/bin/time -f '%e' "$@" 2>"$TMP/time" >/dev/null; cat "$TMP/time"; }

for F in "$@"; do
  NAME=$(basename "$F"); SIZE=$(stat -c%s "$F")

  # fathom
  CT=$( /usr/bin/time -f '%e %M' "$FATHOM" c "$F" "$TMP/f.fth" 2>&1 >/dev/null )
  DT=$( /usr/bin/time -f '%e' "$FATHOM" d "$TMP/f.fth" "$TMP/f.out" 2>&1 >/dev/null )
  if cmp -s "$F" "$TMP/f.out"; then V=ok; else V=FAIL; fi
  echo -e "$NAME\t$SIZE\tfathom\t$(stat -c%s "$TMP/f.fth")\t${CT}\t${DT}\t$V"
  rm -f "$TMP/f.fth" "$TMP/f.out"

  for TOOL in "gzip -9" "bzip2 -9" "xz -9e -T1" "zstd -19 --long=27 -T1" "brotli -q 11"; do
    BIN=${TOOL%% *}
    CT=$( /usr/bin/time -f '%e' sh -c "$TOOL -c '$F' > '$TMP/c.bin'" 2>&1 )
    case $BIN in
      gzip)   DC="gzip -dc" ;;
      bzip2)  DC="bzip2 -dc" ;;
      xz)     DC="xz -dc" ;;
      zstd)   DC="zstd -dc --long=27" ;;
      brotli) DC="brotli -dc" ;;
    esac
    DT=$( /usr/bin/time -f '%e' sh -c "$DC '$TMP/c.bin' > '$TMP/c.out'" 2>&1 )
    if cmp -s "$F" "$TMP/c.out"; then V=ok; else V=FAIL; fi
    echo -e "$NAME\t$SIZE\t$BIN\t$(stat -c%s "$TMP/c.bin")\t${CT}\t${DT}\t$V"
    rm -f "$TMP/c.bin" "$TMP/c.out"
  done
done
