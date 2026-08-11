# Cursor Toy

Build a single-canvas, full-viewport, cursor/pointer-reactive ambient toy — the
"simple grid/field + your cursor does something to it" genre (Dot Field, Gravity
Well, String Art, Laser Maze, Pinwheel Field). Use this instead of generic `/new-site`
whenever the idea is: a field of *things* fills the whole screen, and moving/clicking/
holding the cursor perturbs them physically (grow, bounce, orbit, thread, spin, melt,
crack...). It's `/new-site` plus a working physics/rendering playbook so you don't
re-derive the same bugs each time.

## Usage
`/cursor-toy <folder-name> "<title>" "<description>" <category> ["<mechanic notes>"]`

Example: `/cursor-toy grass "Grass" "A field that leans away from your cursor like wind, then springs back." fun "blades bend away from pointer, spring-back overshoot"`

---

## Before writing code

If the mechanic isn't already fully pinned down (exact interaction, what happens at
rest/idle, what happens on release), ask 1-3 targeted questions in chat — one per
ambiguous mechanic, multiple-choice where possible — then state a 3-6 sentence design
back to the user and get a quick go-ahead. **Don't** write a spec doc to
`docs/superpowers/specs/` and don't invoke `writing-plans` for these — the steps below
already are the plan. This mirrors how Laser Maze, Dot Field, Gravity Well, and String
Art were actually built.

## Boilerplate every toy in this genre starts from

```js
var canvas = document.getElementById('stage');
var ctx = canvas.getContext('2d');
var width = 0, height = 0, dpr = 1;

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  buildField();   // rebuild grid/particles/pins for the new size
}

var pointer = { x: -9999, y: -9999, active: false };
canvas.addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; });
canvas.addEventListener('pointerdown', e => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; });
canvas.addEventListener('pointerleave', () => { pointer.active = false; });
canvas.addEventListener('pointerup', () => { pointer.active = false; });

window.addEventListener('resize', debounce(resize, 150));
resize();
requestAnimationFrame(frame);
```

Pointer Events alone cover mouse, touch, and pen — don't add separate touch handlers.
`touch-action: none` + `user-select: none` on `html, body` in CSS, always.

## Pick the interaction pattern(s) that fit — and the bug each one already cost us

**Hover falloff + settle** (Dot Field). Distance-based smoothstep target, eased toward
with a **fast lerp when growing, slow lerp when shrinking** — that asymmetry is what
makes it feel alive instead of springy. `falloff = t*t*(3-2*t)` where `t = 1 - dist/R`.

**Idle motion is not optional.** The first cut of Dot Field only reacted to hover and
was flagged "boring" because it sat dead on load. Give every field a cheap always-on
idle animation — e.g. a per-cell phase from its own position (`phase = (x+y)*scale`)
driving a slow sine, so it reads as a drifting wave with zero input. Never ship a toy
in this genre that is a static frame until touched.

**Attraction / repulsion physics** (Gravity Well). Two real bugs happened here, both
about force weakening incorrectly near the center — avoid them:
1. Don't compute magnitude as `G * dx / rClamped^3` — as a particle approaches the
   target, `dx→0` and the force wrongly fades to zero, so things drift in and *stick*.
   Instead normalize direction and clamped-magnitude separately: `mag = G / max(r, MIN_R)^2`,
   direction = `dx/r, dy/r` — the pull stays at full strength all the way to the center.
2. Even with that fixed, N particles all attracted to one point will visually collapse
   into "one dot" unless something pushes back. Add (a) a repulsive core near the
   attractor that grows as `r→0` and overpowers attraction inside some radius, and
   (b) cheap pairwise repulsion between the particles themselves (`O(n²)` is fine under
   ~200 particles) so a crowd reads as a cluster, not a point.

**Expanding ripple / wave** (Dot Field's click ripple). Track `{x, y, t0}`; each frame
`frontR = (now - t0) * SPEED`; a cell reacts when `|dist - frontR| < WIDTH`, strength
`decay`ing linearly as `frontR` approaches the screen diagonal so it dies out.

**Reflection / bounce** (Laser Maze). Ray/polygon intersection via the standard
determinant line-intersection formula, reflect with `d' = d - 2*(d·n)*n`. Regenerate
the full bounce path every frame from the *current* aim angle rather than simulating
step-by-step — cheap, and lets steering sweep the whole pattern live.

**Capture / threshold snapping** (String Art). Find the nearest anchor; only commit a
permanent change when the cursor comes within a capture radius, and dedupe
(`Set`/object keyed by sorted index pair) so retracing doesn't re-thicken forever.

## Sticker-recipe offset bug (Pinwheel Field, found and fixed 2026-08-10)

The house drop-shadow recipe from `site-style.md` is: translate once for the shadow
copy, draw a **zero-origin** path, fill ink; then draw the **same zero-origin path
again undisplaced**, fill color. The bug: baking the `1.5, 1.5` offset into the shared
path-drawing function itself (e.g. `ctx.moveTo(1.5, 1.5)` inside a shape helper called
by both the shadow pass and the color pass) instead of only via the outer
`ctx.translate`. Symptom: the shadow gets double-offset, and the visible shape is
permanently mispositioned relative to anything drawn with a true, unoffset center
(a hub circle, a base shadow) — if the shape also rotates, the offset revolves with it
and the whole thing visibly wobbles instead of pivoting cleanly. Any shape helper
shared between a shadow pass and a color pass must take `(0, 0)` as its own origin;
offset belongs on the caller's `translate` only.

## Visual register

Pick one and stay consistent (see `site-style.md`):
- **Dark neon** (Laser Maze, Gravity Well) — near-black bg, `shadowBlur` glow, trail-smear
  clear (`fillRect` with low-alpha bg color instead of a hard clear) for motion trails.
- **Light paper** (String Art) — the house paper/cork gradient, ink outlines, a single
  accent color (coral thread, gold hub) rather than a rainbow — a toy using every house
  color on every element reads as noisy, not lively.

rAF loops that always animate (physics toys, idle-wave ambient toys) are fine to run
forever. Toys with no idle motion (String Art: nothing moves until you do) should be
event-driven instead — redraw only on `pointermove`/`resize`, no rAF loop at all.

## Finish like `/new-site`

1. Register in `catalog.json` (append, `created` = today, re-read the file first — it's
   frequently touched by the daily automated routine, so don't trust a stale read).
2. `npm run build`.
3. Verify: if browser tooling is available, actually load the page and interact with
   it before calling it done — code review alone missed the Pinwheel Field offset bug
   until it was rendered. If browser tooling isn't available or is declined, say so
   explicitly rather than claiming it was tested.
4. Tell the user what was built and where.
