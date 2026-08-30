'use strict';
// Clean toy URLs serve /sites/<slug>/index.html at /<slug>/, so relative asset
// references (./Boat.glb) resolve to /<slug>/<file>. Both the local Express
// server and the Vercel rewrites must serve those paths, or every toy with
// local models/images/audio silently loses them (the for-michelle robots bug).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.join(__dirname, '..');

// ---- vercel.json: production must rewrite deep slug paths into /sites/ ----

test('vercel.json rewrites /<slug>/<asset> to /sites/<slug>/<asset>', () => {
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  const rewrites = config.rewrites || [];
  const assetRewrite = rewrites.find(
    (r) => /:path\+|:path\*/.test(r.source) && r.destination.startsWith('/sites/')
  );
  assert.ok(assetRewrite, 'a rewrite for deep /<slug>/<asset> paths must exist');
  assert.ok(
    assetRewrite.destination.includes(':path'),
    'asset rewrite must forward the asset path into /sites/'
  );
});

// ---- app.js: local dev must match production ----

const PORT = 3499;
const BASE = `http://localhost:${PORT}`;

function startServer() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['app.js'], {
      cwd: ROOT,
      env: { ...process.env, PORT: String(PORT) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (buf) => {
      if (String(buf).includes('running')) resolve(child);
    });
    child.on('error', reject);
    setTimeout(() => reject(new Error('server did not start')), 5000);
  });
}

test('local server serves toy pages and their relative assets', async (t) => {
  const child = await startServer();
  t.after(() => child.kill());

  const page = await fetch(`${BASE}/for-michelle/`);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);

  // The robots that move with the arrow keys live in this GLB.
  const glb = await fetch(`${BASE}/for-michelle/cute_robots_-_low_poly_-_rigged_-_animated.glb`);
  assert.equal(glb.status, 200, 'relative GLB assets must resolve at the clean URL');

  const jpg = await fetch(`${BASE}/for-michelle/me_and_her.jpg`);
  assert.equal(jpg.status, 200);

  // Real root files must not be shadowed by the slug asset route.
  const globalJs = await fetch(`${BASE}/globals/global.js`);
  assert.equal(globalJs.status, 200);

  // Missing assets still 404.
  const missing = await fetch(`${BASE}/for-michelle/nope.glb`);
  assert.equal(missing.status, 404);

  // Encoded traversal out of sites/ must not leak repo files.
  const traversal = await fetch(`${BASE}/for-michelle/..%2F..%2Fpackage.json`);
  assert.notEqual(traversal.status, 200, 'path traversal must be rejected');
});
