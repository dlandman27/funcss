'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
function decodeEntities(s) {
  return s.replace(/&(?:amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m]);
}

// Parse the section blocks positionally: a card belongs to the grid it sits
// in, NOT to its (legacy, often-wrong) data-categories tokens.
function parseCards(html) {
  const sections = [];
  const sectionRe = /<h2 class="category-title ([a-z]+)">([^<]+)<\/h2>\s*<div class="site-grid">([\s\S]*?)\n {12}<\/div>/g;
  let m;
  while ((m = sectionRe.exec(html)) !== null) {
    const [, key, title, body] = m;
    const cards = [];
    const cardRe = /<div class="site-card"[^>]*>\s*<a href="([^"]+)">\s*<h2>([\s\S]*?)<\/h2>\s*<p>([\s\S]*?)<\/p>/g;
    let c;
    while ((c = cardRe.exec(body)) !== null) {
      const href = c[1];
      if (!/^[^/]+\/$/.test(href)) console.warn(`WARN: unexpected href format: ${href}`);
      cards.push({
        slug: href.replace(/\/$/, ''),
        name: decodeEntities(c[2].trim()),
        description: decodeEntities(c[3].trim()),
      });
    }
    sections.push({ key, title: decodeEntities(title.trim()), cards });
  }
  return sections;
}

function parseFolders(html) {
  const m = html.match(/const folders = \[([\s\S]*?)\];/);
  if (!m) throw new Error('folders[] array not found');
  const slugs = [];
  const re = /['"]\/([^'"]+)\/['"]/g;
  let f;
  while ((f = re.exec(m[1])) !== null) slugs.push(f[1]);
  return slugs;
}

function migrate() {
  const htmlPath = path.join(ROOT, 'index.html');
  // Normalize CRLF → LF so the extraction regexes and generated output are
  // consistent; git's autocrlf handles checkout conversion.
  const html = fs.readFileSync(htmlPath, 'utf8').replace(/\r\n/g, '\n');

  const parsedSections = parseCards(html);
  if (parsedSections.length !== 7) {
    throw new Error(`expected 7 sections, found ${parsedSections.length}`);
  }
  const folderSlugs = parseFolders(html);
  const folderSet = new Set(folderSlugs);

  const sites = [];
  const seen = new Set();
  for (const sec of parsedSections) {
    for (const card of sec.cards) {
      sites.push({
        slug: card.slug, name: card.name, description: card.description,
        section: sec.key, visible: true, random: folderSet.has(card.slug), icon: null,
      });
      seen.add(card.slug);
    }
  }
  const fallbackSection = parsedSections[0].key;
  let folderOnly = 0;
  for (const slug of folderSlugs) {
    if (seen.has(slug)) continue;
    sites.push({ slug, name: slug, description: '', section: fallbackSection, visible: false, random: true, icon: null });
    seen.add(slug);
    folderOnly++;
  }
  let dirOnly = 0;
  for (const entry of fs.readdirSync(path.join(ROOT, 'sites'), { withFileTypes: true })) {
    if (!entry.isDirectory() || seen.has(entry.name)) continue;
    sites.push({ slug: entry.name, name: entry.name, description: '', section: fallbackSection, visible: false, random: false, icon: null });
    seen.add(entry.name);
    dirOnly++;
  }

  const catalog = { sections: parsedSections.map((s) => ({ key: s.key, title: s.title })), sites };
  fs.writeFileSync(path.join(ROOT, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');

  // ---- Extract templates/home.html from the original page ----
  const sectionsRegion = / {12}<!-- Educational Section -->[\s\S]*?(?=\n\n {12}<!-- Footer message -->)/;
  if (!sectionsRegion.test(html)) throw new Error('could not locate sections region');
  let template = html.replace(sectionsRegion, '{{SECTIONS}}');

  const foldersRegion = /const folders = \[[\s\S]*?\];/;
  if (!foldersRegion.test(template)) throw new Error('could not locate folders region');
  template = template.replace(foldersRegion, 'const folders = [\n{{FOLDERS}}\n        ];');

  template = template.replace(
    '<!DOCTYPE html>',
    '<!DOCTYPE html>\n<!-- GENERATED FILE: index.html is built from catalog.json + templates/home.html. Do not edit index.html by hand — edit those and run: npm run build -->'
  );

  fs.mkdirSync(path.join(ROOT, 'templates'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'templates', 'home.html'), template);

  const carded = sites.filter((s) => s.visible).length;
  console.log(`catalog.json: ${sites.length} sites (${carded} carded, ${folderOnly} folder-only hidden, ${dirOnly} dir-only hidden)`);
  console.log('templates/home.html extracted.');
}

module.exports = { parseCards, parseFolders, decodeEntities };

if (require.main === module) migrate();
