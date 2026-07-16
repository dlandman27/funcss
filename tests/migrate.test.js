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
