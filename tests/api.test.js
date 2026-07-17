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
