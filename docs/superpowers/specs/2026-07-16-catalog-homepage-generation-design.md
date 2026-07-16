# Catalog + Homepage Generation (Phase 1)

**Date:** 2026-07-16 (revised same day after codebase deep-dive)
**Status:** Approved — ready for implementation plan

## Context

`randomsitesontheweb` is a curated hub of standalone static mini-sites (125 folders under `sites/`), deployed as static files on Vercel. Today the homepage (`index.html`, ~2150 lines) hand-maintains **two** independent site lists:

1. **109 site cards**, grouped into 7 category sections (`Educational`, `Fun & Interactive`, `Tools`, `Games`, `Entertainment`, `Mindfulness`, `Art`), each an `<h2 class="category-title …">` + `<div class="site-grid">` block.
2. **A `const folders = […]` array (73 entries)** in inline JS that powers the weighted-random "surprise me" button.

The two lists have already drifted (73 vs 109), and neither covers all 125 site folders. Adding a site means hand-editing HTML in up to two places.

This is Phase 1 of a phased effort:

- **Phase 1 (this spec):** `catalog.json` as single source of truth; build-time generation of both the card sections and the `folders[]` array. Does not touch the 125 site files.
- **Phase 2 (future):** shared per-site wrapper template; migrate the mini-sites onto it. Higher risk; deferred.
- **Phase 3 (future):** open-counts, then thumbs up/down, keyed by catalog slugs (serverless + KV).

## Decisions made during design

- **High-level categories only.** The hand-written per-card sub-category labels (e.g. `Entertainment • Existential`) and multi-token `data-categories` are **dropped**. Each site belongs to exactly one of the 7 high-level sections; the card's `data-categories` and display label both come from that section. (User decision — the old labels were inconsistent and unmaintained.)
- **Unify the random pool.** `folders[]` is generated from the catalog via a per-site `random` flag, ending the drift permanently.
- **Icons deferred.** `icon` field reserved in schema, not rendered.
- **Generated `index.html` is committed** (reviewable diffs; carries a "generated — do not edit" banner).
- **`vercel.json` is NOT touched in Phase 1.** The deploy config is a working, hard-to-test custom setup; the build runs locally (`npm run build`) and the committed `index.html` deploys exactly as today. Vercel-side build integration can come later if ever needed.

## Goals

- One `catalog.json` drives the card sections, the random pool, and the site count.
- `visible: true | false` per site hides catalogued-but-unpublished sites.
- `random: true | false` per site controls random-button pool membership (independent of `visible`, to faithfully preserve current behavior where the two lists disagree).
- Catalog contains **all** folders under `sites/` — including ones currently listed nowhere (imported as `visible: false, random: false`).
- Generated homepage is structurally identical to today: same sections, same cards in the same order, same random pool.
- `.claude/commands/add-to-index.md` rewritten to append to `catalog.json` + rebuild; `.claude/commands/new-site.md` step 3 (card insertion) redirected to the same flow.

## Non-Goals

- Per-site wrapper / touching site files (Phase 2). The `in_progress/` folder is also left alone; its sites can be moved to `sites/` + catalogued `visible:false` later.
- Open counts / thumbs / any backend (Phase 3).
- Rendering icons; homepage redesign; changes to hero/filter/sort JS beyond what generation requires.
- Preserving the old sub-category labels or multi-token `data-categories`.

## Architecture

```
catalog.json ──┐
               ├─→ scripts/build.js ─→ index.html (generated, committed)
templates/home.html ─┘
```

- **`catalog.json`** — source of truth: `{ sections: [...], sites: [...] }`.
- **`templates/home.html`** — today's `index.html` with two placeholders: `{{SECTIONS}}` (replaces the seven section blocks) and `{{FOLDERS}}` (replaces the `folders[]` array literal body). All CSS/hero/filter/sort/history JS stays verbatim in the template.
- **`scripts/build.js`** — validates the catalog, renders sections + folders, injects into the template, writes `index.html`. Fails loudly on any invalid entry; never writes partial output.
- **`scripts/migrate.js`** — one-time scraper: parses the current `index.html` (cards per section, folders array), scans `sites/`, unions the three sources into the initial `catalog.json`, and extracts `templates/home.html`. Kept in-repo for reference; also exports its parsers for migration verification.

