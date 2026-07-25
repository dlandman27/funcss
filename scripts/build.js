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
  return template
    .replace('{{SECTIONS}}', () => renderSections(catalog))
    .replace('{{FOLDERS}}', () => renderFolders(catalog));
}

// Rewrite the managed OG block into every visible toy's index.html. Skips toys
// whose file is missing (warns) and reports how many were updated.
function injectOgIntoToys(catalog) {
  let updated = 0;
  let missing = 0;
  for (const site of catalog.sites) {
    if (!site.visible) continue;
    const file = path.join(ROOT, 'sites', site.slug, 'index.html');
    if (!fs.existsSync(file)) {
      console.warn(`WARN: no index.html for visible toy "${site.slug}" — skipped OG`);
      missing += 1;
      continue;
    }
    const html = fs.readFileSync(file, 'utf8');
    const next = injectOgBlock(html, site);
    if (next !== html) {
      fs.writeFileSync(file, next);
      updated += 1;
    }
  }
  return { updated, missing };
}

function build() {
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf8'));
  const template = fs.readFileSync(path.join(ROOT, 'templates', 'home.html'), 'utf8');
  const html = generateHtml(template, catalog); // validates catalog
  fs.writeFileSync(path.join(ROOT, 'index.html'), html);

  const og = injectOgIntoToys(catalog);
  const { generateOgImages } = require('./og-image');
  const img = generateOgImages(catalog, { outDir: path.join(ROOT, 'og') });

  const visible = catalog.sites.filter((s) => s.visible).length;
  const pool = catalog.sites.filter((s) => s.random).length;
  console.log(`index.html built: ${visible} visible / ${catalog.sites.length} total sites, ${pool} in random pool`);
  console.log(`OG meta injected into ${og.updated} toy page(s)${og.missing ? `, ${og.missing} missing` : ''}`);
  console.log(`OG images written: ${img.count} card(s) -> ${path.relative(ROOT, img.outDir)}/`);
}

module.exports = {
  escapeHtml, validateCatalog, renderCard, renderSections, renderFolders, generateHtml,
  injectOgBlock, ogMetaBlock, toyUrl, ogImageUrl,
};

if (require.main === module) build();
