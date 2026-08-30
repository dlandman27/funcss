require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3400;

// Play-count API — same handlers Vercel deploys, backed by Upstash via .env
app.post('/api/hit', require('./api/hit'));
app.get('/api/counts', require('./api/counts'));

// Clean toy URLs — mirrors vercel.json so local dev matches production.
// 301 the old /sites/<slug>/ path to the canonical clean /<slug>/ ...
app.get(/^\/sites\/([a-z0-9_-]+)\/?$/i, (req, res) => {
  res.redirect(301, `/${req.params[0]}/`);
});
// ... and rewrite /<slug> or /<slug>/ to the toy's index.html when it exists.
app.get(/^\/([a-z0-9_-]+)\/?$/i, (req, res, next) => {
  const file = path.join(__dirname, 'sites', req.params[0], 'index.html');
  if (fs.existsSync(file)) return res.sendFile(file);
  return next();
});
// Toy pages reference assets relatively (./Boat.glb), which resolve to
// /<slug>/<file> at the clean URL — serve those from sites/<slug>/ too.
app.get(/^\/([a-z0-9_-]+)\/(.+)$/i, (req, res, next) => {
  const dir = path.join(__dirname, 'sites', req.params[0]);
  const file = path.resolve(dir, req.params[1]);
  if (!file.startsWith(dir + path.sep)) return next(); // block traversal out of the toy dir
  if (fs.existsSync(file) && fs.statSync(file).isFile()) return res.sendFile(file);
  return next();
});

// Serve the site from the repo root (index.html, sites/, favicons, etc.)
app.use(express.static(__dirname));

// Fall back to the 404 page for anything else
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
