# Brainstorm

Generate new site ideas for randomsitesontheweb.

## Usage
`/brainstorm` — generate a batch of ideas
`/brainstorm <theme>` — generate ideas around a specific theme or category

Examples: `/brainstorm`, `/brainstorm music`, `/brainstorm games`, `/brainstorm weird`

---

## What to do

1. **Read `sites/index.html`** to get the full list of existing sites so you don't suggest
   duplicates. Also run `git log --oneline -8` to see what was just built — never pitch
   something whose core mechanic is a reskin of a recent site. "Another one like X" means
   same wow-level, never the same engine with a different coat.

2. **Generate 8–12 fresh ideas.** Pitch each one so it can be judged in five seconds:
   - **Name** — short, punchy title
   - **Folder** — the slug (e.g. `pullthecord`)
   - **Category** — one of: `educational`, `fun`, `tools`, `games`, `entertainment`, `mindfulness`, `art`
   - **The verb** — the ONE core interaction, stated as an action: *yank the cord*,
     *sweep across the words*, *hold to accelerate*, *tap the chest*. If you can't name
     the verb in three words, the idea isn't ready.
   - **The payoff** — what happens the instant you do the verb, plus one slow-burn or
     rare-event surprise (the moth that visits after 12s of darkness, the 5% redacted
     word, the chest that turns gold).
   - **Anchor** — the real-world object or experience it's borrowing, if there is one.

3. **Taste: what the keepers share.** The sites that survive are built around a physical
   metaphor with a single verb done exceptionally well:
   - **A real object, not an abstraction.** Pull-cord light switch, treasure chest,
     Swiss Army knife, ransom note, googly eyes, lenticular print, boulder uphill.
     "Interactive gradient field #12" gets killed; "a thing from the physical world,
     lovingly faked in the browser" gets kept.
   - **A thing to DO, not a thing to look at.** Passive generative art loses to a toy
     you can't stop fiddling with. The test: would someone poke it a second time?
   - **Immediate tactile feedback** — springs, squash, overshoot, counters ticking —
     and ideally a **rare surprise layer** that rewards lingering.
   - **Deadpan copy** is part of the mechanic, not decoration ("physics has been
     notified", "refunds unavailable"). Ideas that create excuses for wry status
     messages are stronger.
   - **Optional progression hook**: a localStorage counter, personal best, or
     collection/binder (Lucky Chest) turns a 20-second toy into a returnable one.
     Include a couple of ideas with a progression hook in every batch.

   **Kill on sight:** library demos wearing the house palette, abstract particle/gradient
   fields with no verb, clones of existing sites, ideas whose pitch starts with the
   technology instead of the joke.

   **The compulsion-stack game lane (proven by Lucky Chest — the most addicting game on
   the site).** Every batch should include 1–2 games with ALL FOUR of these, stacked:
   - **The gamble** — variable-ratio rewards with rarity tiers; you never know if the
     next pull is the legendary. Near-misses are fuel.
   - **The binder** — a persistent collection with visible empty slots (localStorage).
   - **The evolving game** — meta-upgrades that change the rules/UI under you as you play.
   - **The juicy verb** — a zero-friction repeat action that feels good regardless of
     outcome (springs, flips, shine, confetti).

   Each game in this lane gets its OWN world/theme (not more household junk), a core verb
   that is genuinely different from tap-to-open, and can be pure luck or luck-with-a-dash-
   of-skill. These games should lean on **Motion (Framer Motion, pinned ESM)** for the
   juice — springs, overshoot, staggered reveals.

4. **Libraries open doors** — sites may pull in CDN packages via pinned ESM imports
   (see `new-site.md`), which reaches categories vanilla JS can't. Include some in the mix:
   - **3D** (Three.js) — spinnable objects, dice you throw, infinite starfields
   - **Sound** (Tone.js) — instruments, generative music boxes, noise toys
   - **Real physics** (matter-js) — ragdolls, dominoes, soft bodies, chain reactions
   - **Springy motion** (Motion) — drag-and-fling, elastic cords, gesture toys
   - **In-browser ML** (MediaPipe) — hand/face tracking toys

   The idea must come first, the import second — "what would be funny," never "what can
   the library do."

5. **External references land better than invented concepts.** When possible, tie an idea
   to something that exists — a Framer module, a physical toy, a nostalgic object, a real
   print/optical effect — and say what the reference is. A batch should read like a pile
   of found objects, not a pile of prompts.

6. **After listing the ideas**, ask the user which one(s) they want to build, then offer
   to run `/new-site` for them.

---

## Parked pitches (approved lane, not yet built)

Compulsion-stack games pitched 2026-09-01; Dylan liked the batch, Shortwave built first.
Check `sites/` before resurfacing one — and don't re-pitch a mechanic that's since shipped.

- **Scratchers** (`scratchers`) — scratch foil off lotto tickets (canvas erase + shavings);
  winnings buy higher-tier weirder tickets; album of winning designs.
- **The Claw** (`theclaw`) — arcade claw over a matter-js plushie pile; agonizing lift,
  last-second drops; tokens buy grip upgrades, new machines with visible legendaries.
- **Dig Site** (`digsite`) — chisel/brush an archaeology grid; finds crack if you chisel
  too close; museum wing binder, deeper strata with new eras.
- **Gone Fishing** (`gonefishing`) — cast, wait, yank in the timing window; silhouette
  size tease; aquarium log of increasingly wrong fish; ponds change (night, ice, deep end).
- **The Bazaar** (`thebazaar`) — haggle with a shady merchant over random daily stock;
  each lowball risks him walking away forever; reputation unlocks back-room merchants.
