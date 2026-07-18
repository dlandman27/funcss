# Site Style

The design language for randomsitesontheweb. Load this before building or restyling any site
(`/new-site` and `/refactor-site` should follow it). It exists so every site feels like it came
from the same hand: bold, tactile, a little deadpan.

---

## Volume: loud vs. quiet

The sticker recipe below is the **loud** register — for toys, games, tools, and jokes.
Not every site plays at that volume. **Mindfulness and ambient sites** (breathing
exercises, affirmations, slow tv, noise machines) use the **quiet** register: keep the
ink/paper palette, the Georgia-italic voice, and the deadpan captions so the site still
feels like family — but drop the hard offset shadows, the fat outlines, the crooked
rotations, and Arial Black entirely. Soft radial fills, hairline borders at low opacity,
generous whitespace, slow fades. If the visitor came to calm down, the page should not
shout at them. When in doubt: does the page want a giggle or a deep breath? Giggle →
loud. Breath → quiet.

## The look: "sticker comic"

Everything reads like a sticker slapped on paper — flat color, fat ink outline, hard shadow.

**Palette** (from the homepage `:root`):

| token | hex | use |
|---|---|---|
| ink | `#201a17` | outlines, text, shadows — never pure black |
| paper | `#f2ede2` / cream `#fff8ef` | light backgrounds, text on dark |
| coral | `#f0563e` | primary punch color |
| sky | `#5aa0db` | |
| lime | `#b7ce3c` | |
| purple | `#a98fd0` | |
| orange | `#f47b28` | |
| pink | `#ff7fa5` | |
| teal | `#2fb0a3` | |
| gold | `#f7c948` | rewards, stars, coins, NEW badges |

**The sticker recipe.** Every shape gets: flat color fill + ink outline + hard offset shadow.

CSS chips/pills/buttons:
```css
background: var(--color);
color: #201a17;
border: 2px solid #201a17;      /* the border is non-negotiable */
border-radius: 999px;           /* pills; 10-14px for cards */
box-shadow: 3px 3px 0 #201a17;  /* HARD offset — never a soft blur */
transform: rotate(-6deg);       /* stickers sit crooked */
```

Canvas shapes (the "sticker treatment"):
```js
ctx.save(); ctx.translate(1.5, 1.5); path(ctx); ctx.fillStyle = INK; ctx.fill(); ctx.restore();
path(ctx); ctx.fillStyle = color; ctx.fill();
ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.stroke();
```

**Critical rule: outlines on EVERYTHING.** Pale or white elements are invisible on paper
backgrounds — this has bitten us (invisible lightning). Every particle, dot, ring, and letter
gets an ink outline: rings are double-stroked (ink wide, color narrow), loud text uses
`strokeText` in ink under the fill (or `-webkit-text-stroke` + `paint-order: stroke fill`).

**Typography.** Two voices, used deliberately:
- **LOUD**: `'Arial Black'` / weight 900, uppercase, thick ink stroke, slight rotation —
  comic bursts, badges, scores, stamps.
- **Quiet**: `Georgia, 'Times New Roman', serif`, often italic — hints, plaques, dossiers,
  captions, anything deadpan.

**No emoji in UI or effects.** Icons are hand-drawn on canvas in the sticker style (or Font
Awesome where it's already loaded). Emoji render differently per platform and break the look.

## Motion

- **Pop-in with overshoot**: scale `0.2 → ~1.15 → 1`, fast (300-500ms). Things THUNK in.
- **Hard impacts**: page-shake keyframes (translate jitter, ~0.25s) for explosions/punches.
  Always skip when `prefers-reduced-motion: reduce`.
- **Fade-outs are slow, pop-ins are fast.** Persistent artifacts (paint, stamps) linger
  seconds before dissolving.
- Hover on stickers: `transform: translate(-2px, -2px) rotate(...)` + grow the hard shadow.
  Active: press down (`translate(2px, 2px)`, shrink shadow).

## Feel: effects must DO something

The bar is "why does this exist? I love it." Recolored confetti is failure.

- **Distinct mechanics, never variants.** Each interactive element earns its own verb:
  splat, stack, topple, spin, strike, stamp, filter, shake.
- **Persistence beats sparkle.** Paint stays on the wall, crates stack to 200, stamps linger,
  XP accumulates in localStorage. Let the visitor leave a mark.
- **Physics over tweens** where possible: gravity, bounce, toppling off edges, terminal
  velocity. Cheap sims (grids, particles, boids) are the house specialty.
- **Tactile input.** Prefer hold/drag/shake/sweep to bare clicks: drag-to-paint, grab-and-
  shake with an energy threshold, pour vs drop. Use pointer events + `setPointerCapture` +
  `getCoalescedEvents`, walk the line between samples so fast drags leave no gaps.
- **Secrets.** Low-probability moments (2-6%) with no hint they exist: an eye behind a
  keyhole, a rare answer, a jackpot. Never document them on the page.

## Voice

Deadpan, played completely straight. Museum plaques, lab dossiers, specimen tags, civic
signage. Counters that tell the truth ("maze explored: 0%") or lie politely ("warranty:
void"). Hints are one italic Georgia line ("draw anywhere — it tiles") that fades out after
~10s or on first interaction — never a tutorial.

## Layout patterns

- **Full-bleed canvas** for toys/experiments: no chrome, `overflow: hidden`,
  `user-select: none`, `touch-action: none`, discovery over instruction.
- **Control pill** when controls are needed: one floating rounded bar, bottom-center,
  translucent dark + `backdrop-filter: blur(8px)`, fades to ~12% opacity while the user is
  playing, back on hover.
- **Gallery framing** for generated-art sites: dark wall, radial spotlight, the artifact
  centered with a serif plaque under it.
- Responsive by default: `clamp()` type sizes, `min(px, vw, vh)` for hero objects, works on
  a phone.

## Tech checklist (every site)

- One self-contained `index.html`; first tag in `<head>`:
  `<script defer src="https://randomsitesontheweb.com/globals/global.js"></script>`
- `<meta charset>` + viewport; vanilla HTML/CSS/JS only, no libraries.
- Canvas: cap `devicePixelRatio` at 2; debounced resize handler.
- rAF loops must **sleep when idle** (stop scheduling when nothing animates; restart on
  input) — don't burn battery drawing a still frame.
- Particle engine pattern: one overlay canvas, typed particle kinds in one switch, `push()`
  caps the array and wakes the loop.
- localStorage for tallies/patterns/streaks, always in `try/catch`.
- Deterministic randomness (hash + mulberry32) when content should be stable per day/seed —
  never `Date.now()` styling that pops on reload.
- Register in `catalog.json` with `created`, then `npm run build`.
