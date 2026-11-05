'use strict';
const { redis } = require('./_redis');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }
  try {
    // ?range=week sums the last 7 daily hashes; otherwise lifetime totals
    const keys = req.query && req.query.range === 'week'
      ? Array.from({ length: 7 }, (_, i) => 'plays:d:' + new Date(Date.now() - i * 86400000).toISOString().slice(0, 10))
      : ['plays'];
    const flats = await Promise.all(keys.map((k) => redis(['hgetall', k])));
    const result = {};
    for (const flat of flats) {
      for (let i = 0; i < (flat || []).length; i += 2) {
        result[flat[i]] = (result[flat[i]] || 0) + Number(flat[i + 1]);
      }
    }
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(result);
  } catch (err) {
    console.error('counts failed:', err);
    return res.status(502).json({ error: 'counter unavailable' });
  }
};
