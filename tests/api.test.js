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
