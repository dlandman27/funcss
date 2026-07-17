# Site Play Counts (Phase 3a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Count how many times each mini-site is opened and show the counts on the homepage cards.

**Architecture:** Every site page already loads `globals/global.js` from the production URL. That script gains a fire-and-forget beacon to a new Vercel serverless function `POST /api/hit?slug=…`, which increments a field in a single Upstash Redis hash (`plays`) via Upstash's REST API. The homepage fetches `GET /api/counts` (CDN-cached 60s) and annotates each site card. Counts are keyed by `catalog.json` slugs; unknown slugs are rejected.

**Tech Stack:** Vercel serverless functions (`@vercel/node`, legacy `builds` config), Upstash Redis REST API via native `fetch` (Node 18+), `node --test` for tests. **Zero new npm dependencies.**

## Global Constraints

- Zero new npm dependencies; tests run with `npm test` (`node --test tests/`).
- `index.html` is GENERATED — never hand-edit it. Edit `templates/home.html`, then run `npm run build`.
- `vercel.json` is a working, hard-to-test legacy config — changes must be **additive only** (append `builds` entries; do not restructure or remove anything).
- `globals/global.js` is served from `https://randomsitesontheweb.com/globals/global.js` into ~111 live sites. Code added there must be tiny, wrapped in its own IIFE, and must never throw or block the page (fail silent).
- Redis layout: one hash named `plays`; field = lowercased catalog slug; value = integer count. Env vars: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- Homepage shows a count only when it is **≥ 5** (avoids a wall of "1 play" at launch); format: raw below 1000, `1.2k` at/above 1000.
- Counting is once per tab session per site (`sessionStorage` guard) and only on the production hostname `randomsitesontheweb.com` (localhost dev must not inflate prod counts).

---

### Task 1: Upstash Redis REST helper

**Files:**
- Create: `api/_redis.js`
- Test: `tests/api.test.js` (new file)

**Interfaces:**
- Consumes: `process.env.UPSTASH_REDIS_REST_URL`, `process.env.UPSTASH_REDIS_REST_TOKEN`, global `fetch`.
- Produces: `redis(command: string[]) => Promise<any>` — sends a single Redis command to Upstash REST (path-style, e.g. `['hincrby','plays','pi','1']` → `GET {url}/hincrby/plays/pi/1`), returns the parsed `result` field. Throws on missing env vars or non-OK HTTP. Exported as `module.exports = { redis }`.

The leading underscore in `_redis.js` matters: Task 6 adds explicit `vercel.json` builds for `api/hit.js` and `api/counts.js` only, so this file is never deployed as its own endpoint — it is bundled into the functions that `require` it.

- [ ] **Step 1: Write the failing tests**

Create `tests/api.test.js`:

```js
'use strict';
const { test, beforeEach } = require('node:test');
const assert = require('node:assert');

const { redis } = require('../api/_redis');

// ---- helpers ----
let fetchCalls;
function stubFetch(response) {
  fetchCalls = [];
  global.fetch = async (url, opts) => {
    fetchCalls.push({ url, opts });
    return response;
  };
}
function okResponse(result) {
  return { ok: true, status: 200, json: async () => ({ result }) };
}

beforeEach(() => {
  process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
});

test('redis() builds a path-style Upstash REST call with auth header', async () => {
  stubFetch(okResponse(7));
  const result = await redis(['hincrby', 'plays', 'pi', '1']);
  assert.strictEqual(result, 7);
  assert.strictEqual(fetchCalls.length, 1);
  assert.strictEqual(fetchCalls[0].url, 'https://example.upstash.io/hincrby/plays/pi/1');
  assert.strictEqual(fetchCalls[0].opts.headers.Authorization, 'Bearer test-token');
});

test('redis() URL-encodes command parts', async () => {
  stubFetch(okResponse(null));
  await redis(['hget', 'plays', 'a/b']);
  assert.strictEqual(fetchCalls[0].url, 'https://example.upstash.io/hget/plays/a%2Fb');
});

test('redis() throws when env vars are missing', async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  await assert.rejects(() => redis(['ping']), /UPSTASH/);
});

test('redis() throws on non-OK HTTP status', async () => {
  stubFetch({ ok: false, status: 401, json: async () => ({}) });
  await assert.rejects(() => redis(['ping']), /401/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../api/_redis'`

