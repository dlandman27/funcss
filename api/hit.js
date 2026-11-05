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
    // per-day tally for "Trending this week"; expires on its own after 9 days
    const day = 'plays:d:' + new Date().toISOString().slice(0, 10);
    redis(['hincrby', day, slug, '1'])
      .then(() => redis(['expire', day, String(9 * 86400)]))
      .catch((err) => console.error('daily hit failed:', err));
    return res.status(200).json({ slug, count });
  } catch (err) {
    console.error('hit failed:', err);
    return res.status(502).json({ error: 'counter unavailable' });
  }
};
