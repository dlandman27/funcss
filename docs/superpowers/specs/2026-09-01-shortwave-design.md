# Shortwave — design spec (2026-09-01)

A late-night shortwave radio you tune by hand, hunting rare stations buried in static.
First game in the compulsion-stack lane (see `.claude/commands/brainstorm.md`): the gamble,
the binder, the evolving game, and a juicy verb — on a core verb (tune) that shares nothing
with Lucky Chest's tap-to-open.

## The object

Full-screen radio faceplate, loud sticker-comic register (per `site-style.md`):

- **Dial strip** — horizontal backlit frequency ruler with tick marks and a needle.
- **Tuning knob** — one big knob; drag rotates it (pointer capture, coalesced events).
  Dragging the needle directly also works; arrow keys = fine tune; mobile gets ± fine-tune
  buttons flanking the knob.
- **Signal meter** — sticker VU meter; needle springs with signal strength.
- **Band selector** — four positions: MW, SW1, SW2, and an unlabeled fourth position.
  Locked bands are physically covered (sticker plate over the switch position).
- **Power switch** — radio starts OFF. Flipping it is the user gesture that starts the
  Tone.js AudioContext (autoplay compliance, diegetic). Radio hums to life, dial lights.
- **LOGBOOK button** — opens the binder overlay.
- **Antenna panel** — shows current antenna + signal points; opens the upgrade shop.

## Tuning model (the verb)

- Each band is a normalized 0–1 strip rendered with its own frequency labels:
  MW 530–1700 kHz, SW1 3.0–10.0 MHz, SW2 10.0–22.0 MHz, X band unlabeled ("?").
- Static (pink noise) plays everywhere. Within ±3% of an on-air station's frequency,
  its audio crossfades in proportional to proximity; meter climbs; dial glow intensifies
  around the needle.
- **Lock**: hold the needle within ±0.5% of center for 1.2s → needle spring-snaps to
  center, faceplate flashes, station card pops in (overshoot), station is logged.
  The Dipole antenna widens the lock window to ±0.75%.
- Already-logged stations still broadcast (relisten anytime); locking them again does
  nothing except a small meter wiggle.

## Stations (the gamble)

72 stations total: MW 20, SW1 20, SW2 20, X 12.

| rarity | count | on-air chance per visit | points | chip color |
|---|---|---|---|---|
| Common | 34 | 80% | 1 | sky |
| Uncommon | 22 | 45% | 3 | lime |
| Rare | 12 | 15% | 8 | purple |
| Legendary | 4 | 4% (X-band ones 8%) | 25 | gold |

- **Night-only**: ~¼ of stations (skewed uncommon+) broadcast only 7pm–6am local time.
  Logbook hint after a near-miss: "stronger after dark."
- **Drift**: rare + legendary stations drift ±1.5% of the band per day, seeded by date
  (hash + mulberry32 — stable within a day, moved tomorrow).
- On-air rolls happen once per page load.
- Legendaries include: **The Silence** (meter pegged at full, broadcasting perfect
  silence) and a numbers station counting down that never reaches zero. Legendary
  content is never hinted at on the page (house secrets rule).

### Audio content (all procedural, Tone.js)

Per-station generator started lazily when within audible range, disposed when out of range:

- **Music fragments** — short generative loops (lonely piano, elevator jazz, a waltz),
  lo-fi filtered (bandpass ~300–3kHz) so everything sounds like radio.
- **Morse** — 600 Hz keyed osc; patterns spell real deadpan messages (decodable).
- **Numbers stations** — synthesized voice via SpeechSynthesis reading digit groups every
  ~8s where available; fallback: pitch-coded beeps. Static ducks while digits read.
- **Time station** — tick every second, chime pattern every 10s.
- **Whale song / anomalies** — detuned FM sines with slow glides.
- Master chain: per-station gain → shared bandpass "radio" filter → limiter (-6 dB).
- **Muted play works**: meter + dial glow fully carry the hunt without sound.

## Logbook (the binder)

Overlay in gallery framing: dark wall, card grid per band.

- Logged card: station name, frequency, rarity chip, first-heard timestamp, one italic
  Georgia transcript line ("…the fog is expected to continue.").
- Unlogged: static-textured mystery card with a "?" — empty slots stay visible and itchy.
- Per-band progress counts ("MW: 11/20") + total.
- Cards pop in with stagger (Motion) when the book opens.

## Antennas (the evolving game)

Signal points from new logs buy antennas; the faceplate visibly changes each tier:

| antenna | cost | unlocks |
|---|---|---|
| Coat Hanger | start | MW |
| Longwire | 12 | SW1 |
| Dipole | 40 | SW2 + wider lock window |
| The Array | 120 | X band + night-glow dial skin |

Upgrade moment is a sequence, not a toast: plate over the new band position tears off,
knob thunks, faceplate art swaps (spring transition).

## Tech

- One self-contained `sites/shortwave/index.html`; global.js first in head; charset +
  viewport; responsive; `touch-action: none` on the faceplate.
- Pinned ESM: `motion@12.15.0` (knob inertia/springs, needle snap, card pop-ins with
  stagger, upgrade sequence) and `tone@15.0.4` (all audio — the mechanic).
- State: single localStorage key `shortwave-v1` in try/catch:
  `{ logged: {id: firstHeardISO}, points, antenna, visits }`.
- rAF loop sleeps when idle (needle at rest, no audio near-field, book closed).
- `prefers-reduced-motion`: springs become fades, no faceplate flash/shake.
- Deterministic drift via date-seeded mulberry32; on-air rolls are plain Math.random at load.
- Register in `catalog.json`: slug `shortwave`, section `games`, created 2026-09-01;
  then `npm run build`.

## Out of scope (v1)

Shareable station cards, real DX propagation simulation, cross-game currency, sound
recording/export.
