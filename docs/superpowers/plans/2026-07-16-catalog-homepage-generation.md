# Catalog + Homepage Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `catalog.json` the single source of truth for the homepage — generating the 7 card sections and the `folders[]` random pool at build time — per the spec at `docs/superpowers/specs/2026-07-16-catalog-homepage-generation-design.md`.

**Architecture:** A Node build script (`scripts/build.js`) validates `catalog.json` and injects rendered sections + folders into `templates/home.html`, writing `index.html` (a committed, generated artifact). A one-time migration script (`scripts/migrate.js`) scrapes the current `index.html` into the initial catalog and extracts the template; its parsers double as the structural-verification tool.

**Tech Stack:** Plain Node.js (v20 present), zero new dependencies. Tests via built-in `node:test` (`node --test`).

## Global Constraints

- Zero new npm dependencies.
- `vercel.json` must NOT be modified.
- The 125 files under `sites/` must NOT be modified.
- Section taxonomy is exactly: `educational`/Educational, `fun`/Fun & Interactive, `tools`/Tools, `games`/Games, `entertainment`/Entertainment, `mindfulness`/Mindfulness, `art`/Art.
- Card `href` stays folder-relative (`{slug}/`) — homepage JS prefixes `/sites/` at runtime.
- Generated `folders[]` entries keep the `'/{slug}/'` format (preserves `localStorage` `weight_/{slug}/` keys).
- `index.html` is generated output after migration — no hand edits.
- Work on branch `catalog-homepage-generation`.

---

### Task 1: Build script (rendering + validation + injection), TDD

**Files:**
- Create: `scripts/build.js`
- Create: `tests/build.test.js`
- Modify: `package.json` (add `build` + `test` scripts)

**Interfaces:**
- Produces: `module.exports = { escapeHtml, validateCatalog, renderCard, renderSections, renderFolders, generateHtml }` from `scripts/build.js`; CLI entry `node scripts/build.js` reads `catalog.json` + `templates/home.html`, writes `index.html`.
- Consumes: nothing (first task).

- [ ] **Step 1: Add npm scripts**

In `package.json` `"scripts"`, set:

```json
"scripts": {
  "build": "node scripts/build.js",
  "test": "node --test tests/"
}
```

