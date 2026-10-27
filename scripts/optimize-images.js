'use strict';
// Writes small WebP copies of the card artwork and logo for the homepage.
// Cards render at most 200px wide (400px at 2x), so the 512px JPG/PNG
// originals stay as the source of truth and as the fallback in renderCard.
// Idempotent: skips any .webp newer than its source. Run: npm run images
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const ART_DIR = path.join(ROOT, 'public', 'site-images');

function isFresh(src, out) {
  return fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs;
}

async function toWebp(src, out, width) {
  if (isFresh(src, out)) return false;
  await sharp(src).resize({ width, withoutEnlargement: true }).webp({ quality: 72 }).toFile(out);
  return true;
}

async function main() {
  let written = 0;
  for (const file of fs.readdirSync(ART_DIR)) {
    if (!/-square\.(jpg|png)$/.test(file)) continue;
    const src = path.join(ART_DIR, file);
    // 400px for 2x screens, 200px for 1x (paired via srcset in renderCard).
    if (await toWebp(src, path.join(ART_DIR, file.replace(/\.(jpg|png)$/, '.webp')), 400)) written++;
    if (await toWebp(src, path.join(ART_DIR, file.replace(/\.(jpg|png)$/, '-200.webp')), 200)) written++;
  }
  // Hero logo renders at 210px wide.
  if (await toWebp(path.join(ROOT, 'logo.png'), path.join(ROOT, 'logo.webp'), 420)) written++;
  console.log(`optimize-images: ${written} webp file(s) written`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
