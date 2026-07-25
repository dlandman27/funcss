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

test('renderSections groups by section, skips invisible, keeps order', () => {
  const html = renderSections(CATALOG);
  assert.match(html, /<h2 class="category-title educational">Educational<\/h2>/);
  assert.match(html, /<h2 class="category-title fun">Fun &amp; Interactive<\/h2>/);
  assert.ok(!html.includes('hidden-one'), 'invisible site must not render');
  assert.ok(html.indexOf('educational') < html.indexOf('doodle'), 'section order preserved');
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
  const html = generateHtml(template, clone(CATALOG));
  assert.ok(html.includes("badge.className = 'new-badge'"), 'homepage should render .new-badge elements');
  assert.ok(html.includes('data-created'), 'cards should carry data-created');
  assert.ok(html.includes('value="newest"'), 'sort dropdown should offer Newest First');
  assert.ok(html.includes("buildRail('railNew'"), 'homepage should build the New rail');
  assert.ok(html.includes("buildRail('railHot'"), 'homepage should build the Hottest rail');
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
  assert.ok(html.includes("fetch('/api/counts')"), 'homepage should fetch /api/counts');
  assert.ok(html.includes("el.className = 'plays'"), 'homepage should render .plays elements');
});
