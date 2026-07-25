'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function validateCatalog(catalog) {
  if (!catalog || !Array.isArray(catalog.sections) || catalog.sections.length === 0) {
    throw new Error('catalog.sections must be a non-empty array');
  }
  if (!Array.isArray(catalog.sites)) throw new Error('catalog.sites must be an array');
  const keys = new Set();
  for (const s of catalog.sections) {
    if (!s.key || !s.title) throw new Error(`section missing key/title: ${JSON.stringify(s)}`);
    if (keys.has(s.key)) throw new Error(`duplicate section key: ${s.key}`);
    keys.add(s.key);
  }
  const slugs = new Set();
  for (const site of catalog.sites) {
    const id = site.slug || JSON.stringify(site);
    if (typeof site.slug !== 'string' || !/^[a-z0-9_-]+$/i.test(site.slug)) {
      throw new Error(`invalid slug: ${id}`);
    }
    if (slugs.has(site.slug)) throw new Error(`duplicate slug: ${site.slug}`);
    slugs.add(site.slug);
    if (!site.name) throw new Error(`missing name: ${site.slug}`);
    if (typeof site.visible !== 'boolean') throw new Error(`visible must be boolean: ${site.slug}`);
    if (typeof site.random !== 'boolean') throw new Error(`random must be boolean: ${site.slug}`);
    if (!keys.has(site.section)) throw new Error(`unknown section "${site.section}": ${site.slug}`);
    if (site.visible && !(typeof site.description === 'string' && site.description.trim())) {
      throw new Error(`visible site needs a non-empty description: ${site.slug}`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(site.created || '')) {
      throw new Error(`created must be YYYY-MM-DD: ${site.slug}`);
    }
  }
}

const SITE_ORIGIN = 'https://randomsitesontheweb.com';
const OG_START = '<!-- rsotw:og:start -->';
const OG_END = '<!-- rsotw:og:end -->';

// Canonical, shareable toy URL (clean /<slug>/ form served via vercel.json rewrite).
function toyUrl(slug) {
  return `${SITE_ORIGIN}/${slug}/`;
}

// Static branded preview card generated at build time (see generateOgImages).
function ogImageUrl(slug) {
  return `${SITE_ORIGIN}/og/${slug}.png`;
}

// The managed Open Graph / Twitter block for one toy, indented for a <head>.
function ogMetaBlock(site) {
  const name = escapeHtml(site.name);
  const desc = escapeHtml(site.description || '');
  const url = toyUrl(site.slug);
  const img = ogImageUrl(site.slug);
  const lines = [
    OG_START,
    '<meta property="og:type" content="website">',
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:title" content="${name}">`,
    `<meta property="og:description" content="${desc}">`,
    `<meta property="og:image" content="${img}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${name}">`,
    `<meta name="twitter:description" content="${desc}">`,
    `<meta name="twitter:image" content="${img}">`,
    OG_END,
  ];
  return lines.join('\n    ');
}

const GLOBAL_JS_TAG =
  '<script defer src="https://randomsitesontheweb.com/globals/global.js"></script>';

// Ensure a toy loads global.js (play counter, share/shuffle control, analytics).
// Idempotent: no-op if already present; otherwise inserts right after <head>.
function ensureGlobalJs(html) {
  if (/globals\/global\.js/.test(html)) return html;
  const headRe = /<head[^>]*>/i;
  if (headRe.test(html)) {
    return html.replace(headRe, (m) => `${m}\n    ${GLOBAL_JS_TAG}`);
  }
  return html;
}

