# Scratchers — design spec (2026-09-01)

An endless supply of gas-station scratch-off tickets. Scratch one, win money or lose,
the next slides across the counter. Second game in the compulsion-stack lane: Lucky
Chest's rhythm (one pull, one resolve, repeat) with a slower, juicier verb.

## The loop

Gas-station counter scene. One ticket on the counter at a time:

1. Scratch the foil spots (pointer drag, destination-out canvas, coalesced events,
   shaving particles, procedural scratch noise via WebAudio keyed to pointer speed).
2. A spot >60% scratched snaps fully clear (quick wipe animation) and counts as revealed.
3. All spots revealed → resolve. **Win** (3 matching symbols): symbols pulse, cash burst,
   "WINNER $X" stamp slams down, bankroll counts up. **Lose**: "NOT A WINNER" ink stamp,
   beat, ticket flung onto a discard pile (Motion fling), next ticket slides in.
4. Forever. The next ticket is always coming.

## Tiers (the evolving game)

The $1 ticket is always FREE — you can never go broke (the Lucky Chest rule: the chest
never stops being tappable). Paid tiers cost bankroll per ticket:

| tier | ticket | cost | spots | win rate | top prize | EV/ticket |
|---|---|---|---|---|---|---|
| 1 | Lucky 7s | FREE | 6 | ~22% | $50 | +$0.82 (the drip that funds the habit) |
| 2 | Cash Cow | $5 | 8 | ~30% | $250 | ~$4.05 (house edge ~19%) |
| 3 | Gold Rush | $20 | 9 | ~32% | $1,000 | ~$18 (edge ~10%, bigger swings) |
| 4 | (no name, black foil) | $100 | 9 | ~27% | $10,000 | ~$74 (the cruelest ticket) |

Free tier is EV-positive so play always trickles money in; paid tiers drain it. Lifetime
net stays honestly, hilariously negative. Buying a tier's ticket when unaffordable is
disabled — grind the free one.

## Ticket generation

- Pick a random design from the tier's set. Roll **golden ticket** (1/500, any tier:
  always wins $777, special art). Roll **misprint** variant (2%: off-register print,
  upside-down text — same odds, collectible variant).
- Roll outcome from the tier's payout table. Symbols are hand-drawn canvas glyphs in
  sticker style (cherry, seven, horseshoe, clover, bell, diamond, coin, skull — NO emoji).
  Each symbol maps to a prize amount printed under it.
- Win: exactly 3 of the winning symbol placed randomly; no other symbol appears 3×.
- Lose: no symbol appears 3×; **60% of losing tickets get exactly one pair of a
  high-prize symbol** (engineered near-miss — two diamonds, one spot left).

## The binder

Album of ticket **designs**: 15 base artworks across the tiers + misprint variant of
each + the Golden Ticket + The Blank Ticket (1/2000: completely blank, wins nothing,
described in the album as "worth everything"). ~32 slots. Unscratched designs show as
silhouettes. A design's card records times scratched and whether you've ever won on it.

## Deadpan layer

- Running stats, played straight: "tickets scratched: 312 · lifetime net: −$243.
  congratulations."
- Fine print on every ticket, escalating with lifetime losses: "odds printed somewhere"
  → "odds of winning: eventually" → "this ticket was free. remember that."
- Discard pile visibly grows on the counter (persisted count).

## Tech

- One self-contained `sites/scratchers/index.html`, global.js first, loud sticker style.
- Ticket = art canvas (design + symbols) under a foil canvas (destination-out brush);
  DOM frame around it. Reveal fraction sampled on a coarse grid per spot.
- **Motion 12.15.0** (pinned ESM): ticket slide-in/fling-out springs, stamp slam with
  overshoot, bankroll pulse, album stagger. Scratch audio: plain WebAudio noise burst
  (no library needed — Tone would be overkill here).
- State `scratchers-v1` in try/catch: bank, stats {scratched, won, netCents}, album
  {designId: {seen, scratches, wins}}, discards.
- Responsive; `touch-action: none` on the ticket; DPR capped at 2; rAF sleeps when idle;
  reduced-motion swaps springs for fades.
- Register in `catalog.json`: slug `scratchers`, section `games`, created 2026-09-01;
  `npm run build`.

## Out of scope (v1)

Sharable win cards, sounds beyond the scratch noise, seasonal ticket sets, any real money.
