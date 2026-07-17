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
