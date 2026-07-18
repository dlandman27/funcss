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
    console.error('counts failed:', err);
    return res.status(502).json({ error: 'counter unavailable' });
  }
};
