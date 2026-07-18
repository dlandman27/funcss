# Refactor Site

Overhaul an existing site — rename it, rewrite the page, recategorize it — and keep
the catalog in sync. Use when a site's catalog entry doesn't match what the page
actually does, when a page needs a redesign, or during a site-by-site cleanup pass.

## Usage
`/refactor-site <folder-name> [what to change]`

Example: `/refactor-site prefixsuffix rename to "The Longest Name" and make the name buildable`

---

## What to do

1. **Read the current state first.** Read `sites/<folder-name>/index.html` AND the
   site's entry in `catalog.json`. Compare them — the most common problem is a catalog
   name/description that doesn't match what the page actually does. Report the mismatch
   to the user before changing anything if they haven't already described the change.

2. **Update the catalog entry** in `catalog.json` (never edit `index.html` at the repo
   root by hand — it is generated):
   - `name` and `description` must describe what the page ACTUALLY does after the refactor
   - `section` must fit the new content: `educational`, `fun`, `tools`, `games`,
     `entertainment`, `mindfulness`, `art`
   - Keep the `slug` unchanged — it is the folder name and the live URL; renaming the
     site does NOT mean renaming the folder
   - `random: true` only if the site works with zero instructions when a visitor lands
     on it cold

3. **Rewrite the page** at `sites/<folder-name>/index.html`, following the same rules
   as `/new-site`:
   - First tag in `<head>` must be: `<script defer src="https://randomsitesontheweb.com/globals/global.js"></script>`
     (older sites are missing it — always add it during a refactor)
   - Include `<meta charset="UTF-8">` and `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
   - `<title>` must match the new catalog `name`
   - Vanilla HTML + CSS + JS only, fully self-contained in one file, no CDN imports
   - Responsive — must look good on mobile
   - **Read `.claude/commands/site-style.md` first and follow it** — the sticker-comic design
     language, interaction feel, voice, and tech checklist for every site
   - **Match the intensity to the site's purpose.** Not every site gets the full sticker
     treatment. Toys, games, and tools get the loud recipe (hard shadows, crooked pills,
     Arial Black). Mindfulness and ambient sites (breathing, affirmations, slow tv, noise)
     stay QUIET: same ink/paper palette and serif voice so they feel related, but soft
     edges, muted color, no hard offset shadows, no shouting type. See "Volume" in
     site-style.md.
   - Prefer interactive over static — if the old page was a wall of text, give it a toy

4. **Run `npm run build`** — regenerates `index.html` from the catalog and validates
   the entry.

5. **Verify**: grep the generated `index.html` for the new name to confirm the card
   updated, and open `sites/<folder-name>/index.html` in a browser (or ask the user to)
   to confirm the page works.

6. **Tell the user** what changed: old name → new name, section moves, and what the
   page now does.
