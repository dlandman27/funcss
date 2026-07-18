# Site Votes — thumbs up/down on homepage cards (Phase 3b)

**Date:** 2026-07-18
**Status:** Approved — ready for implementation plan

## Context

Play counts (Phase 3a) shipped 2026-07-18: Upstash Redis (`plays` hash keyed by catalog slug), zero-config Vercel functions (`api/hit.js`, `api/counts.js`), homepage badges. This spec adds the second engagement signal from the Phase 3 roadmap: per-site thumbs up/down.

Decisions made during brainstorming (user choices):

- **Votes only this round.** Per-site comment threads and emoji reactions were raised and deliberately parked as separate future projects (comments need a moderation design; emoji reactions were declined for now).
- **Voting happens on the homepage cards**, not on the mini-sites themselves. No `globals/global.js` changes — zero risk to the ~130 live sites.
- **One vote per browser per site, changeable** (Reddit-style): tap 👍 or 👎; tapping the same again removes the vote; tapping the other flips it. Identity = `localStorage` (no accounts).
- **Display both counts** (`👍 14 · 👎 2`), not net score or percentage. The buttons themselves are the display.

## Goals

- Anyone browsing the homepage can vote a site up or down from its card and see the tallies.
- Vote state survives reloads in the same browser and can be changed at any time.
- Tallies are exact under vote-change flows (up→down, up→none, etc.).

## Non-Goals

- Comments/threads, emoji reactions (future specs).
- Server-side one-person-one-vote enforcement. We trust the client's `prev` claim — same abuse posture accepted for play counts (a curl loop can fake votes; acceptable for this site).
- Sorting the homepage by votes; vote widgets on the mini-sites; seeding (votes start at 0 — no historical source exists).

## Architecture

Same stack as play counts. New pieces only:

```
card buttons ──POST /api/vote?slug&prev&next──▶ api/vote.js ──HINCRBY──▶ Upstash hashes votes:up / votes:down
homepage load ──GET /api/votes──▶ api/votes.js ──HGETALL×2──▶ same hashes
```

### Data model

Two Redis hashes, exactly parallel to `plays`:

- `votes:up`  — field = lowercased catalog slug, value = integer ≥ 0
- `votes:down` — same

### `POST /api/vote?slug=<slug>&prev=<state>&next=<state>`

- `slug`: lowercased, must be in `catalog.json` (same allowlist pattern as `api/hit.js`).
- `prev`, `next`: each one of `none | up | down`; `prev !== next` required.
- Effect (deltas): leaving a state decrements its hash, entering a state increments it. `none` touches nothing. E.g. `prev=up&next=down` → `HINCRBY votes:up <slug> -1`, `HINCRBY votes:down <slug> 1`.
- Decrements floor at 0: if a decrement would take a field negative (client lied or state drifted), reset that field to 0 (`HSET` after checking the `HINCRBY` result).
- Response `200 {"slug","up","down"}` with the site's fresh tallies: one Upstash `/pipeline` call carries the delta `HINCRBY`s followed by `HGET votes:up <slug>` and `HGET votes:down <slug>`; the two `HGET` results (null → 0) are what's returned.
- Errors: non-POST → 405; invalid slug / invalid or equal states → 400; Redis failure → 502 with `console.error` logging. All match the established endpoint conventions.

### `GET /api/votes`

- Returns `200 {"<slug>": {"up": n, "down": n}, ...}` — only slugs with at least one nonzero tally need appear; missing slug = zero votes.
- `Cache-Control: s-maxage=60, stale-while-revalidate=300` (same as `/api/counts`).
- Non-GET → 405; Redis failure → 502 (logged).
- Implementation: `HGETALL votes:up` + `HGETALL votes:down` via one Upstash `/pipeline` POST (extend `api/_redis.js` with a `pipeline(commands)` helper alongside `redis(command)`).

## Homepage UI

- A vote row at the bottom of each card (below the description, in the card's text area): two chip buttons styled to the site's hard-border/hard-shadow sticker language, colored neutrally until selected.
- Button label: emoji + count (`👍 14`); the count is omitted while 0 (`👍`). Buttons always visible.
- The user's current vote (from `localStorage`) renders "pressed" (filled background, e.g. lime for up / coral for down).
- The whole card is an `<a>` — the buttons call `preventDefault()` and `stopPropagation()` on click so voting never navigates.
- Voting is optimistic: update button states/counts immediately from the POST response. No fetch on localhost/dev → buttons render with zero counts and clicking silently no-ops on the POST failure (`.catch`), same graceful degradation as counts.
- Reduced motion: no new animation beyond the existing hover conventions; respect `prefers-reduced-motion` if any transition is added.

## Client logic

- `localStorage.vote_<slug>` ∈ `up | down` (absent = none).
- Click handler computes `prev` (from storage) and `next` (toggle/flip semantics), writes storage first, then fires the POST; on POST success, update counts from response. On failure, keep local state (it'll re-sync visually on next successful load).
- On page load: `GET /api/votes` hydrates counts; `localStorage` hydrates pressed states. Slug derivation from card hrefs mirrors the play-counts code.

## Testing

- `tests/api.test.js` additions using the existing `stubFetch`/`mockReq`/`mockRes` helpers: vote deltas for all six valid `prev→next` transitions, floor-at-zero behavior, validation rejections (bad slug, bad state, `prev === next`, non-POST), votes GET shape + cache header + 405/502.
- `tests/build.test.js`: generated homepage contains the votes fetch and vote-row markup hook.
- Manual: local server (`app.js` gains the two routes like the existing ones) lets Dylan click-test against the real database.

## Deploy

Zero-config Vercel picks up `api/vote.js` and `api/votes.js` automatically (no vercel.json edits — file was removed). Note: production domain cutover from Netlify to Vercel is in progress as of this writing; votes work wherever the counts API works.