- [ ] **Step 3: Write the implementation**

Create `api/_redis.js`:

```js
'use strict';

async function redis(command) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error('UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set');
  }
  const endpoint = url.replace(/\/$/, '') + '/' + command.map(encodeURIComponent).join('/');
  const res = await fetch(endpoint, {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!res.ok) throw new Error('Upstash request failed: ' + res.status);
  const data = await res.json();
  return data.result;
}

module.exports = { redis };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all tests in `tests/api.test.js` PASS (existing `build.test.js` / `migrate.test.js` also still pass).

- [ ] **Step 5: Commit**

```bash
git add api/_redis.js tests/api.test.js
git commit -m "feat: add Upstash Redis REST helper for play counts"
```

---

### Task 2: `POST /api/hit` — increment a site's play count

**Files:**
- Create: `api/hit.js`
- Modify: `tests/api.test.js` (append tests)

**Interfaces:**
- Consumes: `redis(command)` from `api/_redis.js` (Task 1); `catalog.json` at repo root (`sites[].slug`).
- Produces: Vercel Node handler `module.exports = async (req, res)` at `/api/hit`. `POST /api/hit?slug=<slug>` → `200 {"slug","count"}`; non-POST → `405`; slug missing/not in catalog → `400`; Redis failure → `502`. Slugs are lowercased before validation and storage.

- [ ] **Step 1: Write the failing tests**

Append to `tests/api.test.js`:

```js
const hit = require('../api/hit');

