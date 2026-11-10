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
    if ('pick' in site && typeof site.pick !== 'boolean') throw new Error(`pick must be boolean: ${site.slug}`);
    if (typeof site.random !== 'boolean') throw new Error(`random must be boolean: ${site.slug}`);
    if (!keys.has(site.section)) throw new Error(`unknown section "${site.section}": ${site.slug}`);
    if (site.visible && !(typeof site.description === 'string' && site.description.trim())) {
      throw new Error(`visible site needs a non-empty description: ${site.slug}`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(site.created || '')) {
      throw new Error(`created must be YYYY-MM-DD: ${site.slug}`);
    }
    if (site.seoTitle !== undefined && !(typeof site.seoTitle === 'string' && site.seoTitle.trim())) {
      throw new Error(`seoTitle must be a non-empty string: ${site.slug}`);
    }
    if (site.about !== undefined && !(Array.isArray(site.about) && site.about.length
      && site.about.every((p) => typeof p === 'string' && p.trim()))) {
      throw new Error(`about must be a non-empty array of paragraphs: ${site.slug}`);
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
    // Toys are reachable at /<slug>, /<slug>/ and with query strings; point
    // search engines at the one clean URL.
    `<link rel="canonical" href="${url}">`,
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

// Ensure a toy has a <meta name="description"> for search snippets. Sourced
// from the catalog. Idempotent, and never overrides a description the toy
// already wrote for itself — only fills the gap.
function ensureMetaDescription(html, description) {
  if (!description || !description.trim()) return html;
  if (/<meta\s+name=["']description["']/i.test(html)) return html;
  const tag = `<meta name="description" content="${escapeHtml(description.trim())}">`;
  const titleRe = /<\/title>/i;
  if (titleRe.test(html)) return html.replace(titleRe, (m) => `${m}\n    ${tag}`);
  const headRe = /<head[^>]*>/i;
  if (headRe.test(html)) return html.replace(headRe, (m) => `${m}\n    ${tag}`);
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

// Drop hand-written og:/twitter: tags outside the managed block. Older toys
// carried their own (pointing at the generic og-image.jpg and /sites/ URLs),
// and duplicates leave scrapers to pick either set.
function stripLegacySocialMeta(html) {
  const managed = new RegExp(`${OG_START}[\\s\\S]*?${OG_END}`);
  const block = (html.match(managed) || [''])[0];
  const parts = block ? html.split(block) : [html];
  const clean = (s) => s
    .replace(/^[ \t]*<meta\s[^>]*(?:property|name)=["'](?:og|twitter):[^>]*>[ \t]*\r?\n/gim, '')
    .replace(/^[ \t]*<!--\s*(?:Open Graph(?:\s*\/\s*Facebook)?|Twitter)\s*-->[ \t]*\r?\n/gim, '');
  return parts.map(clean).join(block);
}

// Replace a toy's <title> with its search-friendly catalog seoTitle. Toys
// without one keep whatever title they wrote for themselves.
function applySeoTitle(html, seoTitle) {
  if (!seoTitle) return html;
  return html.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${escapeHtml(seoTitle)}</title>`);
}

// Up to n visible toys from the same section, taken in name order starting
// just after this one (wrapping), so every toy gets linked from a few others.
function relatedSites(site, catalog, n = 4) {
  const peers = catalog.sites
    .filter((s) => s.visible && s.section === site.section)
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  const at = peers.findIndex((s) => s.slug === site.slug);
  const out = [];
  for (let i = 1; i < peers.length && out.length < n; i += 1) {
    out.push(peers[(at + i) % peers.length]);
  }
  return out;
}

const ABOUT_START = '<!-- rsotw:about:start -->';
const ABOUT_END = '<!-- rsotw:about:end -->';

// Crawlable "about this toy" copy + related-toy links. Most toys are
// full-viewport with overflow:hidden, so the block ships hidden and global.js
// opens it in a panel from the corner menu ("About this site").
function aboutBlock(site, catalog) {
  const paragraphs = site.about || [site.description];
  const visibleCount = catalog.sites.filter((s) => s.visible).length;
  const related = relatedSites(site, catalog).map((s) =>
    `<li><a href="/${s.slug}/">${escapeHtml(s.name)}</a>: ${escapeHtml(s.description)}</li>`);
  return [
    ABOUT_START,
    // Inline display:none too, in case a toy's own CSS styles <aside>.
    '<aside id="rsotw-about" hidden style="display:none" aria-labelledby="rsotw-about-title">',
    `<h2 id="rsotw-about-title">About ${escapeHtml(site.name)}</h2>`,
    ...paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`),
    ...(related.length ? ['<h3>More like this</h3>', '<ul>', ...related, '</ul>'] : []),
    `<p><a href="/">Browse all ${visibleCount} random sites</a></p>`,
    '</aside>',
    ABOUT_END,
  ].join('\n');
}

// Idempotently insert/replace the managed about block just before </body>.
function injectAboutBlock(html, site, catalog) {
  const block = aboutBlock(site, catalog);
  const existing = new RegExp(`${ABOUT_START}[\\s\\S]*?${ABOUT_END}`);
  if (existing.test(html)) return html.replace(existing, () => block);
  const bodyEnd = html.toLowerCase().lastIndexOf('</body>');
  if (bodyEnd === -1) return html;
  return `${html.slice(0, bodyEnd)}${block}\n${html.slice(bodyEnd)}`;
}

// Static info pages (sites/<slug>/index.html, not in the catalog) linked from the footer.
const INFO_PAGES = ['about', 'privacy'];

// sitemap.xml for all visible toys + the home and info pages, using clean canonical URLs.
function generateSitemap(catalog) {
  const visible = catalog.sites.filter((s) => s.visible);
  const dates = visible.map((s) => s.created).filter(Boolean).sort();
  const homeLast = dates[dates.length - 1] || '';
  const entries = [{ loc: `${SITE_ORIGIN}/`, lastmod: homeLast }];
  for (const slug of INFO_PAGES) entries.push({ loc: toyUrl(slug) });
  for (const s of visible) entries.push({ loc: toyUrl(s.slug), lastmod: s.created });
  const body = entries.map((e) => {
    const last = e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : '';
    return `  <url>\n    <loc>${e.loc}</loc>${last}\n  </url>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function generateRobots() {
  // Crawl-delay is advisory only — the bots behind the Aug 2026 bandwidth
  // overage spoofed browser UAs and ignore robots.txt. Real protection lives
  // in the Vercel Firewall (bot challenge + rate limits), not here.
  return `User-agent: *\nAllow: /\nDisallow: /api/\nCrawl-delay: 10\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`;
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
  // Prefer the 400px WebP from scripts/optimize-images.js over the 512px original.
  const imagePath = ['webp', 'jpg', 'png']
    .map(ext => `/public/site-images/${site.slug}-square.${ext}`)
    .find(p => fs.existsSync(path.join(ROOT, p))) || `/public/site-images/${site.slug}-square.png`;
  const hasImage = fs.existsSync(path.join(ROOT, imagePath));
  // Cards are at most 200px wide (full width only below 320px), so 1x screens get the 200px file.
  const smallPath = imagePath.replace(/\.webp$/, '-200.webp');
  const srcset = smallPath !== imagePath && fs.existsSync(path.join(ROOT, smallPath))
    ? ` srcset="${smallPath} 200w, ${imagePath} 400w" sizes="(max-width: 320px) 100vw, 200px"` : '';
  // Wide neal.fun-style banner (banners/<slug>.html, rendered by `npm run banners`)
  // wins over the square art when it exists.
  const hasBanner = fs.existsSync(path.join(ROOT, 'public', 'site-banners', `${site.slug}.webp`));
  const art = hasBanner
    ? `                        <img class="site-image site-banner" src="/public/site-banners/${site.slug}-400.webp" srcset="/public/site-banners/${site.slug}-400.webp 400w, /public/site-banners/${site.slug}.webp 800w" sizes="(max-width: 560px) 92vw, (max-width: 900px) 46vw, 31vw" alt="${escapeHtml(site.name)}" loading="lazy" decoding="async" width="800" height="300" onerror="this.closest('.site-card').classList.remove('has-image', 'has-banner'); this.remove();">`
    : `                        <img class="site-image" src="${imagePath}"${srcset} alt="${escapeHtml(site.name)}" loading="lazy" decoding="async" width="512" height="512" onerror="this.closest('.site-card').classList.remove('has-image'); this.remove();">`;
  const cardClass = hasBanner ? ' has-image has-banner' : hasImage ? ' has-image' : '';
  return [
    `                <div class="site-card${cardClass}" data-categories="${site.section}" data-created="${site.created}"${hasBanner ? ` data-banner="${site.slug}"` : ''}${site.pick ? ' data-pick="1"' : ''}>`,
    `                    <a href="${site.slug}/">`,
    ...(hasBanner || hasImage ? [art] : []),
    '                        <div class="card-copy">',
    `                        <h2>${escapeHtml(site.name)}</h2>`,
    `                        <p>${escapeHtml(site.description)}</p>`,
    `                        <div class="category">${escapeHtml(sectionTitle)}</div>`,
    '                        </div>',
    '                    </a>',
    `                    <button type="button" class="card-preview-trigger" aria-label="About ${escapeHtml(site.name)}" aria-haspopup="dialog">`,
    '                        <span aria-hidden="true">i</span>',
    '                    </button>',
    '                </div>',
  ].join('\n');
}

// AdSense display-unit IDs from the dashboard (Ads → By ad unit). A slot with
// an empty ID stays hidden: initAds() in home.html skips it.
const AD_SLOT_IDS = {
  'home-inline-1': '9755868727',
  'home-inline-2': '6371816625',
  'home-bottom': '7331730418', // rendered directly in templates/home.html, listed here for reference
};

// A hidden-until-live AdSense slot. Activated client-side by initAds() once the
// site is approved and every data-ad-slot ID is filled in (see home.html).
function renderAdSlot(name) {
  return [
    '',
    `            <!-- Ad: ${name} -->`,
    `            <div class="ad-slot" data-ad-name="${name}">`,
    '                <span class="ad-slot__label">Advertisement</span>',
    '                <ins class="adsbygoogle" style="display:block"',
    '                     data-ad-client="ca-pub-1505383837343849"',
    `                     data-ad-slot="${AD_SLOT_IDS[name] || ''}"`,
    '                     data-ad-format="auto"',
    '                     data-full-width-responsive="true"></ins>',
    '            </div>',
  ].join('\n');
}

// Inline ad slots sit roughly 1/3 and 2/3 of the way down the directory,
// keyed by 0-based card index.
function inlineAdPositions(count) {
  if (count < 2) return {};
  const first = Math.max(0, Math.floor(count / 3) - 1);
  const second = Math.max(first + 1, Math.floor((2 * count) / 3) - 1);
  return { [first]: 'home-inline-1', [second]: 'home-inline-2' };
}

// One continuous A–Z grid (neal.fun-style).
function renderSections(catalog) {
  const titles = Object.fromEntries(catalog.sections.map(s => [s.key, s.title]));
  const sites = catalog.sites.filter(s => s.visible)
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  const adAt = inlineAdPositions(sites.length);
  const cards = sites.map((site, i) => {
    const card = renderCard(site, titles[site.section]);
    return adAt[i] ? `${card}\n${renderAdSlot(adAt[i])}` : card;
  });
  return `<div class="site-grid">\n${cards.join('\n')}\n</div>`;
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
  let descAdded = 0;
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
    const withDesc = ensureMetaDescription(next, site.description);
    if (withDesc !== next) descAdded += 1;
    next = withDesc;
    if (site.visible) {
      const withOg = injectOgBlock(next, site);
      if (withOg !== next) ogUpdated += 1;
      next = applySeoTitle(stripLegacySocialMeta(withOg), site.seoTitle);
      next = injectAboutBlock(next, site, catalog);
    }
    if (next !== html) fs.writeFileSync(file, next);
  }
  return { ogUpdated, jsAdded, descAdded, missing };
}

// llms.txt (https://llmstxt.org): a Markdown map of the site for language models,
// one section per category listing every visible toy with its description.
function generateLlmsTxt(catalog) {
  const visible = catalog.sites.filter((s) => s.visible);
  const lines = [
    '# Random Sites On the Web',
    '',
    `> A hand-made collection of ${visible.length} tiny, single-purpose interactive websites: games, toys, art, tools, and small experiments. Free to use, no accounts. Made by Dylan Landman.`,
    '',
    `- [Homepage and full catalog](${SITE_ORIGIN}/): browse every site, or press "Surprise Me!" to open a random one`,
    `- [About](${toyUrl('about')}): what the site is and who makes it`,
    `- [Privacy policy](${toyUrl('privacy')}): ads, analytics, and cookies`,
  ];
  for (const section of catalog.sections) {
    const sites = visible
      .filter((s) => s.section === section.key)
      .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
    if (!sites.length) continue;
    lines.push('', `## ${section.title}`, '');
    for (const s of sites) {
      lines.push(`- [${s.name.replace(/[[\]]/g, '')}](${toyUrl(s.slug)}): ${s.description.replace(/\s+/g, ' ').trim()}`);
    }
  }
  return lines.join('\n') + '\n';
}

// Appends ?v=<content hash> to /globals/ assets referenced by the homepage so
// vercel.json can cache those URLs as immutable; any edit changes the URL.
function versionGlobals(html) {
  const crypto = require('crypto');
  return html.replace(/((?:https:\/\/randomsitesontheweb\.com)?\/globals\/([\w.-]+\.(?:js|css)))"/g, (match, url, file) => {
    const fp = path.join(ROOT, 'globals', file);
    if (!fs.existsSync(fp)) return match;
    const hash = crypto.createHash('sha1').update(fs.readFileSync(fp)).digest('hex').slice(0, 10);
    return `${url}?v=${hash}"`;
  });
}

function build() {
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf8'));
  const template = fs.readFileSync(path.join(ROOT, 'templates', 'home.html'), 'utf8');
  const html = versionGlobals(generateHtml(template, catalog)); // validates catalog
  fs.writeFileSync(path.join(ROOT, 'index.html'), html);

  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), generateSitemap(catalog));
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), generateRobots());
  fs.writeFileSync(path.join(ROOT, 'llms.txt'), generateLlmsTxt(catalog));
  // Vercel serves /404.html (with a 404 status) for paths that match no file.
  fs.copyFileSync(path.join(ROOT, 'public', '404.html'), path.join(ROOT, '404.html'));

  const toys = processToys(catalog);
  const { generateOgImages } = require('./og-image');
  const img = generateOgImages(catalog, { outDir: path.join(ROOT, 'og') });

  const visible = catalog.sites.filter((s) => s.visible).length;
  const pool = catalog.sites.filter((s) => s.random).length;
  console.log(`index.html built: ${visible} visible / ${catalog.sites.length} total sites, ${pool} in random pool`);
  console.log(`sitemap.xml + robots.txt written (${visible + 1 + INFO_PAGES.length} urls)`);
  console.log(`toys: +global.js ${toys.jsAdded}, +meta description ${toys.descAdded}, OG into ${toys.ogUpdated}${toys.missing ? `, ${toys.missing} missing` : ''}`);
  console.log(`OG images written: ${img.count} card(s) -> ${path.relative(ROOT, img.outDir)}/`);
}

module.exports = {
  escapeHtml, validateCatalog, renderCard, renderSections, renderFolders, generateHtml,
  injectOgBlock, ogMetaBlock, ensureGlobalJs, ensureMetaDescription, toyUrl, ogImageUrl,
  applySeoTitle, relatedSites, aboutBlock, injectAboutBlock, stripLegacySocialMeta,
  generateSitemap, generateRobots, renderJsonLd, generateLlmsTxt, versionGlobals,
};

if (require.main === module) build();
