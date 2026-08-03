# Game icons

How to draw an icon for a game or toy, in the randomsitesontheweb house style
(see the `site-style` skill for the wider design language).

Icons are **hand-authored SVG**, not generated images. For geometric subjects — boards,
grids, discs, tiles, pieces — this is faster than a generation round trip and strictly
better: exact palette hexes, real transparency, true circles, one file that serves 24px
and 512px, and a few hundred bytes on the wire. Image models fight you on every one of
those. Reach for generation only when the subject is genuinely illustrative; see
[When to generate instead](#when-to-generate-instead).

Reference implementations: `icons/simon.svg`, `icons/tic-tac-toe.svg`.

## The canvas

```
viewBox="0 0 100 100"
```

Always 100×100, no exceptions — it makes every measurement below portable between icons
and keeps stroke weights consistent across the set.

| | value | notes |
|---|---|---|
| Live area | `12` to `88` | 12 units of padding on all sides |
| Center | `50, 50` | |
| Outer circle radius | `38` | fills the live area |
| 3×3 grid lines | `37.3` and `62.7` | |
| 3×3 cell centers | `24.65`, `50`, `75.35` | cell size 25.33 |

The padding is not decorative. Strokes are centered on their path, so a 5-wide stroke on
the live-area boundary already spills 2.5 units past it, and round caps add another 2.5.
Twelve units absorbs that and leaves the mark from touching the frame.

## Stroke weights

| role | ink | color | example |
|---|---|---|---|
| Structure — grid lines, rims, board edges | 5 | — | the Simon rim, the tic-tac-toe hash |
| Player marks — X, O, pieces | 10 | 6 | the X in tic-tac-toe |
| Thin rings | 9 | 5 | the O in tic-tac-toe |
| Overlay — strike lines, slashes | 9 | 6 | the winning strike |

**Color stroke = ink stroke − 4.** That leaves 2 units of ink on each side, which is what
makes the mark read at 24px. Deviating from this is how a set stops looking like a set.

## The double-stroke rule

Colored strokes are drawn *twice*: a wider ink stroke first, the color on top. This is the
`site-style` rule that pale shapes need an ink outline, applied to strokes rather than
fills.

```xml
<circle cx="24.65" cy="24.65" r="7" fill="none" stroke="#201a17" stroke-width="9"/>
<circle cx="24.65" cy="24.65" r="7" fill="none" stroke="#5aa0db" stroke-width="5"/>
```

Same geometry, twice, ink first. Filled shapes are simpler — fill flat, then stroke ink
at weight 5.

## Layer order

Draw back to front:

1. **Structure** — the board, grid, rim. Ink.
2. **Fills** — quadrants, cells, colored regions.
3. **Marks** — pieces, X and O, discs. Double-stroked.
4. **Overlay** — anything that sits *on top of* the game state: a winning strike, a
   crossed-out square.

The overlay layer matters. A strike line drawn before the marks reads as part of the
board; drawn after, it reads as an event that happened to the board.

## Palette

Only these. Copy the hexes, never eyeball them.

| token | hex |
|---|---|
| ink | `#201a17` |
| cream | `#fff8ef` |
| coral | `#f0563e` |
| sky | `#5aa0db` |
| lime | `#b7ce3c` |
| purple | `#a98fd0` |
| orange | `#f47b28` |
| pink | `#ff7fa5` |
| teal | `#2fb0a3` |
| gold | `#f7c948` |

Three fill colors per icon, plus ink. More than three and the set stops cohering when the
icons sit next to each other on the homepage. The exception is a game whose identity *is*
its colors — Simon's four quadrants.

Reserve **gold** for outcome: wins, strikes, stars, scores. It reads as "something
happened here" precisely because it isn't used for ordinary structure.

## What never goes in the file

The sticker treatment is CSS. Bake any of it into the SVG and it double-renders against
the container, or locks you out of changing the container later.

```css
.icon-sticker {
  background: var(--paper-cream);
  border: 2px solid #201a17;
  border-radius: 14px;
  box-shadow: 3px 3px 0 #201a17;
  transform: rotate(-6deg);
}
```

So the SVG contains **no** drop shadow, **no** die-cut border or outer ring, **no**
rotation, **no** background rect, and **no** `width`/`height` that can't be overridden.

## Composition

- **Five or six distinct shapes.** Repeating patterns (a 3×3 dot grid) count as one.
- **One idea, one event.** A piece mid-drop, a row struck through, a lit quadrant. Two
  events and the icon stops reading at small sizes.
- **Flat and head-on.** No perspective, no isometric angle, no depth. Everything is
  face-forward.
- **Exact geometry.** True circles, right angles, even spacing. Nothing wobbly.
- **Watch parallel strokes.** A diagonal strike running along the arm of an X will merge
  with it. Fix by lengthening the mark and thinning the overlay so the mark's tips stay
  visible past it — that's why the strike is 9/6 rather than the 10/6 used for marks.

## Arc cheatsheet

For pie wedges and ring segments. Point at angle θ (degrees, `0` = east, increasing
clockwise because SVG's y axis points down):

```
x = 50 + r * cos(θ)
y = 50 + r * sin(θ)
```

Quadrant wedge from center, clockwise (Simon):

```xml
<path d="M50,50 L50,12 A38,38 0 0,1 88,50 Z" fill="#5aa0db"/>
```

Ring segment between inner radius `r1` and outer `r2`, from θ1 to θ2 (the gapped variant
in `icons/simon-flat.svg`):

```
M (r1,θ1) L (r2,θ1) A r2 r2 0 0,1 (r2,θ2) L (r1,θ2) A r1 r1 0 0,0 (r1,θ1) Z
```

Sweep flag `1` goes clockwise on screen, `0` counter-clockwise. Leave the large-arc flag
at `0` for anything under 180°.

## File conventions

```
icons/<slug>.svg
```

Match the `slug` in `catalog.json`. Every file opens with:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"
     role="img" aria-label="Simon">
```

The `xmlns` is required for the file to render when referenced as `<img src>` or as a CSS
`background-image`. Keep the comments in — they're how the next person finds the layer
they need to edit.

## Before shipping

- [ ] Renders at 24px without going mushy — this is the real test, not the 180px view
- [ ] Legible on cream `#fff8ef`, mid-grey, and ink `#201a17` grounds
- [ ] Every colored stroke has its ink casing underneath
- [ ] Hexes match the palette table exactly
- [ ] No shadow, border, rotation, or background rect in the file
- [ ] Three fill colors or fewer, unless the game's identity needs more
- [ ] `viewBox="0 0 100 100"`, `xmlns` present, `aria-label` set

## When to generate instead

Some subjects aren't geometry — a helicopter, a hand, a creature. For those, the image
prompt in [`sticker-prompt.md`](sticker-prompt.md) still applies, with two warnings
learned the hard way:

- **Never use the word "sticker"** in a prompt. Models read it as a physical object and
  return a vinyl die-cut border, a cast shadow and a gloss highlight, no matter how many
  negatives you stack. Say "flat vector symbol" or "logo mark".
- **Don't trust the transparency.** Generate on flat magenta `#ff00ff` and key it out —
  more reliable than asking for alpha, and it gives a cleaner edge.

Then trace the result to SVG and bring it back onto the measurements above, so it sits in
the same system as everything else.