function mockReq(method, query) {
  return { method, query: query || {} };
}
function mockRes() {
  const res = { statusCode: 200, headers: {}, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  res.setHeader = (name, value) => { res.headers[name] = value; };
  return res;
}

test('hit: increments a valid catalog slug via HINCRBY', async () => {
  stubFetch(okResponse(42));
  const res = mockRes();
  await hit(mockReq('POST', { slug: 'pi' }), res);
  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(res.body, { slug: 'pi', count: 42 });
  assert.strictEqual(fetchCalls[0].url, 'https://example.upstash.io/hincrby/plays/pi/1');
});

test('hit: lowercases the slug before validating and counting', async () => {
  stubFetch(okResponse(1));
  const res = mockRes();
  await hit(mockReq('POST', { slug: 'PI' }), res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.slug, 'pi');
});

test('hit: rejects non-POST with 405', async () => {
  stubFetch(okResponse(1));
  const res = mockRes();
  await hit(mockReq('GET', { slug: 'pi' }), res);
  assert.strictEqual(res.statusCode, 405);
  assert.strictEqual(fetchCalls.length, 0);
});

test('hit: rejects a slug not in the catalog with 400 and never touches Redis', async () => {
  stubFetch(okResponse(1));
  const res = mockRes();
  await hit(mockReq('POST', { slug: 'not-a-real-site' }), res);
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(fetchCalls.length, 0);
});

test('hit: rejects a missing slug with 400', async () => {
  stubFetch(okResponse(1));
  const res = mockRes();
  await hit(mockReq('POST', {}), res);
  assert.strictEqual(res.statusCode, 400);
});

test('hit: returns 502 when Redis fails', async () => {
  stubFetch({ ok: false, status: 500, json: async () => ({}) });
  const res = mockRes();
  await hit(mockReq('POST', { slug: 'pi' }), res);
  assert.strictEqual(res.statusCode, 502);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../api/hit'`

- [ ] **Step 3: Write the implementation**

Create `api/hit.js`:

```js
'use strict';
const { redis } = require('./_redis');
const catalog = require('../catalog.json');

const SLUGS = new Set(catalog.sites.map((s) => s.slug.toLowerCase()));

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  const slug = String((req.query && req.query.slug) || '').toLowerCase();
  if (!SLUGS.has(slug)) {
    return res.status(400).json({ error: 'unknown slug' });
  }
  try {
    const count = await redis(['hincrby', 'plays', slug, '1']);
    return res.status(200).json({ slug, count });
  } catch (err) {
    return res.status(502).json({ error: 'counter unavailable' });
  }
};
```

Note: `require('../catalog.json')` is intentional — Vercel's Node bundler statically includes required JSON, so the deployed function validates against the catalog with no filesystem reads at request time. New sites are always added via `catalog.json` (the `add-to-index` flow), so the allowlist stays current on each deploy.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/hit.js tests/api.test.js
git commit -m "feat: add /api/hit endpoint to count site plays"
```

---

### Task 3: `GET /api/counts` — return all play counts

**Files:**
- Create: `api/counts.js`
- Modify: `tests/api.test.js` (append tests)

**Interfaces:**
- Consumes: `redis(command)` from `api/_redis.js` (Task 1).
- Produces: Vercel Node handler `module.exports = async (req, res)` at `/api/counts`. `GET /api/counts` → `200` with `{ "<slug>": <number>, … }` (empty object when no counts yet) and `Cache-Control: s-maxage=60, stale-while-revalidate=300`; non-GET → `405`; Redis failure → `502`. The homepage (Task 5) depends on exactly this JSON shape.

- [ ] **Step 1: Write the failing tests**

Append to `tests/api.test.js`:

```js
const counts = require('../api/counts');

test('counts: converts HGETALL flat array to {slug: number} with cache header', async () => {
  stubFetch(okResponse(['pi', '42', 'snake', '7']));
  const res = mockRes();
  await counts(mockReq('GET'), res);
  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(res.body, { pi: 42, snake: 7 });
  assert.strictEqual(res.headers['Cache-Control'], 's-maxage=60, stale-while-revalidate=300');
  assert.strictEqual(fetchCalls[0].url, 'https://example.upstash.io/hgetall/plays');
});

test('counts: returns {} when the hash does not exist yet', async () => {
  stubFetch(okResponse(null));
  const res = mockRes();
  await counts(mockReq('GET'), res);
  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(res.body, {});
});

test('counts: rejects non-GET with 405', async () => {
  stubFetch(okResponse([]));
  const res = mockRes();
  await counts(mockReq('POST'), res);
  assert.strictEqual(res.statusCode, 405);
});

test('counts: returns 502 when Redis fails', async () => {
  stubFetch({ ok: false, status: 500, json: async () => ({}) });
  const res = mockRes();
  await counts(mockReq('GET'), res);
  assert.strictEqual(res.statusCode, 502);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../api/counts'`

- [ ] **Step 3: Write the implementation**

Create `api/counts.js`:

```js
'use strict';
const { redis } = require('./_redis');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  try {
    const flat = (await redis(['hgetall', 'plays'])) || [];
    const result = {};
    for (let i = 0; i < flat.length; i += 2) {
      result[flat[i]] = Number(flat[i + 1]);
    }
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(result);
  } catch (err) {
    return res.status(502).json({ error: 'counter unavailable' });
  }
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/counts.js tests/api.test.js
git commit -m "feat: add /api/counts endpoint returning all play counts"
```

---

### Task 4: Play beacon in `globals/global.js`

**Files:**
- Modify: `globals/global.js` (append a new IIFE at the end)

**Interfaces:**
- Consumes: `POST /api/hit?slug=<slug>` (Task 2). Relative URL — the beacon only fires on the production origin, where `/api/hit` exists.
- Produces: nothing consumed by other tasks; site pages start reporting plays once this deploys.

This file has no module system and runs inside ~111 live sites, so it gets no unit test — the whole block is guarded and fail-silent, and it is verified end-to-end in Task 6 Step 4.

- [ ] **Step 1: Append the beacon IIFE**

Append to the end of `globals/global.js`:

```js
// Play counter: report one open per site per tab session. Prod only, fail silent.
(function () {
    try {
        if (location.hostname !== 'randomsitesontheweb.com') return;
        var m = location.pathname.match(/^\/sites\/([a-z0-9_-]+)\/?/i);
        if (!m) return; // homepage and non-site pages don't count
        var slug = m[1].toLowerCase();
        var key = 'hit_' + slug;
        try {
            if (sessionStorage.getItem(key)) return;
            sessionStorage.setItem(key, '1');
        } catch (e) { /* storage blocked — count anyway */ }
        var url = '/api/hit?slug=' + encodeURIComponent(slug);
        if (navigator.sendBeacon) {
            navigator.sendBeacon(url);
        } else {
            fetch(url, { method: 'POST', keepalive: true }).catch(function () {});
        }
    } catch (e) { /* never break a site over analytics */ }
})();
```

Why these guards, in order: hostname check keeps localhost dev from inflating prod counts; the pathname regex means the root homepage (which also loads this file) never counts as a play; `sessionStorage` stops refresh inflation within a tab; the outer `try` guarantees no site ever breaks because of this block. `navigator.sendBeacon` sends a POST, matching the endpoint's method check.

- [ ] **Step 2: Sanity-check the file parses**

Run: `node --check globals/global.js`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add globals/global.js
git commit -m "feat: report site plays to /api/hit from global.js"
```

---

### Task 5: Show counts on homepage cards

**Files:**
- Modify: `templates/home.html` (one CSS rule + one JS block inside the existing directory-behavior IIFE)
- Modify: `tests/build.test.js` (append one test)
- Regenerate: `index.html` (via `npm run build` — never by hand)

**Interfaces:**
- Consumes: `GET /api/counts` returning `{ "<slug>": <number> }` (Task 3); existing card markup where each card link's href is `/sites/{slug}/` after the rewrite at the top of the directory-behavior IIFE.
- Produces: a `.plays` element inside qualifying card links.

- [ ] **Step 1: Write the failing test**

Append to `tests/build.test.js` (the file already imports `test` from `node:test`, `assert` from `node:assert/strict`, and `generateHtml` from `../scripts/build.js`; it does NOT import `fs`/`path`, so require them inside the test). The point is that the play-counts block survives generation into `index.html`:

```js
test('generated homepage includes the play-counts fetch', () => {
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..');
  const template = fs.readFileSync(path.join(root, 'templates', 'home.html'), 'utf8');
  const html = generateHtml(template, clone(CATALOG));
  assert.ok(html.includes("fetch('/api/counts')"), 'homepage should fetch /api/counts');
  assert.ok(html.includes("el.className = 'plays'"), 'homepage should render .plays elements');
});
```

(`CATALOG` and `clone` are the fixture and helper already defined at the top of `build.test.js` — reuse them rather than loading the real `catalog.json`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `homepage should fetch /api/counts`

- [ ] **Step 3: Add the CSS**

In `templates/home.html`, immediately after the `.site-card p { … }` rule (around line 806), add:

```css
        .site-card .plays {
            margin-top: 6px;
            font-size: 0.75rem;
            font-weight: 700;
            opacity: 0.55;
        }
```

- [ ] **Step 4: Add the fetch-and-annotate JS**

In `templates/home.html`, inside the directory-behavior IIFE, directly after the sticker-thumbnails block (the `document.querySelectorAll('.category-title').forEach(…)` loop ending around line 1379), add:

```js
            // ---- Play counts (live, from /api/counts) -------------------------
            fetch('/api/counts')
                .then(r => (r.ok ? r.json() : null))
                .then(countsBySlug => {
                    if (!countsBySlug) return;
                    document.querySelectorAll('.site-card a').forEach(link => {
                        const slug = (link.getAttribute('href') || '')
                            .replace('/sites/', '').replace(/\/$/, '').toLowerCase();
                        const n = countsBySlug[slug];
                        if (!n || n < 5) return; // hide sparse counts
                        const el = document.createElement('div');
                        el.className = 'plays';
                        el.textContent = '▶ ' + (n >= 1000
                            ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
                            : n) + ' plays';
                        el.title = n + ' plays';
                        link.appendChild(el);
                    });
                })
                .catch(() => {}); // local dev / API down → no counts, no errors
```

Placement matters: it must run after the href-rewrite loop at the top of the same IIFE (so hrefs are already `/sites/{slug}/`), and the slug derivation deliberately mirrors the `FOLDER_EMOJI` lookup a few lines above.

- [ ] **Step 5: Rebuild and run tests**

Run: `npm run build`
Expected: `index.html built: <N> visible / <M> total sites, <K> in random pool` (same numbers as the previous build).

Run: `npm test`
Expected: PASS, including the new template test.

- [ ] **Step 6: Eyeball it locally**

Serve the repo root (e.g. `npx serve .` or the project's local server) and open the homepage. Expected: cards render normally, no console error from the counts fetch (it fails silently on localhost), no `.plays` elements. This confirms graceful degradation.

- [ ] **Step 7: Commit**

```bash
git add templates/home.html index.html tests/build.test.js
git commit -m "feat: show play counts on homepage cards"
```

---

### Task 6: Deploy — vercel.json, Upstash setup, end-to-end verification

**Files:**
- Modify: `vercel.json` (additive only)

**Interfaces:**
- Consumes: everything above.
- Produces: live `/api/hit` and `/api/counts` on production.

- [ ] **Step 1: Add the function builds to `vercel.json`**

Replace the `builds` array (keep `version` and `routes` byte-identical):

```json
{
    "version": 2,
    "builds": [
      {
        "src": "index.html",
        "use": "@vercel/static"
      },
      {
        "src": "api/hit.js",
        "use": "@vercel/node"
      },
      {
        "src": "api/counts.js",
        "use": "@vercel/node"
      }
    ],
    "routes": [
      {
        "src": "/(.*)",
        "dest": "/$1"
      }
    ]
  }
```

The two `api/*.js` entries are listed explicitly (not a glob) so `api/_redis.js` is never deployed as its own endpoint — it gets bundled into each function via `require`. **Do not** remove or reorder the existing entries: this config is the working production deploy and the Phase 1 spec flags it as hard to test.

```bash
git add vercel.json
git commit -m "feat: deploy /api/hit and /api/counts as Vercel functions"
```

- [ ] **Step 2: Human setup — Upstash database + Vercel env vars (Dylan does this)**

1. Create a free Redis database at https://console.upstash.com (region: closest to Vercel deployment region; free tier is fine — this workload is a few thousand commands/month).
2. From the database's **REST API** section copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
3. In the Vercel dashboard → project → Settings → Environment Variables, add both vars for **Production and Preview** environments.

- [ ] **Step 3: Preview deploy and verify the API (before touching production)**

Push the branch / run `vercel deploy` to get a **preview** URL, then against that URL:

```bash
curl -s -X POST "https://<preview-url>/api/hit?slug=pi"
# expect: {"slug":"pi","count":1}
curl -s "https://<preview-url>/api/counts"
# expect: {"pi":1}
curl -s -X POST "https://<preview-url>/api/hit?slug=not-a-site" -o /dev/null -w "%{http_code}\n"
# expect: 400
```

**Also verify the static site still serves** (this is the risky part of touching `builds`):

```bash
curl -s -o /dev/null -w "%{http_code}\n" "https://<preview-url>/sites/snake/"       # expect 200
curl -s -o /dev/null -w "%{http_code}\n" "https://<preview-url>/globals/global.js"  # expect 200
curl -s -o /dev/null -w "%{http_code}\n" "https://<preview-url>/"                   # expect 200
```

If any static check fails, STOP — do not promote. The `builds` change altered what Vercel serves; revert `vercel.json` and investigate before retrying.

- [ ] **Step 4: Promote to production and verify end-to-end**

After merging/promoting:

1. Open any site, e.g. `https://randomsitesontheweb.com/sites/snake/`, with devtools → Network. Expected: one `hit?slug=snake` request with status 200; reloading the tab sends **no** second hit (sessionStorage guard).
2. `curl -s https://randomsitesontheweb.com/api/counts` — expect JSON including `"snake"`.
3. Homepage check: counts under 5 stay hidden, so either bump one slug past 5 (`for i in $(seq 5); do curl -s -X POST "https://randomsitesontheweb.com/api/hit?slug=snake" -o /dev/null; done` — then open a fresh incognito window since `/api/counts` is CDN-cached for 60s) and confirm "▶ 5 plays" appears on the Snake card.

- [ ] **Step 5: Clean up test counts (optional) and note follow-ups**

The curl-driven test plays slightly inflate `snake`/`pi` — either accept it or reset those fields in the Upstash console (`HDEL plays snake pi`).

Follow-ups deliberately out of scope (YAGNI for this plan): thumbs up/down (Phase 3b, same Redis/endpoint pattern), seeding counts from GA historicals, sorting the homepage by popularity, and the ~19 sites that don't yet include `global.js` (they simply won't report plays until they do).
