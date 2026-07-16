# Catalog + Homepage Generation (Phase 1)

**Date:** 2026-07-16
**Status:** Approved — ready for implementation plan

## Context

`randomsitesontheweb` is a curated hub of 125 standalone static mini-sites, deployed as static files on Vercel. Today the homepage (`index.html`, ~99 KB) hardcodes all 125 site cards as inline `<a>` blocks, and the site count is derived by looping over that markup. Adding or editing a site means hand-editing the monolithic HTML.

This is Phase 1 of a larger, phased effort to make the catalog data-driven:

- **Phase 1 (this spec):** Introduce `catalog.json` as the single source of truth and generate the homepage card grid from it at build time. Low risk — does not touch the 125 site files.
- **Phase 2 (future):** Per-site wrapper template — a shared shell (head, meta, favicon, fonts, `global.js`, home-nav) that every mini-site inherits, migrating the existing 125 full HTML documents onto it. Higher risk; deliberately deferred.
- **Phase 3 (future):** Open-counts, then thumbs up/down — runtime engagement numbers keyed by catalog slugs, backed by a Vercel serverless function + KV store.

Each phase gets its own spec → plan → implementation cycle.

## Goals (Phase 1)

- One `catalog.json` is the single source of truth for the site listing.
- The homepage card grid is **generated** from `catalog.json`, not hand-written.
- Site count comes from `catalog.length`, not markup traversal.
- A `visible: true | false` flag hides catalogued-but-unpublished sites (subsumes the `in_progress/` concept).
- The generated `index.html` keeps all cards baked in — SEO/crawlability unchanged from today.
- The `add-to-index` skill is updated to append to `catalog.json` and rebuild, instead of editing HTML.

## Non-Goals (Phase 1)

- **Per-site wrapper** and touching the 125 site files — Phase 2.
- **Open counts / thumbs** and any backend/serverless/KV — Phase 3.
- **Card icons** — the `icon` field exists in the schema but is not rendered; Phase 1 output is visually identical to today.
- Any redesign of the homepage hero, filters, CSS, or JS.

## Architecture

Three artifacts replace the hardcoded grid:

1. **`catalog.json`** — ordered array of site records (source of truth).
2. **`templates/home.html`** — the current `index.html` verbatim, except the 125-card block is replaced by a single `{{cards}}` placeholder. All inline CSS, hero, category filters, and JS remain untouched.
3. **`scripts/build.js`** — Node script: read `catalog.json` → render a card per `visible: true` entry → inject into the template → write `index.html`.

Data flow:

```
catalog.json ─┐
              ├─→ scripts/build.js ─→ index.html (generated artifact, committed)
templates/home.html ─┘
```

`index.html` becomes a generated build artifact. The developer edits `catalog.json` and `templates/home.html`; `index.html` is never hand-edited (it carries a "generated — do not edit" banner comment at the top). The build runs both locally (`npm run build`) and on Vercel at deploy time.

### `catalog.json` schema

Ordered array; array order == render order. Each entry:

```json
{
  "slug": "morse-code",
  "name": "Morse Code Sandbox",
  "description": "Learn and Practice Morse Code!",
  "categories": ["educational", "development"],
  "visible": true,
  "icon": null
}
```

| Field | Type | Notes |
|---|---|---|
| `slug` | string | Card `href` (`morse-code/`). Unique. Future counts/thumbs key. |
| `name` | string | Card `<h2>`. |
| `description` | string | Card `<p>`. |
| `categories` | string[] | Lowercase tokens. Build derives **both** `data-categories="educational development"` **and** the display line `Educational • Development` (title-case, joined with ` • `). Removes today's duplication. |
| `visible` | boolean | `false` → excluded from the generated grid but still catalogued. |
| `icon` | string \| null | Reserved. Not rendered in Phase 1. |

### Card rendering

The build renders each visible entry to the exact card markup used today:

```html
<div class="site-card" data-categories="{categories joined by space}">
    <a href="{slug}/">
        <h2>{name}</h2>
        <p>{description}</p>
        <div class="category">{Title-cased categories joined by " • "}</div>
    </a>
</div>
```

HTML-escape `name` and `description` on output.

### Build / deploy integration

- `package.json` gains a `build` script (`node scripts/build.js`).
- Vercel runs the build on deploy. `vercel.json` is updated so the deploy runs the build command and serves the generated `index.html` (the current `builds` block that pins pure-static must be reconciled with running a build step).
- The generated `index.html` is **committed** to the repo (reviewable diffs; Vercel serves it directly). The build overwrites it on deploy.

## Migration (one-time, automated, verified)

1. A scrape script parses the 125 existing cards out of the current `index.html` (`slug` from `href`, `name` from `<h2>`, `description` from `<p>`, `categories` from `data-categories`) → produces the initial `catalog.json`, preserving current order, all `visible: true`, `icon: null`.
2. Extract the static shell into `templates/home.html` with the `{{cards}}` placeholder where the grid was.
3. Regenerate `index.html` from `catalog.json` + template and **diff against the original**. Target: identical modulo insignificant whitespace/formatting. Any real difference is investigated before the pipeline is trusted.

## Skill update — `add-to-index`

Rewrite the `add-to-index` skill so "add a site to the homepage" means:
1. Append an entry to `catalog.json` (prompt for/derive `slug`, `name`, `description`, `categories`; default `visible: true`, `icon: null`).
2. Run `npm run build`.
3. Show the resulting card diff.

It must no longer instruct hand-editing `index.html`. (`new-site` skill is left for Phase 2, where the per-site wrapper lands.)

## Error handling

- `build.js` validates each entry: required fields present, `slug` unique and URL-safe, `categories` non-empty array. On violation, fail loudly with the offending slug — do not emit a partial `index.html`.
- Missing `{{cards}}` placeholder in the template → hard error.
- `visible` defaults to `true` if omitted (but the schema/skill always writes it explicitly).

## Testing / verification

- **Faithfulness:** regenerated `index.html` diffs clean against the pre-migration original.
- **Visibility:** flipping an entry to `visible: false` removes exactly that card; count drops by one.
- **Add:** appending a valid entry + build produces a correct, well-formed card in the right position.
- **Count:** the "number of sites" reflects `catalog` (visible entries) with no markup traversal.
- **Validation:** a malformed entry (duplicate slug, empty categories) fails the build with a clear message and writes no output.

## Open questions

None blocking. Icons and the generated-file commit policy were decided (deferred; committed).
