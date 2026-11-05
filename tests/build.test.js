'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  escapeHtml, validateCatalog, renderCard, renderSections, renderFolders, generateHtml,
  injectOgBlock,
} = require('../scripts/build.js');

const CATALOG = {
  sections: [
    { key: 'educational', title: 'Educational' },
    { key: 'fun', title: 'Fun & Interactive' },
  ],
  sites: [
    { slug: 'prefixsuffix', name: 'Prefix & Suffix', description: 'Practice prefixes', section: 'educational', visible: true, random: true, icon: null, created: '2025-01-15' },
    { slug: 'hidden-one', name: 'Hidden', description: '', section: 'fun', visible: false, random: true, icon: null, created: '2025-02-02' },
    { slug: 'doodle', name: 'Doodle', description: 'Draw things', section: 'fun', visible: true, random: false, icon: null, created: '2025-03-09' },
  ],
};
const clone = (o) => JSON.parse(JSON.stringify(o));

test('escapeHtml escapes & < > "', () => {
  assert.equal(escapeHtml('a & <b> "c"'), 'a &amp; &lt;b&gt; &quot;c&quot;');
});

test('renderCard emits expected markup', () => {
  const html = renderCard(CATALOG.sites[0], 'Educational');
  assert.match(html, /data-categories="educational"/);
  assert.match(html, /href="prefixsuffix\/"/);
  assert.match(html, /<h2>Prefix &amp; Suffix<\/h2>/);
  assert.match(html, /<p>Practice prefixes<\/p>/);
  assert.match(html, /<div class="category">Educational<\/div>/);
});

test('renderSections creates one alphabetical catalog and skips invisible sites', () => {
  const html = renderSections(CATALOG);
  assert.ok(html.includes('aria-label="Jump to letter"'));
  assert.ok(html.includes('id="letter-D"'));
  assert.ok(html.includes('id="letter-P"'));
  assert.ok(!html.includes('category-title'));
  assert.ok(!html.includes('hidden-one'));
  const names = [...html.matchAll(/<h2>(.*?)<\/h2>/g)].map(m => m[1]);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })));
});

test('renderCard uses available artwork with an accessible name and load-error fallback', () => {
  const html = renderCard({ ...CATALOG.sites[0], slug: 'silk', name: 'Silk' }, 'Art');
  assert.match(html, /site-card has-image/);
  assert.match(html, /src="\/public\/site-images\/silk-square\.(webp|jpg|png)"/);
  assert.match(html, /alt="Silk"/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /decoding="async"/);
  assert.match(html, /width="512" height="512"/);
  assert.match(html, /classList\.remove\('has-image'\)/);
});

test('renderCard keeps the original card when artwork is missing', () => {
  const html = renderCard({ ...CATALOG.sites[0], slug: 'missing-artwork-test-fixture' }, 'Educational');
  assert.ok(!html.includes('site-image'));
  assert.ok(!html.includes('has-image'));
  assert.match(html, /<h2>Prefix &amp; Suffix<\/h2>/);
  assert.match(html, /<p>Practice prefixes<\/p>/);
});

test('renderCard provides a separately labelled description button', () => {
  const html = renderCard(CATALOG.sites[0], 'Educational');
  assert.match(html, /<button type="button" class="card-preview-trigger" aria-label="About Prefix &amp; Suffix"/);
  assert.ok(html.indexOf('card-preview-trigger') > html.indexOf('</a>'), 'description button must not navigate the site link');
});

test('renderFolders includes only random:true, catalog order, /slug/ format', () => {
  const body = renderFolders(CATALOG);
  assert.match(body, /'\/prefixsuffix\/',/);
  assert.match(body, /'\/hidden-one\/',/); // random is independent of visible
  assert.ok(!body.includes('/doodle/'));
});

test('validateCatalog rejects duplicate slug', () => {
  const c = clone(CATALOG);
  c.sites.push(clone(c.sites[0]));
  assert.throws(() => validateCatalog(c), /duplicate slug: prefixsuffix/);
});

test('validateCatalog rejects unknown section', () => {
  const c = clone(CATALOG);
  c.sites[0].section = 'nope';
  assert.throws(() => validateCatalog(c), /unknown section/);
});

test('validateCatalog rejects visible site with empty description', () => {
  const c = clone(CATALOG);
  c.sites[0].description = '  ';
  assert.throws(() => validateCatalog(c), /description/);
});

