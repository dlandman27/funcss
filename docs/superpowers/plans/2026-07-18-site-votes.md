# Site Votes (Phase 3b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thumbs up/down voting on homepage cards, with changeable one-vote-per-browser semantics and exact tallies.

**Architecture:** Two new Upstash hashes (`votes:up`, `votes:down`, field = lowercased catalog slug) behind two zero-config Vercel functions: `POST /api/vote` applies `prev→next` deltas in one Upstash pipeline and returns fresh tallies; `GET /api/votes` returns all tallies CDN-cached. Homepage cards get a two-chip vote row; `localStorage` remembers the browser's vote. No `globals/global.js` changes.

**Tech Stack:** Native `fetch` to Upstash REST (zero npm dependencies), `node --test`, generated homepage (`templates/home.html` → `npm run build` → `index.html`).

**Spec:** `docs/superpowers/specs/2026-07-18-site-votes-design.md`

## Global Constraints

- Zero new npm dependencies; tests run with `npm test` (`node --test tests/`).
- `index.html` is GENERATED — never hand-edit. Edit `templates/home.html`, run `npm run build`, commit both.
- Redis layout: hashes `votes:up` and `votes:down`; field = lowercased catalog slug; value = integer ≥ 0. Env vars `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- Endpoint conventions (match `api/hit.js`/`api/counts.js`): wrong method → 405 `{"error":"method not allowed"}`; bad input → 400; Redis failure → 502 `{"error":"counter unavailable"}` after `console.error` logging.
- There is NO `vercel.json` (deliberately deleted — zero-config). Do not create one. `api/_redis.js` stays underscore-prefixed so Vercel never exposes it as an endpoint.
- Vote states are exactly `none | up | down`; a POST requires `prev !== next`.
- Card vote buttons must never navigate (cards are wrapped in `<a>`): `preventDefault()` + `stopPropagation()`.
- The whole feature fails silent on localhost/API-down, like play counts.

---

### Task 1: `pipeline()` helper in the Redis client

**Files:**
- Modify: `api/_redis.js`
- Modify: `tests/api.test.js` (append tests)

**Interfaces:**
- Consumes: `process.env.UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, global `fetch`; existing helpers `stubFetch(response)`, `okResponse(result)`, `fetchCalls`, and the env-setting `beforeEach` in `tests/api.test.js`.
- Produces: `pipeline(commands: string[][]) => Promise<any[]>` — POSTs `commands` as JSON to `{url}/pipeline` with the Bearer header, returns the array of `result` values in order. Throws on missing env vars, non-OK HTTP, or any `{error}` entry in the response. Exported as `module.exports = { redis, pipeline }` (keep `redis` exported unchanged). Tasks 2 and 3 require exactly this signature.

- [ ] **Step 1: Write the failing tests**

Append to `tests/api.test.js`:

```js
const { pipeline } = require('../api/_redis');

function okPipelineResponse(results) {
  return { ok: true, status: 200, json: async () => results.map((r) => ({ result: r })) };
}

test('pipeline: POSTs commands as JSON to /pipeline and unwraps results in order', async () => {
  stubFetch(okPipelineResponse([1, 5]));
  const results = await pipeline([
    ['hincrby', 'votes:up', 'pi', '1'],
    ['hget', 'votes:down', 'pi'],
  ]);
  assert.deepStrictEqual(results, [1, 5]);
  assert.strictEqual(fetchCalls.length, 1);
  assert.strictEqual(fetchCalls[0].url, 'https://example.upstash.io/pipeline');
  assert.strictEqual(fetchCalls[0].opts.method, 'POST');
  assert.strictEqual(fetchCalls[0].opts.headers.Authorization, 'Bearer test-token');
  assert.strictEqual(fetchCalls[0].opts.headers['Content-Type'], 'application/json');
  assert.deepStrictEqual(JSON.parse(fetchCalls[0].opts.body), [
    ['hincrby', 'votes:up', 'pi', '1'],
    ['hget', 'votes:down', 'pi'],
  ]);
});

test('pipeline: throws on non-OK HTTP status', async () => {
  stubFetch({ ok: false, status: 500, json: async () => [] });
  await assert.rejects(() => pipeline([['ping']]), /500/);
});

test('pipeline: throws when any entry carries an error', async () => {
  stubFetch({ ok: true, status: 200, json: async () => [{ result: 1 }, { error: 'WRONGTYPE' }] });
  await assert.rejects(() => pipeline([['ping'], ['ping']]), /WRONGTYPE/);
});

test('pipeline: throws when env vars are missing', async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  await assert.rejects(() => pipeline([['ping']]), /UPSTASH/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `pipeline is not a function`

- [ ] **Step 3: Implement**

In `api/_redis.js`, extract the env read into a small helper and add `pipeline`, keeping `redis` behavior identical. Full new file content:

```js
'use strict';

