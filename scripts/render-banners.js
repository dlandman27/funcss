'use strict';
// Renders banners/<slug>.html to public/site-banners/<slug>.webp (800×300)
// and <slug>-400.webp with headless Chrome. Skips banners whose .webp is newer
// than their source (and the shared frame). Run: npm run banners [slug…]
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'banners');
const OUT = path.join(ROOT, 'public', 'site-banners');
const CHROME = process.env.CHROME_PATH
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CONCURRENCY = 6;

function mtime(file) {
  return fs.existsSync(file) ? fs.statSync(file).mtimeMs : 0;
}

function screenshot(htmlFile, pngFile) {
  return new Promise((resolve, reject) => {
    execFile(CHROME, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--window-size=800,300',
      '--virtual-time-budget=4000',
      `--user-data-dir=${path.join(os.tmpdir(), 'banner-chrome-' + process.pid + '-' + path.basename(pngFile))}`,
      `--screenshot=${pngFile}`,
      'file://' + htmlFile,
    ], { timeout: 30000 }, (err) => (err ? reject(err) : resolve()));
  });
}

async function render(slug) {
  const html = path.join(SRC, `${slug}.html`);
  const png = path.join(os.tmpdir(), `banner-${slug}.png`);
  await screenshot(html, png);
  const img = sharp(png).extract({ left: 0, top: 0, width: 800, height: 300 });
  await img.clone().webp({ quality: 82 }).toFile(path.join(OUT, `${slug}.webp`));
  await img.clone().resize(400, 150).webp({ quality: 80 }).toFile(path.join(OUT, `${slug}-400.webp`));
  fs.rmSync(png, { force: true });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const forced = process.argv.slice(2);
  const frameTime = Math.max(mtime(path.join(SRC, '_frame.css')), mtime(path.join(SRC, '_frame.js')));
  const slugs = fs.readdirSync(SRC)
    .filter((f) => f.endsWith('.html') && !f.startsWith('_'))
    .map((f) => f.slice(0, -5))
    .filter((slug) => {
      if (forced.length) return forced.includes(slug);
      const out = mtime(path.join(OUT, `${slug}.webp`));
      return out < mtime(path.join(SRC, `${slug}.html`)) || out < frameTime;
    });

  let done = 0;
  const failed = [];
  const queue = [...slugs];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const slug = queue.shift();
      try {
        await render(slug);
        done++;
      } catch (err) {
        failed.push(`${slug}: ${err.message.split('\n')[0]}`);
      }
    }
  }));
  console.log(`render-banners: ${done} rendered${failed.length ? `, ${failed.length} failed` : ''}`);
  failed.forEach((f) => console.error('  ' + f));
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