### `catalog.json` schema

```json
{
  "sections": [
    { "key": "educational", "title": "Educational" },
    { "key": "fun", "title": "Fun & Interactive" },
    { "key": "tools", "title": "Tools" },
    { "key": "games", "title": "Games" },
    { "key": "entertainment", "title": "Entertainment" },
    { "key": "mindfulness", "title": "Mindfulness" },
    { "key": "art", "title": "Art" }
  ],
  "sites": [
    {
      "slug": "prefixsuffix",
      "name": "Prefix & Suffix",
      "description": "Generate and practice prefixes and suffixes",
      "section": "educational",
      "visible": true,
      "random": true,
      "icon": null
    }
  ]
}
```

| Field | Type | Rules |
|---|---|---|
| `slug` | string | Unique, matches `^[a-z0-9-]+$` (case-insensitive). Card `href` is `{slug}/` (homepage JS prefixes `/sites/` at runtime). Future counts key. |
| `name` | string | Required. Card `<h2>`. HTML-escaped on output. |
| `description` | string | Required non-empty when `visible: true`. Card `<p>`. |
| `section` | string | Must equal a `sections[].key`. Determines grid placement, `data-categories`, and display label. |
| `visible` | boolean | `false` → no card rendered. |
| `random` | boolean | `true` → included in generated `folders[]` as `'/{slug}/'`. Independent of `visible`. |
| `icon` | string \| null | Reserved; unrendered in Phase 1. |

Array order = render order (cards within a section; folders overall). Section order = `sections` array order.

### Generated card markup

```html
<div class="site-card" data-categories="{section.key}">
    <a href="{slug}/">
        <h2>{name}</h2>
        <p>{description}</p>
        <div class="category">{section.title}</div>
    </a>
</div>
```

Each section renders as today: `<!-- {Title} Section -->` comment, `<h2 class="category-title {key}">{title}</h2>`, `<div class="site-grid">…cards…</div>`.

### Generated folders block

```js
const folders = [
    '/{slug}/',   // one per site with random: true, catalog order
];
```

Entry format `'/{slug}/'` is preserved exactly so existing `localStorage` weight keys (`weight_/pi/`) keep working. Order changes from today's list are fine — selection is weighted-random.

## Migration (one-time, verified)

1. Parse the 7 section blocks from current `index.html` → sites with `section` = containing section (positional, NOT the old `data-categories`), `visible: true`, entities decoded.
2. Parse `folders[]` → set `random: true` on matching slugs.
3. Entries in `folders[]` but not carded → added `visible: false, random: true` (name = slug, description = "").
4. Folders under `sites/` in neither list → added `visible: false, random: false`.
5. Extract `templates/home.html` (sections region → `{{SECTIONS}}`, folders literal body → `{{FOLDERS}}`, banner comment inserted after doctype).
6. Rebuild and **verify structurally** (byte-identity is impossible now that labels are simplified): same slugs in the same order per section, identical random-pool slug set, using the same parsers on old vs. new HTML.

## Error handling

- `build.js` validation failures (duplicate/invalid slug, unknown section, missing name, visible entry with empty description, non-boolean flags) → throw with the offending slug; no output written.
- Missing `{{SECTIONS}}` or `{{FOLDERS}}` placeholder → hard error.
- `migrate.js` warns on any card href not matching `^[^/]+/$` and on any parse-count anomaly.

## Testing / verification

- Unit tests (`node --test`, zero new dependencies) for rendering, validation, and template injection.
- Migration verification: structural diff (per-section slug lists, random-pool set) between pre- and post-migration HTML.
- Behavioral checks: `visible: false` removes exactly that card; adding a valid entry + build yields a correct card; malformed entry fails the build with a clear message.

## Skill updates

- **`add-to-index`**: append entry to `catalog.json` (validate section key, default `visible: true, random: true, icon: null`), run `npm run build`, show diff. Never edit `index.html`.
- **`new-site`**: only step 3 changes — card insertion is replaced by the same catalog-append + build flow. Site-creation guidance untouched (Phase 2 will revisit).