// Idempotently insert/replace the managed OG block in a toy's HTML <head>.
// Replaces an existing block if present; otherwise inserts after the description
// meta, falling back to just after </title>. Returns the HTML unchanged if it
// can find no anchor (should not happen for a well-formed toy page).
function injectOgBlock(html, site) {
  const block = ogMetaBlock(site);
  const existing = new RegExp(`${OG_START}[\\s\\S]*?${OG_END}`);
  if (existing.test(html)) {
    return html.replace(existing, () => block);
  }
  const descRe = /<meta\s+name=["']description["'][^>]*>/i;
  if (descRe.test(html)) {
    return html.replace(descRe, (m) => `${m}\n    ${block}`);
  }
  const titleRe = /<\/title>/i;
  if (titleRe.test(html)) {
    return html.replace(titleRe, (m) => `${m}\n    ${block}`);
  }
  return html;
}

// sitemap.xml for all visible toys + the home page, using clean canonical URLs.
function generateSitemap(catalog) {
  const visible = catalog.sites.filter((s) => s.visible);
  const dates = visible.map((s) => s.created).filter(Boolean).sort();
  const homeLast = dates[dates.length - 1] || '';
  const entries = [{ loc: `${SITE_ORIGIN}/`, lastmod: homeLast }];
  for (const s of visible) entries.push({ loc: toyUrl(s.slug), lastmod: s.created });
  const body = entries.map((e) => {
    const last = e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : '';
    return `  <url>\n    <loc>${e.loc}</loc>${last}\n  </url>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function generateRobots() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`;
}

// schema.org CollectionPage + ItemList for the home page (SEO / rich results).
// Returns a full <script type="application/ld+json"> block; "<" is escaped so
// the JSON can't break out of the script element.
function renderJsonLd(catalog) {
  const items = catalog.sites.filter((s) => s.visible).map((s, i) => ({
    '@type': 'ListItem', position: i + 1, url: toyUrl(s.slug), name: s.name,
  }));
  const data = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Random Sites on the Web',
    url: `${SITE_ORIGIN}/`,
    description: 'A curated collection of tiny interactive websites, games, and toys.',
    mainEntity: { '@type': 'ItemList', numberOfItems: items.length, itemListElement: items },
  };
  const json = JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">\n${json}\n</script>`;
}

function renderCard(site, sectionTitle) {
  return [
    `                <div class="site-card" data-categories="${site.section}" data-created="${site.created}">`,
    `                    <a href="${site.slug}/">`,
    `                        <h2>${escapeHtml(site.name)}</h2>`,
    `                        <p>${escapeHtml(site.description)}</p>`,
    `                        <div class="category">${escapeHtml(sectionTitle)}</div>`,
    '                    </a>',
    '                </div>',
  ].join('\n');
}

function renderSections(catalog) {
  return catalog.sections.map((section) => {
    const cards = catalog.sites
      .filter((s) => s.visible && s.section === section.key)
      .map((s) => renderCard(s, section.title))
      .join('\n');
    return [
      `            <!-- ${section.title} Section -->`,
      `            <h2 class="category-title ${section.key}">${escapeHtml(section.title)}</h2>`,
      '            <div class="site-grid">',
      cards,
      '            </div>',
    ].join('\n');
  }).join('\n\n');
}

function renderFolders(catalog) {
  return catalog.sites
    .filter((s) => s.random)
    .map((s) => `            '/${s.slug}/',`)
    .join('\n');
}

function generateHtml(template, catalog) {
  validateCatalog(catalog);
  for (const ph of ['{{SECTIONS}}', '{{FOLDERS}}']) {
    if (!template.includes(ph)) throw new Error(`template missing placeholder ${ph}`);
  }
  // Function replacers so "$&"-style patterns in content are inert.
  let out = template
    .replace('{{SECTIONS}}', () => renderSections(catalog))
    .replace('{{FOLDERS}}', () => renderFolders(catalog));
  // JSON-LD is optional so minimal test templates need not include it.
  if (out.includes('{{JSONLD}}')) {
    out = out.replace('{{JSONLD}}', () => renderJsonLd(catalog));
  }
  return out;
}

// Per-toy build pass: guarantee global.js on every toy (play counter, share
// control, analytics) and rewrite the managed OG block on visible toys.
// Idempotent; skips (and warns about) visible toys whose file is missing.
function processToys(catalog) {
  let ogUpdated = 0;
  let jsAdded = 0;
  let missing = 0;
  for (const site of catalog.sites) {
    const file = path.join(ROOT, 'sites', site.slug, 'index.html');
    if (!fs.existsSync(file)) {
      if (site.visible) {
        console.warn(`WARN: no index.html for visible toy "${site.slug}" — skipped`);
        missing += 1;
      }
      continue;
    }
    const html = fs.readFileSync(file, 'utf8');
    let next = ensureGlobalJs(html);
    if (next !== html) jsAdded += 1;
    if (site.visible) {
      const withOg = injectOgBlock(next, site);
      if (withOg !== next) ogUpdated += 1;
      next = withOg;
    }
    if (next !== html) fs.writeFileSync(file, next);
  }
  return { ogUpdated, jsAdded, missing };
}

function build() {
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf8'));
  const template = fs.readFileSync(path.join(ROOT, 'templates', 'home.html'), 'utf8');
  const html = generateHtml(template, catalog); // validates catalog
  fs.writeFileSync(path.join(ROOT, 'index.html'), html);

  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), generateSitemap(catalog));
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), generateRobots());

  const toys = processToys(catalog);
  const { generateOgImages } = require('./og-image');
  const img = generateOgImages(catalog, { outDir: path.join(ROOT, 'og') });

  const visible = catalog.sites.filter((s) => s.visible).length;
  const pool = catalog.sites.filter((s) => s.random).length;
  console.log(`index.html built: ${visible} visible / ${catalog.sites.length} total sites, ${pool} in random pool`);
  console.log(`sitemap.xml + robots.txt written (${visible + 1} urls)`);
  console.log(`global.js added to ${toys.jsAdded} toy page(s); OG meta into ${toys.ogUpdated}${toys.missing ? `, ${toys.missing} missing` : ''}`);
  console.log(`OG images written: ${img.count} card(s) -> ${path.relative(ROOT, img.outDir)}/`);
}

module.exports = {
  escapeHtml, validateCatalog, renderCard, renderSections, renderFolders, generateHtml,
  injectOgBlock, ogMetaBlock, ensureGlobalJs, toyUrl, ogImageUrl,
  generateSitemap, generateRobots, renderJsonLd,
};

if (require.main === module) build();
