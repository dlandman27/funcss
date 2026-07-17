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
