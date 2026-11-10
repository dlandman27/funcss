# Card banners

Wide homepage banners in the spirit of neal.fun: every card shares one frame,
but the inside of each banner is drawn in **that site's own visual language**:
its fonts, colors and signature UI (a checkbox, a terminal, a TV screen…).

- Source: `banners/<slug>.html`, one standalone file per site
- Output: `public/site-banners/<slug>.webp` (800×300) and `<slug>-400.webp`
- Render: `npm run banners` (headless Chrome). Only stale files re-render; pass a slug to force one.
- The homepage uses a banner when its `.webp` exists, else falls back to the square art.

## The file

```html
<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<!-- optional: Google Fonts the site itself uses -->
<link rel="stylesheet" href="_frame.css">
<style>
  .b { background: #000; color: #fff; font-family: 'Courier New', monospace; }
  .b .word { font-size: 15cqi; }
</style></head>
<body><div class="b">
  <div class="word">PONG</div>
</div></body></html>
```

`_frame.css` sizes `.b` to 800×300, centers its children, clips overflow and
makes it a size container, so **`1cqi` = 8px**. Size things in `cqi`.

## Rules

1. **Look at the site first.** Read `sites/<slug>/index.html`. Use its real
   `font-family`, its colors, its background, and borrow one signature element
   of its UI or its core mechanic. The banner should look like a logo for *that*
   site and nothing else. Don't fall back to the house sticker style (Fredoka,
   cream-on-orange, Arial Black with offset shadows) unless the site really looks like that.
   - If the site *is* in the house style (Georgia + Arial Black + cream `#fff8ef` / orange `#f47b28`),
     draw from what it's *about* instead: the object, the mechanic, the mood.
2. **The title is the hero.** Show the site's name (as in `catalog.json`), spelled exactly,
   large and legible at 380px wide (≥ 9cqi for short names, ≥ 6.5cqi for long ones).
   One short tagline at most. No other words.
3. **Restraint.** One idea per banner. Plenty of empty space is good. Not every
   banner should be loud: calm sites get calm banners.
4. **Vary it.** Different fonts, palettes and layouts across banners: light
   backgrounds as often as dark ones; left-aligned, centered, split.
5. **Still first, alive on hover.** The card image is a screenshot with every
   CSS animation frozen on its first frame (`_frame.css`), so the 0% state must
   look complete; never start from opacity 0. On hover the homepage loads the
   file with `?live` and animations play. Give each banner **one** small loop that
   acts out the site's mechanic: a cursor blinking, a ball bouncing, a checkbox
   ticking, letters shuffling. Script loops must check `LIVE` (set by `_frame.js`)
   and only keep running when it's true; draw the still frame either way.
   Keep it subtle and cheap (CSS transforms/opacity, small canvases).
6. **No outer border, no rounded corners**: the homepage card supplies the frame.
   Keep important content ≥ 3cqi from the edges.
7. **Self-contained.** Only Google Fonts (`&display=block`) and inline CSS/JS/SVG.
   No image files: banners render from `file://`, so draw everything with CSS/SVG/canvas.
   No emoji as the main visual (they render inconsistently); small accents OK.

## Workflow

```sh
node scripts/render-banners.js <slug> [slug…]           # render (forced) to public/site-banners/
node scripts/banner-sheet.js /tmp/sheet.jpg <slug> […]   # contact sheet, 3 across at card size
```

Look at the contact sheet at card size and fix anything illegible, clipped,
misspelled, or too similar to its neighbours.
