'use strict';
// Structural comparison of two homepage HTML files: same slugs (with names and
// descriptions) in the same order per section, and the same random-pool set.
// Usage: node scripts/verify-migration.js <old.html> <new.html>
const fs = require('fs');
const { parseCards, parseFolders } = require('./migrate.js');

const [oldPath, newPath] = process.argv.slice(2);
if (!oldPath || !newPath) {
  console.error('usage: node scripts/verify-migration.js <old.html> <new.html>');
  process.exit(2);
}
const a = fs.readFileSync(oldPath, 'utf8');
const b = fs.readFileSync(newPath, 'utf8');

const shape = (html) => parseCards(html).map((s) => ({ key: s.key, cards: s.cards }));
const sa = JSON.stringify(shape(a), null, 1);
const sb = JSON.stringify(shape(b), null, 1);
let failed = false;
if (sa !== sb) {
  failed = true;
  console.error('SECTION/CARD MISMATCH — diff the following:');
  fs.writeFileSync(oldPath + '.shape.json', sa);
  fs.writeFileSync(newPath + '.shape.json', sb);
  console.error(`wrote ${oldPath}.shape.json and ${newPath}.shape.json`);
}
const fa = [...parseFolders(a)].sort().join(',');
const fb = [...parseFolders(b)].sort().join(',');
if (fa !== fb) {
  failed = true;
  console.error('RANDOM POOL MISMATCH');
  console.error(' old:', fa);
  console.error(' new:', fb);
}
if (failed) process.exit(1);
console.log('Structural verification PASSED: sections/cards and random pool match.');
