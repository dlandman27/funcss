'use strict';
// Build-time generator for branded Open Graph preview cards (1200x630 PNG).
// Pure SVG builders here are unit-tested; rasterization (resvg) is lazy-loaded
// only when generateOgImages runs, so requiring this module stays cheap.
const fs = require('fs');
const path = require('path');

const WIDTH = 1200;
const HEIGHT = 630;

// Brand palette (mirrors :root in templates/home.html).
const INK = '#201a17';
const PAPER = '#f5ecd6';
const CARD = '#fefaf0';
const MUTED = '#6b5f57';

// Section key -> accent (mirrors the home page's per-category hover colors).
const SECTION_COLORS = {
  educational: '#5aa0db',
  fun: '#f0563e',
  tools: '#b7ce3c',
  games: '#a98fd0',
  entertainment: '#f47b28',
  mindfulness: '#ff7fa5',
  art: '#2fb0a3',
};
const DEFAULT_COLOR = '#f47b28';

function sectionColor(key) {
  return SECTION_COLORS[key] || DEFAULT_COLOR;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Greedy word wrap to at most maxLines lines of ~maxChars each; the final line
// gets an ellipsis if text was truncated. Long single words are hard-split.
function wrapText(text, maxChars, maxLines) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxChars) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    if (word.length > maxChars) {
      // hard-split an over-long word
      let rest = word;
      while (rest.length > maxChars) {
        lines.push(rest.slice(0, maxChars));
        rest = rest.slice(maxChars);
      }
      line = rest;
    } else {
      line = word;
    }
    if (lines.length >= maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length > maxLines) lines.length = maxLines;
  const truncated = lines.length === maxLines
    && words.join(' ').length > lines.join(' ').length;
  if (truncated) {
    const last = lines[maxLines - 1].replace(/[\s.,;:]+$/, '');
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

// Build the SVG string for one card. Pure — no I/O.
function renderCardSvg(site) {
  const color = sectionColor(site.section);
  const sectionTitle = (site.sectionTitle || site.section || '').toUpperCase();
  const titleLines = wrapText(site.name, 20, 3);
  const descLines = wrapText(site.description, 54, 2);

  const PAD = 64;
  const titleSize = titleLines.length >= 3 ? 76 : 88;
  const titleLead = titleSize * 1.08;
  const titleTop = 250 - (titleLines.length - 1) * (titleLead / 2);

  const titleTspans = titleLines
    .map((l, i) => `<text x="${PAD + 40}" y="${titleTop + i * titleLead}" `
      + `font-family="Nunito" font-size="${titleSize}" font-weight="800" `
      + `fill="${INK}" stroke="${INK}" stroke-width="2.2" paint-order="stroke">`
      + `${escapeXml(l)}</text>`)
    .join('\n    ');

  const descTop = titleTop + titleLines.length * titleLead + 34;
  const descTspans = descLines
    .map((l, i) => `<text x="${PAD + 40}" y="${descTop + i * 46}" `
      + `font-family="Nunito" font-size="34" font-weight="400" fill="${MUTED}">`
      + `${escapeXml(l)}</text>`)
    .join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${PAPER}"/>
  <rect x="${PAD + 10}" y="${PAD + 10}" width="${WIDTH - 2 * PAD}" height="${HEIGHT - 2 * PAD}" rx="28" fill="${INK}"/>
  <rect x="${PAD}" y="${PAD}" width="${WIDTH - 2 * PAD}" height="${HEIGHT - 2 * PAD}" rx="28" fill="${CARD}" stroke="${INK}" stroke-width="6"/>
  <rect x="${PAD}" y="${PAD}" width="18" height="${HEIGHT - 2 * PAD}" rx="0" fill="${color}"/>
  <g>
    <rect x="${PAD + 40}" y="${PAD + 34}" width="${sectionTitle.length * 17 + 44}" height="52" rx="26" fill="${color}" stroke="${INK}" stroke-width="4"/>
    <text x="${PAD + 62}" y="${PAD + 70}" font-family="Nunito" font-size="26" font-weight="800" letter-spacing="2" fill="${INK}">${escapeXml(sectionTitle)}</text>
  </g>
    ${titleTspans}
    ${descTspans}
  <circle cx="${PAD + 52}" cy="${HEIGHT - PAD - 44}" r="12" fill="${DEFAULT_COLOR}" stroke="${INK}" stroke-width="3"/>
  <text x="${PAD + 76}" y="${HEIGHT - PAD - 34}" font-family="Nunito" font-size="30" font-weight="800" fill="${INK}">randomsitesontheweb.com</text>
</svg>`;
}

// SVG for the home / collection card (no specific toy).
function renderHomeSvg(siteCount) {
  return renderCardSvg({
    name: 'Random Sites on the Web',
    description: `${siteCount} tiny interactive websites, games & toys — pick one at random and play.`,
    section: 'fun',
    sectionTitle: 'A CURIOUS COLLECTION',
  });
}

// Rasterize every visible toy's card plus the home card into outDir.
// Lazy-requires @resvg/resvg-js so unit tests don't pull the native module.
function generateOgImages(catalog, opts) {
  const options = opts || {};
  const outDir = options.outDir || path.join(__dirname, '..', 'og');
  const fontPath = options.fontPath || path.join(__dirname, 'fonts', 'Nunito.ttf');
  const { Resvg } = require('@resvg/resvg-js');

  fs.mkdirSync(outDir, { recursive: true });
  const fontFiles = fs.existsSync(fontPath) ? [fontPath] : [];
  const resvgOpts = {
    fitTo: { mode: 'width', value: WIDTH },
    font: { fontFiles, loadSystemFonts: fontFiles.length === 0, defaultFontFamily: 'Nunito' },
  };

  const titleBySection = Object.fromEntries(
    (catalog.sections || []).map((s) => [s.key, s.title]),
  );

  const render = (svg, file) => {
    const png = new Resvg(svg, resvgOpts).render().asPng();
    fs.writeFileSync(path.join(outDir, file), png);
  };

  const visible = catalog.sites.filter((s) => s.visible);
  for (const site of visible) {
    const svg = renderCardSvg({ ...site, sectionTitle: titleBySection[site.section] });
    render(svg, `${site.slug}.png`);
  }
  render(renderHomeSvg(visible.length), 'home.png');
  return { count: visible.length + 1, outDir };
}

module.exports = {
  WIDTH, HEIGHT, SECTION_COLORS, DEFAULT_COLOR,
  sectionColor, escapeXml, wrapText, renderCardSvg, renderHomeSvg, generateOgImages,
};
