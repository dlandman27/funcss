'use strict';
// Guards the vercel.json cache headers added after the Aug 2026 bandwidth
// overage: media must be browser-cacheable, HTML must revalidate, and every
// media type actually deployed must be covered by the long-cache rule.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const rules = config.headers || [];

const cacheControl = (rule) =>
  ((rule.headers || []).find((h) => h.key === 'Cache-Control') || {}).value || '';
const maxAge = (value) => {
  const m = value.match(/max-age=(\d+)/);
  return m ? Number(m[1]) : null;
};
// vercel.json `source` uses path-to-regexp syntax; the patterns here are plain
// regex groups, so anchoring the string as a RegExp is an equivalent matcher.
const sourceToRegExp = (source) => new RegExp('^' + source + '$');

const mediaRule = rules.find((r) => r.source.includes('png'));
const htmlRule = rules.find((r) => r.source === '/');

test('vercel.json declares Cache-Control on every header rule', () => {
  assert.ok(rules.length > 0, 'headers section must exist');
  for (const rule of rules) {
    assert.ok(cacheControl(rule), `rule ${rule.source} must set Cache-Control`);
  }
});

test('homepage HTML revalidates on every request', () => {
  assert.ok(htmlRule, 'a rule for / must exist');
  const value = cacheControl(htmlRule);
  assert.match(value, /max-age=0/);
  assert.match(value, /must-revalidate/);
});

test('media rule is long-lived, public, and shared-cache friendly', () => {
  assert.ok(mediaRule, 'a media extension rule must exist');
  const value = cacheControl(mediaRule);
  assert.match(value, /public/);
  assert.ok(maxAge(value) >= 86400, 'media max-age should be at least a day');
});

test('media rule matches deployed asset paths and nothing else', () => {
  const re = sourceToRegExp(mediaRule.source);
  const shouldMatch = [
    '/logo.png',
    '/favicon.ico',
    '/og/tilt.png',
    '/icons/snake.svg',
    '/sites/breathe/track3.mp3',
    '/sites/for-michelle/dahlia-inspired-flower-by-rose.glb',
  ];
  const shouldNotMatch = ['/', '/index.html', '/catalog.json', '/sites/tilt/index.html', '/api/counts', '/sitemap.xml'];
  for (const p of shouldMatch) assert.ok(re.test(p), `${p} should get the media cache header`);
  for (const p of shouldNotMatch) assert.ok(!re.test(p), `${p} must not get the media cache header`);
});

test('every media extension deployed under sites/, og/, icons/ is covered', () => {
  const re = sourceToRegExp(mediaRule.source);
  // Text-ish types intentionally left on Vercel's revalidating default.
  const nonMedia = new Set(['html', 'js', 'css', 'json', 'txt', 'md', 'xml', 'webmanifest']);
  const found = new Set();
  for (const dir of ['sites', 'og', 'icons']) {
    for (const file of fs.readdirSync(path.join(ROOT, dir), { recursive: true })) {
      const ext = path.extname(String(file)).slice(1).toLowerCase();
      if (ext && !nonMedia.has(ext)) found.add(ext);
    }
  }
  assert.ok(found.has('png') && found.has('mp3'), 'sanity: scan should see known media');
  for (const ext of found) {
    assert.ok(re.test(`/x/file.${ext}`), `deployed .${ext} files are not covered by the media cache rule`);
  }
});

test('globals and catalog.json get short shared caches, not immutable ones', () => {
  for (const source of ['/globals/(.*)', '/catalog.json']) {
    const rule = rules.find((r) => r.source === source);
    assert.ok(rule, `a rule for ${source} must exist`);
    const age = maxAge(cacheControl(rule));
    assert.ok(age > 0 && age <= 3600, `${source} max-age should be minutes-to-an-hour, got ${age}`);
  }
});