test('renderCard emits data-created', () => {
  const html = renderCard(CATALOG.sites[0], 'Educational');
  assert.match(html, /data-created="2025-01-15"/);
});

test('validateCatalog rejects missing or malformed created', () => {
  const c = clone(CATALOG);
  delete c.sites[0].created;
  assert.throws(() => validateCatalog(c), /created must be YYYY-MM-DD/);
  const c2 = clone(CATALOG);
  c2.sites[0].created = '15/01/2025';
  assert.throws(() => validateCatalog(c2), /created must be YYYY-MM-DD/);
});

test('generated homepage includes the new-site badge logic', () => {
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..');
  const template = fs.readFileSync(path.join(root, 'templates', 'home.html'), 'utf8');
  const catalog = clone(CATALOG);
  catalog.sites[0].pick = true;
  const html = generateHtml(template, catalog);
  assert.ok(html.includes("badge.className = 'new-badge'"), 'homepage should render .new-badge elements');
  assert.ok(html.includes('data-created'), 'cards should carry data-created');
  assert.ok(html.includes('aria-label="Filter by category"'), 'catalog should offer a category filter');
  assert.ok(html.includes("buildRail('railNew'"), 'homepage should build the New rail');
  assert.ok(html.includes("buildRail('railTrending'"), 'homepage should build the Trending rail');
  assert.ok(html.includes("buildRail('railPicks'"), 'homepage should build the Top picks rail');
  assert.ok(html.includes('<div id="featured"></div>'), 'the shelves need their #featured container');
  assert.ok(html.includes('data-pick="1"'), 'picked sites should carry data-pick');
  assert.ok(html.includes("chip.className = 'hot-badge'"), 'homepage should render .hot-badge chips');
});

test('validateCatalog rejects invalid slug and non-boolean flags', () => {
  const bad = clone(CATALOG);
  bad.sites[0].slug = 'has space';
  assert.throws(() => validateCatalog(bad), /invalid slug/);
  const bad2 = clone(CATALOG);
  bad2.sites[0].visible = 'yes';
  assert.throws(() => validateCatalog(bad2), /visible must be boolean/);
});

test('generateHtml injects both placeholders and hard-errors when missing', () => {
  const tpl = 'A\n{{SECTIONS}}\nB\nconst folders = [\n{{FOLDERS}}\n];\nC';
  const out = generateHtml(tpl, CATALOG);
  assert.ok(out.includes('site-card'));
  assert.ok(out.includes("'/prefixsuffix/',"));
  assert.ok(!out.includes('{{SECTIONS}}') && !out.includes('{{FOLDERS}}'));
  assert.throws(() => generateHtml('no placeholders', CATALOG), /missing placeholder/);
});

test('generateHtml is safe when content contains $& replacement patterns', () => {
  const c = clone(CATALOG);
  c.sites[0].description = 'costs $& and $1 dollars';
  const out = generateHtml('{{SECTIONS}} {{FOLDERS}}', c);
  assert.ok(out.includes('costs $&amp; and $1 dollars'));
});

const TOY_HEAD = [
  '<!DOCTYPE html>',
  '<html lang="en">',
  '<head>',
  '    <script defer src="https://randomsitesontheweb.com/globals/global.js"></script>',
  '    <title>The Cursor Petting Zoo</title>',
  '    <meta name="description" content="Every CSS cursor in its own enclosure.">',
  '</head>',
  '<body></body>',
  '</html>',
].join('\n');

const OG_SITE = {
  slug: 'cursors',
  name: 'The Cursor "Petting" Zoo',
  description: 'Every CSS cursor in its own enclosure — pet them & adopt.',
  section: 'educational', visible: true, random: true, icon: null, created: '2025-01-05',
};

