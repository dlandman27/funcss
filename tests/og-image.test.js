'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  sectionColor, escapeXml, wrapText, renderCardSvg, renderHomeSvg, DEFAULT_COLOR,
} = require('../scripts/og-image.js');

test('sectionColor maps known sections and falls back', () => {
  assert.equal(sectionColor('educational'), '#5aa0db');
  assert.equal(sectionColor('games'), '#a98fd0');
  assert.equal(sectionColor('nope'), DEFAULT_COLOR);
});

test('escapeXml escapes the five XML entities', () => {
  assert.equal(escapeXml(`a & <b> "c" 'd'`), 'a &amp; &lt;b&gt; &quot;c&quot; &apos;d&apos;');
});

test('wrapText wraps to maxChars and respects maxLines', () => {
  const lines = wrapText('the quick brown fox jumps over the lazy dog', 12, 3);
  assert.ok(lines.length <= 3);
  for (const l of lines) assert.ok(l.length <= 13, `line too long: "${l}"`);
});

test('wrapText adds an ellipsis when truncated', () => {
  const lines = wrapText('one two three four five six seven eight nine ten', 8, 2);
  assert.equal(lines.length, 2);
  assert.match(lines[1], /…$/);
});

test('wrapText hard-splits an over-long single word', () => {
  const lines = wrapText('supercalifragilisticexpialidocious', 10, 4);
  assert.ok(lines.length >= 2);
  assert.ok(lines[0].length <= 10);
});

test('renderCardSvg produces a 1200x630 svg with escaped, wrapped content', () => {
  const svg = renderCardSvg({
    name: 'The Cursor "Petting" Zoo',
    description: 'Every CSS cursor in its own enclosure — pet them & adopt your favorite.',
    section: 'educational',
    sectionTitle: 'Educational',
  });
  assert.match(svg, /^<svg[^>]*width="1200"[^>]*height="630"/);
  assert.match(svg, /fill="#5aa0db"/); // educational accent used
  assert.match(svg, /randomsitesontheweb\.com/);
  assert.match(svg, /&quot;Petting&quot;/); // title quotes escaped
  assert.ok(!svg.includes('"Petting"'), 'raw quotes must not leak into markup');
  assert.match(svg, /EDUCATIONAL/); // section pill uppercased
});

test('renderHomeSvg mentions the site count', () => {
  const svg = renderHomeSvg(149);
  assert.match(svg, /149 tiny interactive/);
});
