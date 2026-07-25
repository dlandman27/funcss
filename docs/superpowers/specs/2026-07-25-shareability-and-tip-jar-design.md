# Shareability + Tip Jar — Design

**Date:** 2026-07-25
**Site:** randomsitesontheweb.com (~149 mini interactive toys/games)
**Goal:** Make the site more shareable and stickier to grow traffic, and add a zero-friction way to earn — a "growth-first" pass.

## Context & Rationale

- Traffic is small-but-real (~900 users / ~10K views last month). At that scale display ads
  earn ~$5–30/mo **and** degrade the experience, so ads are explicitly **out of scope**.
  The lever that unlocks future monetization is growing the audience.
- Every toy already loads `globals/global.js` from the CDN — a single site-wide injection
  point for runtime behavior across all 149 toys.
- The biggest shareability gap: toys have `<title>` + `<meta description>` but **no Open
  Graph / Twitter tags and no preview image**. Shared toy links unfurl as bare URLs.
- Open Graph tags must exist in **static HTML** (social crawlers don't run JS), so meta
  injection happens at **build time**. Interactive affordances (share/shuffle/tip) go in
  `global.js` at **runtime**.

## Scope

In scope:
1. Per-toy + home Open Graph / Twitter meta (build-time).
2. Dynamic branded OG card endpoint.
3. Universal corner control (Share / Shuffle / Home) via `global.js`.
4. Ko-fi tip jar (home footer + corner overflow).
5. Home page "share this collection" nudge.

Out of scope: display ads, premium tier, per-toy result-sharing (possible future), any
redesign of individual toys.

## Components

### 1. Build-time OG/Twitter meta injection (`scripts/build.js`)

`build.js` already generates `index.html` from `catalog.json` + `templates/home.html`. Extend
it to also **inject a canonical block of social meta** into every visible toy's
`sites/<slug>/index.html` `<head>`, sourced from `catalog.json` (name, description, slug).

- Injected tags per toy: `og:type`, `og:url` (`https://randomsitesontheweb.com/sites/<slug>/`),
  `og:title` (toy name), `og:description` (toy description), `og:image`
  (`https://randomsitesontheweb.com/api/og?slug=<slug>`), plus the `twitter:card=summary_large_image`
  mirror and `twitter:image`.
- **Idempotent:** wrap the injected block in HTML comment markers
  (`<!-- rsotw:og:start -->` … `<!-- rsotw:og:end -->`). On each build, replace the block if
  present, else insert it right after `<meta name="description">` (or after `<title>` if no
  description). Never double-inject.
- Home page (`templates/home.html`) already has OG tags — keep them, but **update its
  `og:image`/`twitter:image` to `https://randomsitesontheweb.com/api/og`** (the no-slug
  collection card from §2) so the home preview is generated from the same source and can't
  point at a stale/missing static file.
- Validation: build fails loudly if a visible toy is missing name/description (existing
  `validateCatalog` already enforces this).

**Interface:** input = `catalog.json` + toy HTML files on disk; output = same toy HTML with a
managed OG block. Pure function `injectOgBlock(html, site)` → html, unit-testable in isolation.

### 2. Dynamic branded OG card (`api/og.js`, using `@vercel/og`)

A Vercel edge function that renders a 1200×630 branded card.

- `GET /api/og?slug=<slug>` → card showing the toy **name** (large), **tagline/description**
  (smaller), and the `randomsitesontheweb.com` wordmark, on the site's paper/orange theme
  (`--paper #f5ecd6`, `--orange #f47b28`, `--ink #201a17`; Fredoka/Nunito styling approximated
  with system-safe or embedded fonts).
- `GET /api/og` (no slug) → generic "collection" card for the home page.
- Unknown slug → fall back to the collection card (never error a preview).
- Reads name/description from `catalog.json` (bundled with the function).
- Long-cache headers (`Cache-Control: public, immutable, max-age=…`) since cards only change
  when a toy's catalog entry changes; a deploy busts the cache.

**Interface:** input = `slug` query param; output = PNG image response. Depends on `@vercel/og`
and `catalog.json`.

### 3. Universal corner control (`globals/global.js`)

Extend `global.js` (loaded on every toy) to render a small, unobtrusive corner control cluster.
Runs **only on `/sites/<slug>/` pages** (reuse the existing pathname check already in the file),
never on the home page.

- **Share:** on tap, use `navigator.share({ title, url })` where supported (mobile); otherwise
  copy the toy URL to clipboard and show a small toast ("Link copied"). Shares the current toy's
  canonical URL.
- **Shuffle:** jump to a random toy. Fetch `/catalog.json` once (it's already public at root),
  pick a random entry where `visible && random`, excluding the current slug, and navigate to it.
  Fail silently if the fetch fails (button just does nothing / hides).
- **Home:** link to `https://randomsitesontheweb.com` (mirrors the existing `Home` key shortcut).
- **Overflow:** a small "☕ Support" link to Ko-fi (see §4) tucked into the cluster so it's
  available but not in the way.
- **Design constraints:** fixed-position, small, high-contrast-on-any-background (semi-transparent
  chip with its own background so it survives on light/dark toys), respects `prefers-reduced-motion`,
  keyboard-focusable, `z-index` high enough to sit above toy UI, and must **not** capture pointer
  events outside its own bounds. All styles scoped/inlined to avoid clobbering toy CSS.
- Must **never throw** — wrap in try/catch like the existing analytics block; a broken control
  must not break a toy.

**Interface:** self-contained IIFE appended to `global.js`; depends only on the DOM,
`navigator.share`/clipboard, and `/catalog.json`.

### 4. Ko-fi tip jar

- A single Ko-fi URL constant (placeholder `https://ko-fi.com/<handle>` — owner fills in).
- Surfaces: (a) home page footer — a clear but calm "Enjoying these? Buy me a coffee ☕" link;
  (b) the corner control overflow on toys (§3). No modals, no interstitials.

### 5. Home page share nudge (`templates/home.html`)

Add a visible "Share this collection" control near the top/hero that copies
`https://randomsitesontheweb.com` (or invokes Web Share on mobile) with a toast. Keeps the
home page as the primary shareable entry point.

## Data Flow

```
catalog.json ──build.js──> toy HTML <head> gets managed OG block (og:image → /api/og?slug=X)
                    └────> home index.html (existing OG, verified)

social crawler ──GET /sites/<slug>/──> reads og:image ──GET /api/og?slug=X──> @vercel/og
                    renders branded PNG from catalog.json  ──> rich unfurl

user on a toy ──global.js──> corner control: Share (Web Share/clipboard),
                    Shuffle (fetch /catalog.json → random toy), Home, Ko-fi
```

## Error Handling

- **build.js:** fails loudly on catalog validation errors (existing behavior). OG injection is
  idempotent and must not corrupt existing HTML; if a toy file is missing, skip with a warning.
- **/api/og:** unknown/missing slug → collection card, never a 4xx that breaks a preview;
  internal errors → still return a valid fallback image if feasible.
- **global.js:** every new block wrapped in try/catch; failures are silent and never break a toy.
  Shuffle fetch failure → control degrades gracefully.

## Testing

- **Unit (node:test, existing `tests/` runner):** `injectOgBlock` — inserts when absent, replaces
  when present (idempotent), positions correctly, escapes values, leaves unrelated HTML intact.
- **Build integration:** run `npm run build` on a fixture catalog + toy files; assert every visible
  toy ends with exactly one managed OG block pointing at the right `og:image` URL.
- **/api/og:** smoke test that a known slug and the no-slug case each return an image response with
  the right content-type; unknown slug returns the collection card.
- **global.js:** manual/visual check on a light toy and a dark toy (contrast, no layout clash),
  Share copy fallback on desktop, Web Share on mobile, Shuffle navigates and excludes current slug.
- **Manual unfurl check:** validate a toy URL in a link-preview debugger (e.g. opengraph.xyz)
  after deploy.

## Rollout / Sequencing

1. `injectOgBlock` + build wiring + tests (biggest win, no runtime dep).
2. `/api/og` endpoint + `@vercel/og`.
3. `global.js` corner control (Share, Shuffle, Home).
4. Ko-fi tip jar + home share nudge.

Each step is independently shippable; the OG meta + card together are the core of the pass.
```