- [ ] **Step 2: Write the failing tests** — create `tests/build.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  escapeHtml, validateCatalog, renderCard, renderSections, renderFolders, generateHtml,
} = require('../scripts/build.js');

const CATALOG = {
  sections: [
    { key: 'educational', title: 'Educational' },
    { key: 'fun', title: 'Fun & Interactive' },
  ],
  sites: [
    { slug: 'prefixsuffix', name: 'Prefix & Suffix', description: 'Practice prefixes', section: 'educational', visible: true, random: true, icon: null },
    { slug: 'hidden-one', name: 'Hidden', description: '', section: 'fun', visible: false, random: true, icon: null },
    { slug: 'doodle', name: 'Doodle', description: 'Draw things', section: 'fun', visible: true, random: false, icon: null },
  ],
};
const clone = (o) => JSON.parse(JSON.stringify(o));

test('escapeHtml escapes & < > "', () => {
  assert.equal(escapeHtml('a & <b> "c"'), 'a &amp; &lt;b&gt; &quot;c&quot;');
});

test('renderCard emits expected markup', () => {
  const html = renderCard(CATALOG.sites[0], 'Educational');
  assert.match(html, /data-categories="educational"/);
  assert.match(html, /href="prefixsuffix\/"/);
  assert.match(html, /<h2>Prefix &amp; Suffix<\/h2>/);
  assert.match(html, /<p>Practice prefixes<\/p>/);
  assert.match(html, /<div class="category">Educational<\/div>/);
});

test('renderSections groups by section, skips invisible, keeps order', () => {
  const html = renderSections(CATALOG);
  assert.match(html, /<h2 class="category-title educational">Educational<\/h2>/);
  assert.match(html, /<h2 class="category-title fun">Fun &amp; Interactive<\/h2>/);
  assert.ok(!html.includes('hidden-one'), 'invisible site must not render');
  assert.ok(html.indexOf('educational') < html.indexOf('doodle'), 'section order preserved');
});

test('renderFolders includes only random:true, catalog order, /slug/ format', () => {
  const body = renderFolders(CATALOG);
  assert.match(body, /'\/prefixsuffix\/',/);
  assert.match(body, /'\/hidden-one\/',/); // random is independent of visible
  assert.ok(!body.includes('/doodle/'));
});

test('validateCatalog rejects duplicate slug', () => {
  const c = clone(CATALOG);
  c.sites.push(clone(c.sites[0]));
  assert.throws(() => validateCatalog(c), /duplicate slug: prefixsuffix/);
});

test('validateCatalog rejects unknown section', () => {
  const c = clone(CATALOG);
  c.sites[0].section = 'nope';
  assert.throws(() => validateCatalog(c), /unknown section/);
});

test('validateCatalog rejects visible site with empty description', () => {
  const c = clone(CATALOG);
  c.sites[0].description = '  ';
  assert.throws(() => validateCatalog(c), /description/);
});

test('validateCatalog rejects invalid slug and non-boolean flags', () => {
  const bad = clone(CATALOG);
  bad.sites[0].slug = 'has space';
  assert.throws(() => validateCatalog(bad), /invalid slug/);
  const bad2 = clone(CATALOG);
  bad2.sites[0].visible = 'yes';
  assert.throws(() => validateCatalog(bad2), /visible must be boolean/);
});

test('generateHtml injects both placeholders and hard-errors when missing', () => {
  const tpl = 'A\n{{SECTIONS}}\nB\nconst folders = [\n{{FOLDERS}}\n];\nC';
  const out = generateHtml(tpl, CATALOG);
  assert.ok(out.includes('site-card'));
  assert.ok(out.includes("'/prefixsuffix/',"));
  assert.ok(!out.includes('{{SECTIONS}}') && !out.includes('{{FOLDERS}}'));
  assert.throws(() => generateHtml('no placeholders', CATALOG), /missing placeholder/);
});

test('generateHtml is safe when content contains $& replacement patterns', () => {
  const c = clone(CATALOG);
  c.sites[0].description = 'costs $& and $1 dollars';
  const out = generateHtml('{{SECTIONS}} {{FOLDERS}}', c);
  assert.ok(out.includes('costs $&amp; and $1 dollars'));
});
```

- [ ] **Step 3: Run tests, verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../scripts/build.js'`

- [ ] **Step 4: Implement `scripts/build.js`**

```js
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
```

- [ ] **Step 5: Run tests, verify they pass**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json scripts/build.js tests/build.test.js
git commit -m "feat: catalog-driven homepage build script with validation"
```

---

### Task 2: Migration parsers + one-time migration script, TDD

**Files:**
- Create: `scripts/migrate.js`
- Create: `tests/migrate.test.js`

**Interfaces:**
- Consumes: nothing from Task 1 (independent module).
- Produces: `module.exports = { parseCards, parseFolders, decodeEntities }` from `scripts/migrate.js`. `parseCards(html)` → `[{ key, title, cards: [{ slug, name, description }] }]`; `parseFolders(html)` → `['pi', 'checkboxgrid', …]` (slugs, no slashes). CLI entry writes `catalog.json` + `templates/home.html` from the current `index.html`.

- [ ] **Step 1: Write the failing tests** — create `tests/migrate.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCards, parseFolders, decodeEntities } = require('../scripts/migrate.js');

const FIXTURE = `
            <!-- Educational Section -->
            <h2 class="category-title educational">Educational</h2>
            <div class="site-grid">
                <div class="site-card" data-categories="educational development">
                    <a href="prefixsuffix/">
                        <h2>Prefix &amp; Suffix</h2>
                        <p>Generate and practice</p>
                        <div class="category">Educational • Development</div>
                    </a>
                </div>
            </div>

            <!-- Fun Section -->
            <h2 class="category-title fun">Fun &amp; Interactive</h2>
            <div class="site-grid">
                <div class="site-card" data-categories="fun interactive">
                    <a href="doodle/">
                        <h2>Doodle</h2>
                        <p>Draw things</p>
                        <div class="category">Fun • Interactive</div>
                    </a>
                </div>
            </div>
    <script>
        const folders = [
            '/pi/',
            '/doodle/',
        ];
    </script>`;

