'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  escapeHtml, validateCatalog, renderCard, renderSections, renderFolders, generateHtml,
} = require('../scripts/build.js');

const CATALOG = {
  sections: [
    { key: 'educational', title: 'Educational' },
    { key: 'fun', title: 'Fun & Interactive' },
  ],
  sites: [
    { slug: 'prefixsuffix', name: 'Prefix & Suffix', description: 'Practice prefixes', section: 'educational', visible: true, random: true, icon: null },
    { slug: 'hidden-one', name: 'Hidden', description: '', section: 'fun', visible: false, random: true, icon: null },
    { slug: 'doodle', name: 'Doodle', description: 'Draw things', section: 'fun', visible: true, random: false, icon: null },
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