test('injectOgBlock inserts a managed block with the right tags', () => {
  const out = injectOgBlock(TOY_HEAD, OG_SITE);
  assert.match(out, /<!-- rsotw:og:start -->/);
  assert.match(out, /<!-- rsotw:og:end -->/);
  assert.match(out, /<meta property="og:type" content="website">/);
  assert.match(out, /<meta property="og:url" content="https:\/\/randomsitesontheweb\.com\/cursors\/">/);
  assert.match(out, /<meta property="og:image" content="https:\/\/randomsitesontheweb\.com\/og\/cursors\.png">/);
  assert.match(out, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(out, /<meta name="twitter:image" content="https:\/\/randomsitesontheweb\.com\/og\/cursors\.png">/);
});

test('injectOgBlock escapes name and description in attributes', () => {
  const out = injectOgBlock(TOY_HEAD, OG_SITE);
  assert.match(out, /<meta property="og:title" content="The Cursor &quot;Petting&quot; Zoo">/);
  assert.match(out, /content="Every CSS cursor in its own enclosure — pet them &amp; adopt\.">/);
  assert.ok(!out.includes('"Petting"'), 'raw double-quotes must not leak into an attribute');
});

test('injectOgBlock inserts right after the description meta', () => {
  const out = injectOgBlock(TOY_HEAD, OG_SITE);
  assert.ok(
    out.indexOf('name="description"') < out.indexOf('rsotw:og:start'),
    'block should follow the description meta',
  );
  assert.ok(out.indexOf('rsotw:og:end') < out.indexOf('</head>'), 'block stays inside <head>');
});

test('injectOgBlock is idempotent and replaces a stale block', () => {
  const once = injectOgBlock(TOY_HEAD, OG_SITE);
  const twice = injectOgBlock(once, OG_SITE);
  assert.equal(once, twice, 'running twice must be a no-op');
  // A changed catalog entry replaces the block rather than appending a second one.
  const renamed = injectOgBlock(once, { ...OG_SITE, name: 'Renamed Zoo' });
  assert.match(renamed, /content="Renamed Zoo">/);
  assert.equal((renamed.match(/rsotw:og:start/g) || []).length, 1, 'exactly one managed block');
  assert.ok(!renamed.includes('The Cursor &quot;Petting&quot; Zoo'), 'old title removed');
});

test('injectOgBlock falls back to after </title> when no description meta', () => {
  const noDesc = TOY_HEAD.replace(/^.*name="description".*\n/m, '');
  const out = injectOgBlock(noDesc, OG_SITE);
  assert.match(out, /rsotw:og:start/);
  assert.ok(out.indexOf('</title>') < out.indexOf('rsotw:og:start'), 'block should follow the title');
  assert.ok(out.indexOf('rsotw:og:end') < out.indexOf('</head>'), 'block stays inside <head>');
});

test('ensureGlobalJs inserts the global.js tag after <head> when missing', () => {
  const { ensureGlobalJs } = require('../scripts/build.js');
  const noJs = '<!DOCTYPE html>\n<html>\n<head>\n    <title>X</title>\n</head>\n<body></body>\n</html>';
  const out = ensureGlobalJs(noJs);
  assert.match(out, /globals\/global\.js/);
  assert.ok(out.indexOf('<head>') < out.indexOf('global.js'), 'inserted inside head');
  assert.ok(out.indexOf('global.js') < out.indexOf('<title>'), 'inserted right after <head>');
});

test('ensureGlobalJs is a no-op when global.js is already present', () => {
  const { ensureGlobalJs } = require('../scripts/build.js');
  const withJs = '<head>\n    <script defer src="https://randomsitesontheweb.com/globals/global.js"></script>\n    <title>X</title>\n</head>';
  assert.equal(ensureGlobalJs(withJs), withJs);
  // even if referenced with a different attribute order / path form
  const alt = '<head><script src="/globals/global.js"></script></head>';
  assert.equal(ensureGlobalJs(alt), alt);
});

test('ensureGlobalJs leaves HTML untouched when there is no <head>', () => {
  const { ensureGlobalJs } = require('../scripts/build.js');
  const frag = '<div>no head here</div>';
  assert.equal(ensureGlobalJs(frag), frag);
});

test('ensureMetaDescription fills a missing description from the catalog', () => {
  const { ensureMetaDescription } = require('../scripts/build.js');
  const html = '<head>\n    <title>X</title>\n</head>';
  const out = ensureMetaDescription(html, 'A tiny toy that does <things> & "stuff"');
  assert.match(out, /<meta name="description" content="A tiny toy that does &lt;things&gt; &amp; &quot;stuff&quot;">/);
  assert.ok(out.indexOf('</title>') < out.indexOf('name="description"'), 'placed after title');
});

test('ensureMetaDescription never overrides an existing description', () => {
  const { ensureMetaDescription } = require('../scripts/build.js');
  const html = '<head><meta name="description" content="hand written"><title>X</title></head>';
  assert.equal(ensureMetaDescription(html, 'from catalog'), html);
});

test('ensureMetaDescription is a no-op with no catalog description', () => {
  const { ensureMetaDescription } = require('../scripts/build.js');
  const html = '<head><title>X</title></head>';
  assert.equal(ensureMetaDescription(html, ''), html);
  assert.equal(ensureMetaDescription(html, '   '), html);
});

test('generateSitemap lists the home page and every visible toy, clean URLs', () => {
  const { generateSitemap } = require('../scripts/build.js');
  const xml = generateSitemap(CATALOG);
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<loc>https:\/\/randomsitesontheweb\.com\/<\/loc>/); // home
  assert.match(xml, /<loc>https:\/\/randomsitesontheweb\.com\/prefixsuffix\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/randomsitesontheweb\.com\/doodle\/<\/loc>/);
  assert.ok(!xml.includes('/hidden-one/'), 'invisible toys must be excluded');
  assert.match(xml, /<lastmod>2025-03-09<\/lastmod>/); // toy created date used
});

