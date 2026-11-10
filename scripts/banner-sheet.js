'use strict';
// Contact sheet of rendered banners, 3 across, for eyeballing a batch.
// Usage: node scripts/banner-sheet.js <out.jpg> [slug…]   (no slugs = all)
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DIR = path.join(__dirname, '..', 'public', 'site-banners');
const [out, ...only] = process.argv.slice(2);
const slugs = (only.length ? only : fs.readdirSync(DIR)
  .filter((f) => f.endsWith('.webp') && !f.endsWith('-400.webp'))
  .map((f) => f.slice(0, -5)))
  .filter((s) => fs.existsSync(path.join(DIR, `${s}.webp`)));
const W = 400, H = 150, GAP = 10, COLS = 3;
const rows = Math.ceil(slugs.length / COLS);

(async () => {
  const tiles = await Promise.all(slugs.map(async (s, i) => ({
    input: await sharp(path.join(DIR, `${s}.webp`)).resize(W, H).toBuffer(),
    left: (i % COLS) * (W + GAP),
    top: Math.floor(i / COLS) * (H + GAP),
  })));
  await sharp({ create: { width: COLS * (W + GAP), height: Math.max(1, rows) * (H + GAP), channels: 3, background: '#fbf7ee' } })
    .composite(tiles).jpeg({ quality: 82 }).toFile(out);
  console.log(`${slugs.length} banners -> ${out}`);
})();
