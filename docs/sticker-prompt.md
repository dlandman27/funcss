# Game icon prompt

> **Read [`game-icons.md`](game-icons.md) first.** Icons are hand-authored SVG by default —
> exact hexes, real transparency, one file for every size. This prompt is the fallback for
> genuinely illustrative subjects (a helicopter, a creature) that aren't worth drawing by
> hand.
>
> Two corrections learned the hard way, which apply to everything below: **never use the
> word "sticker"** in a prompt — models read it as a physical object and return a vinyl
> die-cut border, a cast shadow and a gloss highlight no matter how many negatives you
> stack; say "flat vector symbol" or "logo mark". And **don't trust the transparency** —
> generate on flat magenta `#ff00ff` and key it out.

Reusable image-gen prompt for making an icon per game/toy, in the randomsitesontheweb
"sticker comic" style (see the `site-style` skill). Primary target: **GPT image gen** —
paste the block below verbatim.

The generated asset is a **bare flat mark on transparency**. The sticker treatment —
die-cut border, hard offset shadow, crooked rotation — is applied in CSS, not baked into
the image. See [Sticker treatment in code](#sticker-treatment-in-code).

## Template

Fill in `{SUBJECT}` and `{COLOR ASSIGNMENT}` (see below), paste the whole thing.

```
A flat 2D vector game icon of {SUBJECT}, drawn straight-on and face-forward, in a bold
"sticker comic" style.

Geometry (most important):
- Perfectly flat, head-on, orthographic front view. Every shape is a flat silhouette,
  as if cut from colored paper and laid on a table, photographed from directly above.
- Zero perspective, zero isometric angle, zero depth, zero foreshortening. Nothing
  recedes, nothing is tilted in space, there is no ground plane and no horizon.
- The whole design is built from at most 5 or 6 distinct shapes. Simple, iconic,
  instantly readable at 64 pixels. Fewer shapes is better.
- The subject sits upright and centered, filling the frame edge to edge.

Rendering:
- Solid flat color fills only. No gradients, no shading, no highlights, no ambient
  occlusion, no texture. Every edge is a hard color boundary.
- Every shape has a thick uniform outline in dark warm ink #201a17 (never pure black),
  rounded line joins, consistent weight throughout.
- Colors: {COLOR ASSIGNMENT}
- Playful and deadpan. Bold, chunky, confident.

The subject only, alone on a fully transparent background. No drop shadow, no sticker
border, no white outline or halo around the subject, no card, no frame, no backing
shape. Square 1:1. No text, no lettering, no numbers, no emoji, no watermark, no
background scene.
```

## Writing the `{SUBJECT}` slot

Describe **one symbol**, not a scene. The test: could you draw it with 5 shapes? If the
description has more than one noun doing something, cut it down.

Never use words that imply depth — "tilted forward", "3/4 view", "stacked", "in
perspective", "on a table", "floating above". They override the geometry block.

| Game | Subject slot |
|---|---|
| Connect 4 | `a single thick rounded square board face with three circular holes in a row, two filled with discs and one empty` |
| Tic tac toe | `one bold X and one bold O side by side, crossed by a single diagonal strike line` |
| Tic tac toe (alt) | `a bold tic-tac-toe hash grid of four thick straight lines, with a single X in the center cell and a single O in the top-left cell` |
| Memory match | `two rounded rectangular cards side by side, the left one plain and the right one showing a single bold star symbol` |
| Simon | `a circle divided into four equal quadrants by a thick ink cross, with a small circle in the middle` |
| Snake | `a chunky arcade snake made of four connected rounded square segments bending at a right angle, with a single small dot eye on the head segment and one separate small square pellet beside it` |
| Dots and boxes | `a 3 by 3 grid of round dots, with one square between four of the dots filled in solid, and two thick straight lines connecting two other pairs of dots` |
| Copter | `a simple side-on helicopter silhouette with one straight horizontal rotor bar` |
| Falling sand | `an hourglass outline with a small pile of loose square grains in the lower bulb` |

Watch for subject nouns that carry a strong real-world prior — "snake" alone gets you a
coiled reptile with scales. Qualify with the game form ("arcade snake made of square
segments") or drop the noun entirely ("a game piece built from four square blocks in an
L shape").

## Writing the `{COLOR ASSIGNMENT}` slot

Assign colors part by part rather than listing a palette — the model picks badly when
left to choose. Draw only from: coral `#f0563e`, sky `#5aa0db`, lime `#b7ce3c`, purple
`#a98fd0`, orange `#f47b28`, pink `#ff7fa5`, teal `#2fb0a3`, gold `#f7c948`, cream
`#fff8ef`, ink `#201a17`. Three fill colors max, plus cream and ink — unless the game's
identity genuinely needs more (Simon's four quadrants).

Example: `the board is gold #f7c948, the empty hole is cream #fff8ef, the two discs are
coral #f0563e and sky #5aa0db, all outlines are ink #201a17.`

Always end the assignment with `all outlines are ink #201a17` — without it the model
starts tinting outlines to match fills and the whole thing goes soft.

## Sticker treatment in code

Generate the mark upright and bare. Everything else is CSS:

```css
.icon-sticker {
  background: var(--paper-cream);
  border: 2px solid #201a17;
  border-radius: 14px;
  box-shadow: 3px 3px 0 #201a17;
  transform: rotate(-6deg);
}
```

Two things must **not** go in the prompt:

- **Rotation.** "Tilted 6 degrees" gets read as tilting the object in 3D space and is the
  fastest route to an isometric result.
- **Drop shadow.** A shadow baked inside the silhouette doubles against the container's
  `box-shadow` and reads as a mistake.

## Notes

- One icon per generation. Sheet prompts drift on line weight across the sheet, which
  defeats the point.
- If a result comes back dimensional, re-roll with this appended: "Draw this as a flat 2D
  logo mark, like a road sign or a printed sticker — not as an illustrated object."
  Naming the artifact type beats another round of negatives.
- If a result comes back busy, cut one element out of the subject description rather than
  asking for "simpler" — the shape budget only holds if the subject is actually small.
- Check the transparency, don't trust it. These models like to sneak in a near-white
  backing square or a faint halo. Drop the PNG on a mid-gray to confirm before shipping.
- Other models: Midjourney ignores hex codes (say "coral red, sky blue, lime green"),
  needs `--style raw --no gradient, shading, 3d, isometric, perspective, shadow, text,
  background --ar 1:1`, and won't give true transparency — you'd have to key the
  background out.