test('generateRobots allows all and points at the sitemap', () => {
  const { generateRobots } = require('../scripts/build.js');
  const txt = generateRobots();
  assert.match(txt, /User-agent: \*/);
  assert.match(txt, /Allow: \//);
  assert.match(txt, /Sitemap: https:\/\/randomsitesontheweb\.com\/sitemap\.xml/);
});

test('generateRobots throttles crawlers and keeps them off the API', () => {
  const { generateRobots } = require('../scripts/build.js');
  const txt = generateRobots();
  assert.match(txt, /Crawl-delay: 10/);
  assert.match(txt, /Disallow: \/api\//);
  assert.ok(txt.indexOf('User-agent: *') < txt.indexOf('Crawl-delay: 10'), 'directives belong to the * group');
});

test('renderJsonLd emits a CollectionPage ItemList of visible toys, script-safe', () => {
  const { renderJsonLd } = require('../scripts/build.js');
  const html = renderJsonLd(CATALOG);
  assert.match(html, /<script type="application\/ld\+json">/);
  const json = html.replace(/^<script[^>]*>\n/, '').replace(/\n<\/script>$/, '').replace(/\\u003c/g, '<');
  const data = JSON.parse(json);
  assert.equal(data['@type'], 'CollectionPage');
  assert.equal(data.mainEntity['@type'], 'ItemList');
  assert.equal(data.mainEntity.numberOfItems, 2); // prefixsuffix + doodle, not hidden-one
  assert.equal(data.mainEntity.itemListElement[0].url, 'https://randomsitesontheweb.com/prefixsuffix/');
  assert.ok(!html.includes('</script>x'), 'no unescaped closing script');
});

test('renderJsonLd escapes < so it cannot break out of the script tag', () => {
  const { renderJsonLd } = require('../scripts/build.js');
  const c = clone(CATALOG);
  c.sites[0].name = 'Tag <script> Bomb';
  const html = renderJsonLd(c);
  assert.ok(!html.includes('<script> Bomb'), 'raw < must be escaped in JSON body');
  assert.match(html, /\\u003cscript> Bomb/); // only "<" needs escaping to prevent breakout
});

test('generateHtml injects JSON-LD when the placeholder is present', () => {
  const out = generateHtml('{{JSONLD}} {{SECTIONS}} {{FOLDERS}}', CATALOG);
  assert.match(out, /application\/ld\+json/);
  assert.ok(!out.includes('{{JSONLD}}'));
});

test('generated homepage includes the play-counts fetch', () => {
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..');
  const template = fs.readFileSync(path.join(root, 'templates', 'home.html'), 'utf8');
  const html = generateHtml(template, clone(CATALOG));
  assert.ok(html.includes("getCounts('/api/counts')"), 'homepage should fetch /api/counts');
  assert.ok(html.includes("getCounts('/api/counts?range=week')"), 'homepage should fetch weekly counts for Trending');
  assert.ok(html.includes("el.className = 'plays'"), 'homepage should render .plays elements');
});

test('generateLlmsTxt is Markdown with an H1, links, and only visible toys', () => {
  const { generateLlmsTxt } = require('../scripts/build.js');
  const txt = generateLlmsTxt(CATALOG);
  assert.match(txt, /^# Random Sites On the Web\n/);
  assert.match(txt, /\[[^\]]+\]\(https:\/\/randomsitesontheweb\.com\/prefixsuffix\/\)/);
  assert.ok(!txt.includes('/hidden-one/'), 'invisible toys must be excluded');
});

test('versionGlobals fingerprints existing /globals/ assets only', () => {
  const { versionGlobals } = require('../scripts/build.js');
  const out = versionGlobals('<script src="/globals/global.js"></script><script src="/globals/nope.js"></script>');
  assert.match(out, /\/globals\/global\.js\?v=[0-9a-f]{10}"/);
  assert.ok(out.includes('"/globals/nope.js"'), 'missing files are left untouched');
});

test('ogMetaBlock includes a canonical link to the clean toy URL', () => {
  const { ogMetaBlock } = require('../scripts/build.js');
  assert.ok(ogMetaBlock(CATALOG.sites[0]).includes(
    '<link rel="canonical" href="https://randomsitesontheweb.com/prefixsuffix/">'));
});

test('validateCatalog checks optional seoTitle and about fields', () => {
  const bad = clone(CATALOG);
  bad.sites[0].about = ['ok', ''];
  assert.throws(() => validateCatalog(bad), /about must be/);
  const badTitle = clone(CATALOG);
  badTitle.sites[0].seoTitle = '  ';
  assert.throws(() => validateCatalog(badTitle), /seoTitle must be/);
});

test('applySeoTitle replaces the title only when one is set', () => {
  const { applySeoTitle } = require('../scripts/build.js');
  const html = '<head><title>Old</title></head>';
  assert.equal(applySeoTitle(html, undefined), html);
  assert.equal(applySeoTitle(html, 'New & <Better>'), '<head><title>New &amp; &lt;Better&gt;</title></head>');
});

test('relatedSites picks visible same-section peers after this one, wrapping', () => {
  const { relatedSites } = require('../scripts/build.js');
  const cat = clone(CATALOG);
  cat.sites.push(
    { slug: 'apple', name: 'Apple', description: 'a', section: 'fun', visible: true, random: true, created: '2025-01-01' },
    { slug: 'zebra', name: 'Zebra', description: 'z', section: 'fun', visible: true, random: true, created: '2025-01-01' },
  );
  const doodle = cat.sites.find((s) => s.slug === 'doodle');
  assert.deepEqual(relatedSites(doodle, cat).map((s) => s.slug), ['zebra', 'apple']);
});

test('injectAboutBlock adds hidden copy and related links before </body>, idempotently', () => {
  const { injectAboutBlock } = require('../scripts/build.js');
  const site = { ...CATALOG.sites[0], about: ['First <para>.', 'Second.'] };
  const once = injectAboutBlock('<body><main></main></body>', site, CATALOG);
  assert.match(once, /<aside id="rsotw-about" hidden[^>]*>[\s\S]*<\/aside>\n<!-- rsotw:about:end -->\n<\/body>$/);
  assert.ok(once.includes('<p>First &lt;para&gt;.</p>'));
  assert.ok(once.includes('Browse all 2 random sites'));
  assert.equal(injectAboutBlock(once, site, CATALOG), once);
  const fallback = injectAboutBlock('<body></body>', CATALOG.sites[2], CATALOG);
  assert.ok(fallback.includes('<p>Draw things</p>'), 'falls back to the catalog description');
});

test('stripLegacySocialMeta removes og/twitter tags outside the managed block only', () => {
  const { stripLegacySocialMeta } = require('../scripts/build.js');
  const html = [
    '<head>',
    '    <!-- rsotw:og:start -->',
    '<meta property="og:image" content="https://randomsitesontheweb.com/og/x.png">',
    '    <!-- rsotw:og:end -->',
    '    <!-- Open Graph / Facebook -->',
    '    <meta property="og:image" content="https://randomsitesontheweb.com/og-image.jpg">',
    '    <!-- Twitter -->',
    "    <meta name='twitter:card' content='summary'>",
    '    <meta name="keywords" content="k">',
    '</head>',
  ].join('\n');
  const out = stripLegacySocialMeta(html);
  assert.ok(out.includes('/og/x.png'), 'managed block is kept');
  assert.ok(!out.includes('og-image.jpg'));
  assert.ok(!out.includes('twitter:card'));
  assert.ok(!out.includes('Open Graph / Facebook'));
  assert.ok(out.includes('name="keywords"'));
  assert.equal(stripLegacySocialMeta(out), out);
});