test('decodeEntities handles the common five', () => {
  assert.equal(decodeEntities('a &amp; b &lt;c&gt; &quot;d&quot; &#39;e&#39;'), `a & b <c> "d" 'e'`);
});

test('parseCards finds sections positionally with decoded titles and card fields', () => {
  const sections = parseCards(FIXTURE);
  assert.equal(sections.length, 2);
  assert.deepEqual(sections.map((s) => s.key), ['educational', 'fun']);
  assert.equal(sections[1].title, 'Fun & Interactive');
  assert.deepEqual(sections[0].cards, [
    { slug: 'prefixsuffix', name: 'Prefix & Suffix', description: 'Generate and practice' },
  ]);
  assert.deepEqual(sections[1].cards, [
    { slug: 'doodle', name: 'Doodle', description: 'Draw things' },
  ]);
});

test('parseFolders extracts slugs', () => {
  assert.deepEqual(parseFolders(FIXTURE), ['pi', 'doodle']);
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../scripts/migrate.js'` (build tests still pass).

- [ ] **Step 3: Implement `scripts/migrate.js`**

```js
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
function decodeEntities(s) {
  return s.replace(/&(?:amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m]);
}

// Parse the seven section blocks positionally: a card belongs to the grid it
// sits in, NOT to its (legacy, often-wrong) data-categories tokens.
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
  const re = /'\/([^']+)\/'/g;
  let f;
  while ((f = re.exec(m[1])) !== null) slugs.push(f[1]);
  return slugs;
}

function migrate() {
  const htmlPath = path.join(ROOT, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

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
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm test`
Expected: all tests (build + migrate) PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/migrate.js tests/migrate.test.js
git commit -m "feat: one-time migration scraper + template extractor"
```

---

### Task 3: Run migration, verify structurally, commit generated artifacts

**Files:**
- Create: `catalog.json` (by running `scripts/migrate.js`)
- Create: `templates/home.html` (same)
- Create: `scripts/verify-migration.js`
- Modify: `index.html` (regenerated by `npm run build`)

**Interfaces:**
- Consumes: `parseCards`/`parseFolders` from `scripts/migrate.js`; the build CLI from Task 1.
- Produces: the live `catalog.json` + `templates/home.html` all later work depends on.

- [ ] **Step 1: Snapshot the original homepage**

```bash
cp index.html /tmp-scratchpad-path/index-original.html   # use the session scratchpad dir
```

- [ ] **Step 2: Create `scripts/verify-migration.js`**

```js
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
```

- [ ] **Step 3: Run migration**

Run: `node scripts/migrate.js`
Expected: `catalog.json: 12x sites (109 carded, N folder-only hidden, M dir-only hidden)` and `templates/home.html extracted.` Investigate any WARN lines.

- [ ] **Step 4: Rebuild homepage from catalog**

Run: `npm run build`
Expected: `index.html built: 109 visible / <total> total sites, <pool> in random pool`.

- [ ] **Step 5: Verify structurally against the snapshot**

Run: `node scripts/verify-migration.js <scratchpad>/index-original.html index.html`
Expected: `Structural verification PASSED`. If it fails, fix the parser/renderer — do NOT hand-edit outputs.

- [ ] **Step 6: Eyeball the real diff**

Run: `git diff --stat index.html` and skim `git diff index.html | head -100`.
Expected changes ONLY: banner comment line, simplified `data-categories`, simplified `.category` labels, regenerated `folders[]` (order/membership per catalog), whitespace normalization. Anything else = bug.

- [ ] **Step 7: Smoke-test in a browser**

Run: `node app.js` — but note `app.js` serves `public/`, not the repo root; instead use: `npx serve .` or `python -m http.server` if available, else open `index.html` directly.
Check: sections render, search/filter works, sort works, "surprise me" button opens a site, site count displays the visible count.

- [ ] **Step 8: Commit generated artifacts + verifier**

```bash
git add catalog.json templates/home.html scripts/verify-migration.js index.html
git commit -m "feat: migrate homepage to catalog.json-driven generation"
```

---

### Task 4: Update project commands (add-to-index, new-site)

**Files:**
- Modify: `.claude/commands/add-to-index.md` (full rewrite)
- Modify: `.claude/commands/new-site.md` (step 3 only)

**Interfaces:**
- Consumes: the `catalog.json` schema (Task 3) and `npm run build` (Task 1).
- Produces: command docs other sessions follow — must match the real schema exactly.

- [ ] **Step 1: Rewrite `.claude/commands/add-to-index.md`**

```markdown
# Add to Index

Register an existing site folder in the site catalog (`catalog.json`). The homepage
(`index.html`) is GENERATED from the catalog — never edit it by hand.

## Usage
`/add-to-index <folder-name> "<title>" "<description>" <category>`

**category** must be one of: `educational`, `fun`, `tools`, `games`, `entertainment`, `mindfulness`, `art`

Example: `/add-to-index timemeters "Time Meters" "Progress bars for the day, week, month, year, decade, century, and millennium" tools`

---

## What to do

1. **Parse the arguments** — folder name, title, description, category. If any are missing, ask.

2. **Verify the folder exists** at `sites/<folder-name>/index.html`. If it doesn't, warn the user.

3. **Check `catalog.json`** for an existing entry with that slug. If one exists (e.g. imported
   as hidden during migration), UPDATE it in place — set `name`, `description`, `section`,
   `visible: true`, `random: true` — instead of adding a duplicate.

4. **Otherwise append** to the `sites` array in `catalog.json`:

   ```json
   {
     "slug": "<folder-name>",
     "name": "<title>",
     "description": "<description>",
     "section": "<category>",
     "visible": true,
     "random": true,
     "icon": null
   }
   ```

5. **Run `npm run build`** — regenerates `index.html`. The build validates the catalog and
   fails with a clear message if the entry is malformed.

6. **Show the user** the new card in the `git diff` of `index.html` and confirm.
```

- [ ] **Step 2: Update `.claude/commands/new-site.md`**

Read the file; replace ONLY its step 3 (the "Add a card to `index.html`" block, including the card HTML snippet and href note) with:

```markdown
3. **Register the site in `catalog.json`** — the homepage is GENERATED from the catalog;
   never edit `index.html` by hand. Append to the `sites` array:

   ```json
   {
     "slug": "<folder-name>",
     "name": "<title>",
     "description": "<description>",
     "section": "<category>",
     "visible": true,
     "random": true,
     "icon": null
   }
   ```

   Then run `npm run build` to regenerate `index.html`.
```

Renumber/adjust the following step if needed so the flow still reads correctly.

- [ ] **Step 3: Commit**

```bash
git add .claude/commands/add-to-index.md .claude/commands/new-site.md
git commit -m "docs: point add-to-index/new-site commands at catalog.json flow"
```

---

### Task 5: Behavioral verification (visible flag, add flow, failure mode)

**Files:**
- No permanent changes — exercises the pipeline end-to-end and reverts.

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: `visible: false` removes exactly one card**

In `catalog.json`, flip one carded site (e.g. `prefixsuffix`) to `"visible": false`. Run `npm run build`.
Expected: build reports one fewer visible site; `git diff index.html` shows exactly that card block removed.

- [ ] **Step 2: Malformed entry fails loudly, writes nothing**

Duplicate that site's entire entry in the array. Run `npm run build`.
Expected: exits non-zero with `duplicate slug: prefixsuffix`; `git diff index.html` unchanged from Step 1's state (no partial write of the invalid catalog).

- [ ] **Step 3: Revert the experiment**

Remove the duplicate, restore `"visible": true`, run `npm run build`.
Expected: `git status` shows a clean tree (index.html byte-identical to the Task 3 commit).

- [ ] **Step 4: Final test sweep**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 5: Commit anything outstanding (should be nothing) and report**

`git status` clean → report done with the summary numbers (total sites, visible, pool).