function config() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error('UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set');
  }
  return { base: url.replace(/\/$/, ''), token };
}

async function redis(command) {
  const { base, token } = config();
  const endpoint = base + '/' + command.map(encodeURIComponent).join('/');
  const res = await fetch(endpoint, {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!res.ok) throw new Error('Upstash request failed: ' + res.status);
  const data = await res.json();
  return data.result;
}

async function pipeline(commands) {
  const { base, token } = config();
  const res = await fetch(base + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error('Upstash pipeline failed: ' + res.status);
  const data = await res.json();
  return data.map((entry) => {
    if (entry.error) throw new Error('Upstash pipeline error: ' + entry.error);
    return entry.result;
  });
}

module.exports = { redis, pipeline };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all PASS (including every pre-existing test — `redis()` behavior is unchanged).

- [ ] **Step 5: Commit**

```bash
git add api/_redis.js tests/api.test.js
git commit -m "feat: add Upstash pipeline helper for votes"
```

---

### Task 2: `POST /api/vote` — apply a vote transition

**Files:**
- Create: `api/vote.js`
- Modify: `tests/api.test.js` (append tests)

**Interfaces:**
- Consumes: `pipeline(commands)` and `redis(command)` from `api/_redis.js` (Task 1); `catalog.json` (`sites[].slug`); existing test helpers incl. `mockReq(method, query)` / `mockRes()`.
- Produces: handler `module.exports = async (req, res)` at `/api/vote`. `POST /api/vote?slug=<slug>&prev=<state>&next=<state>` → `200 {"slug","up","down"}`. Task 4's homepage JS depends on exactly this response shape.

Delta semantics (from the spec): leaving a non-`none` state decrements its hash; entering a non-`none` state increments it. The pipeline always ends with `HGET votes:up <slug>`, `HGET votes:down <slug>`; the response tallies are those two reads clamped to ≥ 0 (`null` → 0). If a decrement's `HINCRBY` result is negative (client lied / drift), repair storage with `HSET votes:<state> <slug> 0` after the pipeline.

- [ ] **Step 1: Write the failing tests**

Append to `tests/api.test.js`:

```js
const vote = require('../api/vote');

test('vote: none→up increments votes:up only and returns fresh tallies', async () => {
  stubFetch(okPipelineResponse([1, '1', null]));
  const res = mockRes();
  await vote(mockReq('POST', { slug: 'pi', prev: 'none', next: 'up' }), res);
  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(res.body, { slug: 'pi', up: 1, down: 0 });
  assert.deepStrictEqual(JSON.parse(fetchCalls[0].opts.body), [
    ['hincrby', 'votes:up', 'pi', '1'],
    ['hget', 'votes:up', 'pi'],
    ['hget', 'votes:down', 'pi'],
  ]);
});

test('vote: up→down moves one vote across both hashes', async () => {
  stubFetch(okPipelineResponse([0, 1, '0', '1']));
  const res = mockRes();
  await vote(mockReq('POST', { slug: 'pi', prev: 'up', next: 'down' }), res);
  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(res.body, { slug: 'pi', up: 0, down: 1 });
  assert.deepStrictEqual(JSON.parse(fetchCalls[0].opts.body), [
    ['hincrby', 'votes:up', 'pi', '-1'],
    ['hincrby', 'votes:down', 'pi', '1'],
    ['hget', 'votes:up', 'pi'],
    ['hget', 'votes:down', 'pi'],
  ]);
});

test('vote: down→none decrements votes:down only', async () => {
  stubFetch(okPipelineResponse([0, null, '0']));
  const res = mockRes();
  await vote(mockReq('POST', { slug: 'pi', prev: 'down', next: 'none' }), res);
  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(res.body, { slug: 'pi', up: 0, down: 0 });
  assert.deepStrictEqual(JSON.parse(fetchCalls[0].opts.body), [
    ['hincrby', 'votes:down', 'pi', '-1'],
    ['hget', 'votes:up', 'pi'],
    ['hget', 'votes:down', 'pi'],
  ]);
});

test('vote: negative decrement result triggers a floor repair HSET and clamps response', async () => {
  let call = 0;
  fetchCalls = [];
  global.fetch = async (url, opts) => {
    fetchCalls.push({ url, opts });
    call += 1;
    if (call === 1) {
      return { ok: true, status: 200, json: async () => [{ result: -1 }, { result: '-1' }, { result: null }] };
    }
    return { ok: true, status: 200, json: async () => ({ result: 0 }) };
  };
  const res = mockRes();
  await vote(mockReq('POST', { slug: 'pi', prev: 'up', next: 'none' }), res);
  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(res.body, { slug: 'pi', up: 0, down: 0 });
  assert.strictEqual(fetchCalls.length, 2);
  assert.strictEqual(fetchCalls[1].url, 'https://example.upstash.io/hset/votes%3Aup/pi/0');
});

test('vote: rejects prev === next with 400 and never touches Redis', async () => {
  stubFetch(okPipelineResponse([]));
  const res = mockRes();
  await vote(mockReq('POST', { slug: 'pi', prev: 'up', next: 'up' }), res);
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(fetchCalls.length, 0);
});

test('vote: rejects an invalid state with 400', async () => {
  stubFetch(okPipelineResponse([]));
  const res = mockRes();
  await vote(mockReq('POST', { slug: 'pi', prev: 'sideways', next: 'up' }), res);
  assert.strictEqual(res.statusCode, 400);
});

test('vote: rejects a slug not in the catalog with 400', async () => {
  stubFetch(okPipelineResponse([]));
  const res = mockRes();
  await vote(mockReq('POST', { slug: 'not-a-real-site', prev: 'none', next: 'up' }), res);
  assert.strictEqual(res.statusCode, 400);
});

test('vote: rejects non-POST with 405', async () => {
  stubFetch(okPipelineResponse([]));
  const res = mockRes();
  await vote(mockReq('GET', { slug: 'pi', prev: 'none', next: 'up' }), res);
  assert.strictEqual(res.statusCode, 405);
});

test('vote: returns 502 when Redis fails', async () => {
  stubFetch({ ok: false, status: 500, json: async () => [] });
  const res = mockRes();
  await vote(mockReq('POST', { slug: 'pi', prev: 'none', next: 'up' }), res);
  assert.strictEqual(res.statusCode, 502);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../api/vote'`

- [ ] **Step 3: Implement**

Create `api/vote.js`:

```js
'use strict';
const { redis, pipeline } = require('./_redis');
const catalog = require('../catalog.json');

const SLUGS = new Set(catalog.sites.map((s) => s.slug.toLowerCase()));
const STATES = new Set(['none', 'up', 'down']);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  const q = req.query || {};
  const slug = String(q.slug || '').toLowerCase();
  const prev = String(q.prev || '');
  const next = String(q.next || '');
  if (!SLUGS.has(slug)) {
    return res.status(400).json({ error: 'unknown slug' });
  }
  if (!STATES.has(prev) || !STATES.has(next) || prev === next) {
    return res.status(400).json({ error: 'invalid vote transition' });
  }
  const commands = [];
  if (prev !== 'none') commands.push(['hincrby', 'votes:' + prev, slug, '-1']);
  if (next !== 'none') commands.push(['hincrby', 'votes:' + next, slug, '1']);
  commands.push(['hget', 'votes:up', slug], ['hget', 'votes:down', slug]);
  try {
    const results = await pipeline(commands);
    const up = Math.max(0, Number(results[results.length - 2]) || 0);
    const down = Math.max(0, Number(results[results.length - 1]) || 0);
    if (prev !== 'none' && Number(results[0]) < 0) {
      await redis(['hset', 'votes:' + prev, slug, '0']);
    }
    return res.status(200).json({ slug, up, down });
  } catch (err) {
    console.error('vote failed:', err);
    return res.status(502).json({ error: 'counter unavailable' });
  }
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS. (The 502 test will print `vote failed:` on stderr — expected logging, tests still pass.)

- [ ] **Step 5: Commit**

```bash
git add api/vote.js tests/api.test.js
git commit -m "feat: add /api/vote endpoint with prev/next delta semantics"
```

---

### Task 3: `GET /api/votes` — all tallies

**Files:**
- Create: `api/votes.js`
- Modify: `tests/api.test.js` (append tests)

**Interfaces:**
- Consumes: `pipeline(commands)` from Task 1.
- Produces: handler at `/api/votes`. `GET` → `200 { "<slug>": {"up": n, "down": n}, ... }` (slug present when either tally is nonzero in Redis; values clamped ≥ 0) with `Cache-Control: s-maxage=60, stale-while-revalidate=300`. Non-GET → 405; Redis failure → 502 (logged). Task 4's homepage JS depends on exactly this shape.

- [ ] **Step 1: Write the failing tests**

Append to `tests/api.test.js`:

```js
const votes = require('../api/votes');

test('votes: merges both hashes into {slug: {up, down}} with cache header', async () => {
  stubFetch(okPipelineResponse([
    ['pi', '3', 'snake', '10'],
    ['snake', '2', 'dvd', '1'],
  ]));
  const res = mockRes();
  await votes(mockReq('GET'), res);
  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(res.body, {
    pi: { up: 3, down: 0 },
    snake: { up: 10, down: 2 },
    dvd: { up: 0, down: 1 },
  });
  assert.strictEqual(res.headers['Cache-Control'], 's-maxage=60, stale-while-revalidate=300');
  assert.deepStrictEqual(JSON.parse(fetchCalls[0].opts.body), [
    ['hgetall', 'votes:up'],
    ['hgetall', 'votes:down'],
  ]);
});

test('votes: returns {} when neither hash exists yet', async () => {
  stubFetch(okPipelineResponse([null, null]));
  const res = mockRes();
  await votes(mockReq('GET'), res);
  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(res.body, {});
});

test('votes: rejects non-GET with 405', async () => {
  stubFetch(okPipelineResponse([[], []]));
  const res = mockRes();
  await votes(mockReq('POST'), res);
  assert.strictEqual(res.statusCode, 405);
});

test('votes: returns 502 when Redis fails', async () => {
  stubFetch({ ok: false, status: 500, json: async () => [] });
  const res = mockRes();
  await votes(mockReq('GET'), res);
  assert.strictEqual(res.statusCode, 502);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../api/votes'`

- [ ] **Step 3: Implement**

Create `api/votes.js`:

```js
'use strict';
const { pipeline } = require('./_redis');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  try {
    const [upFlat, downFlat] = await pipeline([
      ['hgetall', 'votes:up'],
      ['hgetall', 'votes:down'],
    ]);
    const out = {};
    const fill = (flat, key) => {
      const arr = flat || [];
      for (let i = 0; i < arr.length; i += 2) {
        const slug = arr[i];
        if (!out[slug]) out[slug] = { up: 0, down: 0 };
        out[slug][key] = Math.max(0, Number(arr[i + 1]) || 0);
      }
    };
    fill(upFlat, 'up');
    fill(downFlat, 'down');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(out);
  } catch (err) {
    console.error('votes failed:', err);
    return res.status(502).json({ error: 'counter unavailable' });
  }
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/votes.js tests/api.test.js
git commit -m "feat: add /api/votes endpoint returning all vote tallies"
```

---

### Task 4: Homepage vote row + local dev routes

**Files:**
- Modify: `templates/home.html` (one CSS block + one JS block)
- Modify: `app.js` (two routes)
- Modify: `tests/build.test.js` (append one test)
- Regenerate: `index.html` (via `npm run build`)

**Interfaces:**
- Consumes: `GET /api/votes` (Task 3 shape) and `POST /api/vote` (Task 2 shape); the card structure where each `.site-card a` href is `/sites/{slug}/` after the rewrite loop; `localStorage`.
- Produces: a `.vote-row` with two `.vote-btn` buttons inside every card link.

- [ ] **Step 1: Write the failing test**

Append to `tests/build.test.js`:

```js
test('generated homepage includes the vote row code', () => {
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..');
  const template = fs.readFileSync(path.join(root, 'templates', 'home.html'), 'utf8');
  const html = generateHtml(template, clone(CATALOG));
  assert.ok(html.includes("fetch('/api/votes')"), 'homepage should fetch /api/votes');
  assert.ok(html.includes("row.className = 'vote-row'"), 'homepage should build .vote-row elements');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `homepage should fetch /api/votes`

- [ ] **Step 3: Add the CSS**

In `templates/home.html`, immediately after the `.site-card .plays` block (search for `/* Play-count sticker`), add:

```css
        /* Vote chips — 👍/👎 at the bottom of each card */
        .vote-row {
            display: flex;
            gap: 8px;
            margin-top: 10px;
        }

        .vote-btn {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 3px 10px;
            border-radius: 999px;
            border: 2px solid var(--ink);
            background: var(--card);
            color: var(--ink);
            font-family: inherit;
            font-size: 0.8rem;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 2px 2px 0 var(--ink);
            transition: transform 0.12s ease, box-shadow 0.12s ease;
        }

        .vote-btn:hover { transform: translate(-1px, -1px); }
        .vote-btn:active { transform: translate(1px, 1px); box-shadow: none; }
        .vote-btn.pressed-up { background: var(--lime); }
        .vote-btn.pressed-down { background: var(--coral); }

        @media (prefers-reduced-motion: reduce) {
            .vote-btn { transition: none; }
        }
```

- [ ] **Step 4: Add the JS**

In `templates/home.html`, inside the directory-behavior IIFE, directly AFTER the play-counts block (search for `// ---- Play counts` and insert after that block's closing `.catch(() => {});`), add this block verbatim:

```js
            // ---- Votes (👍/👎 chips on each card) ------------------------------
            const VOTE_EMOJI = { up: '👍', down: '👎' };
            const voteTallies = {}; // slug -> {up, down}
            const fmtVotes = n => n >= 1000
                ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
                : String(n);

            function paintVoteRow(row, slug) {
                const mine = localStorage.getItem('vote_' + slug);
                const t = voteTallies[slug] || { up: 0, down: 0 };
                row.querySelectorAll('.vote-btn').forEach(btn => {
                    const kind = btn.dataset.kind;
                    const n = t[kind] || 0;
                    btn.textContent = VOTE_EMOJI[kind] + (n > 0 ? ' ' + fmtVotes(n) : '');
                    btn.title = n + (kind === 'up' ? ' thumbs up' : ' thumbs down');
                    btn.classList.toggle('pressed-' + kind, mine === kind);
                    btn.setAttribute('aria-pressed', mine === kind ? 'true' : 'false');
                    btn.setAttribute('aria-label', (kind === 'up' ? 'Thumbs up' : 'Thumbs down') + ', ' + n + ' votes');
                });
            }

            document.querySelectorAll('.site-card a').forEach(link => {
                const slug = (link.getAttribute('href') || '')
                    .replace('/sites/', '').replace(/\/$/, '').toLowerCase();
                if (!slug) return;
                const row = document.createElement('div');
                row.className = 'vote-row';
                ['up', 'down'].forEach(kind => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'vote-btn';
                    btn.dataset.kind = kind;
                    btn.addEventListener('click', e => {
                        e.preventDefault();
                        e.stopPropagation();
                        const prev = localStorage.getItem('vote_' + slug) || 'none';
                        const next = prev === kind ? 'none' : kind;
                        if (next === 'none') localStorage.removeItem('vote_' + slug);
                        else localStorage.setItem('vote_' + slug, next);
                        const t = voteTallies[slug] || (voteTallies[slug] = { up: 0, down: 0 });
                        if (prev !== 'none') t[prev] = Math.max(0, (t[prev] || 0) - 1);
                        if (next !== 'none') t[next] = (t[next] || 0) + 1;
                        paintVoteRow(row, slug);
                        fetch('/api/vote?slug=' + encodeURIComponent(slug) + '&prev=' + prev + '&next=' + next, { method: 'POST' })
                            .then(r => (r.ok ? r.json() : null))
                            .then(fresh => {
                                if (!fresh) return;
                                voteTallies[slug] = { up: fresh.up, down: fresh.down };
                                paintVoteRow(row, slug);
                            })
                            .catch(() => {}); // local dev / API down — keep optimistic state
                    });
                    row.appendChild(btn);
                });
                link.appendChild(row);
                paintVoteRow(row, slug);
            });

            fetch('/api/votes')
                .then(r => (r.ok ? r.json() : null))
                .then(all => {
                    if (!all) return;
                    Object.assign(voteTallies, all);
                    document.querySelectorAll('.site-card a').forEach(link => {
                        const slug = (link.getAttribute('href') || '')
                            .replace('/sites/', '').replace(/\/$/, '').toLowerCase();
                        const row = link.querySelector('.vote-row');
                        if (row && slug) paintVoteRow(row, slug);
                    });
                })
                .catch(() => {});
```

- [ ] **Step 5: Wire the local dev server**

In `app.js`, after the existing play-count routes, add:

```js
app.post('/api/vote', require('./api/vote'));
app.get('/api/votes', require('./api/votes'));
```

- [ ] **Step 6: Rebuild and run tests**

Run: `npm run build`
Expected: same `visible / total / random pool` numbers as the previous build.

Run: `npm test`
Expected: PASS including the new build test.

- [ ] **Step 7: Manual click-test locally**

Restart the local server (`node app.js`), open `http://localhost:3400`, and verify on any card: clicking 👍 fills it lime and shows `👍 1`; clicking 👍 again clears it; clicking 👍 then 👎 flips (👍 back to 0, 👎 shows 1 in coral); reloading preserves the pressed state; clicking a chip never navigates to the site. Then check the database reflects it: `curl -s http://localhost:3400/api/votes`.

- [ ] **Step 8: Commit**

```bash
git add templates/home.html index.html app.js tests/build.test.js
git commit -m "feat: thumbs up/down vote chips on homepage cards"
```

---

### Task 5: Deploy verification

**Files:** none (no config changes — zero-config Vercel auto-detects `api/vote.js` and `api/votes.js`).

- [ ] **Step 1: Push and confirm deployment**

```bash
git push origin main
```

- [ ] **Step 2: Verify on whatever host currently serves the working API**

(As of the plan date the domain is mid-cutover from Netlify to Vercel; run these against the production domain once the play-counts API works there — same gate.)

```bash
curl -s -X POST "https://randomsitesontheweb.com/api/vote?slug=pi&prev=none&next=up"
# expect: {"slug":"pi","up":1,"down":0}
curl -s "https://randomsitesontheweb.com/api/votes"
# expect: {"pi":{"up":1,"down":0}}
curl -s -X POST "https://randomsitesontheweb.com/api/vote?slug=pi&prev=up&next=none"
# expect: {"slug":"pi","up":0,"down":0}   (undo the test vote)
curl -s -o /dev/null -w "%{http_code}\n" -X POST "https://randomsitesontheweb.com/api/vote?slug=pi&prev=up&next=up"
# expect: 400
```

- [ ] **Step 3: Browser check**

Open the production homepage, vote a site up, reload — pressed state persists and the tally shows. Open in a second browser/incognito — the tally is visible there (within the 60s cache window).
