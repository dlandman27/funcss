'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function validateCatalog(catalog) {
  if (!catalog || !Array.isArray(catalog.sections) || catalog.sections.length === 0) {
    throw new Error('catalog.sections must be a non-empty array');
  }
  if (!Array.isArray(catalog.sites)) throw new Error('catalog.sites must be an array');
  const keys = new Set();
  for (const s of catalog.sections) {
    if (!s.key || !s.title) throw new Error(`section missing key/title: ${JSON.stringify(s)}`);
    if (keys.has(s.key)) throw new Error(`duplicate section key: ${s.key}`);
    keys.add(s.key);
  }
  const slugs = new Set();
  for (const site of catalog.sites) {
    const id = site.slug || JSON.stringify(site);
    if (typeof site.slug !== 'string' || !/^[a-z0-9-]+$/i.test(site.slug)) {
      throw new Error(`invalid slug: ${id}`);
    }
    if (slugs.has(site.slug)) throw new Error(`duplicate slug: ${site.slug}`);
    slugs.add(site.slug);
    if (!site.name) throw new Error(`missing name: ${site.slug}`);
    if (typeof site.visible !== 'boolean') throw new Error(`visible must be boolean: ${site.slug}`);
    if (typeof site.random !== 'boolean') throw new Error(`random must be boolean: ${site.slug}`);
    if (!keys.has(site.section)) throw new Error(`unknown section "${site.section}": ${site.slug}`);
    if (site.visible && !(typeof site.description === 'string' && site.description.trim())) {
      throw new Error(`visible site needs a non-empty description: ${site.slug}`);
    }
  }
}

function renderCard(site, sectionTitle) {
  return [
    `                <div class="site-card" data-categories="${site.section}">`,
    `                    <a href="${site.slug}/">`,
    `                        <h2>${escapeHtml(site.name)}</h2>`,
    `                        <p>${escapeHtml(site.description)}</p>`,
    `                        <div class="category">${escapeHtml(sectionTitle)}</div>`,
    '                    </a>',
    '                </div>',
  ].join('\n');
}

function renderSections(catalog) {
  return catalog.sections.map((section) => {
    const cards = catalog.sites
      .filter((s) => s.visible && s.section === section.key)
      .map((s) => renderCard(s, section.title))
      .join('\n');
    return [
      `            <!-- ${section.title} Section -->`,
      `            <h2 class="category-title ${section.key}">${escapeHtml(section.title)}</h2>`,
      '            <div class="site-grid">',
      cards,
      '            </div>',
    ].join('\n');
  }).join('\n\n');
}

function renderFolders(catalog) {
  return catalog.sites
    .filter((s) => s.random)
    .map((s) => `            '/${s.slug}/',`)
    .join('\n');
}

function generateHtml(template, catalog) {
  validateCatalog(catalog);
  for (const ph of ['{{SECTIONS}}', '{{FOLDERS}}']) {
    if (!template.includes(ph)) throw new Error(`template missing placeholder ${ph}`);
  }
  // Function replacers so "$&"-style patterns in content are inert.
  return template
    .replace('{{SECTIONS}}', () => renderSections(catalog))
    .replace('{{FOLDERS}}', () => renderFolders(catalog));
}

function build() {
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf8'));
  const template = fs.readFileSync(path.join(ROOT, 'templates', 'home.html'), 'utf8');
  const html = generateHtml(template, catalog);
  fs.writeFileSync(path.join(ROOT, 'index.html'), html);
  const visible = catalog.sites.filter((s) => s.visible).length;
  const pool = catalog.sites.filter((s) => s.random).length;
  console.log(`index.html built: ${visible} visible / ${catalog.sites.length} total sites, ${pool} in random pool`);
}

module.exports = { escapeHtml, validateCatalog, renderCard, renderSections, renderFolders, generateHtml };

if (require.main === module) build();
