# Brainstorm

Generate new site ideas for randomsitesontheweb.

## Usage
`/brainstorm` — generate a batch of ideas
`/brainstorm <theme>` — generate ideas around a specific theme or category

Examples: `/brainstorm`, `/brainstorm music`, `/brainstorm games`, `/brainstorm weird`

---

## What to do

1. **Read `sites/index.html`** to get the full list of existing sites so you don't suggest duplicates.

2. **Generate 8–12 fresh ideas.** For each idea provide:
   - **Name** — short, punchy title
   - **Folder** — the slug (e.g. `typeracer`)
   - **Category** — one of: `educational`, `fun`, `tools`, `games`, `entertainment`, `mindfulness`, `art`
   - **Concept** — 1–2 sentences describing what it does and why it's fun/interesting

3. **Aim for variety** across categories unless the user specified a theme. Favor ideas that are:
   - Novel — not just a clone of something already in the list
   - Simple enough to build in one HTML file
   - Fun or surprising — something that makes you think "why does this exist? I love it"
   - Interactive where possible (clicks, typing, mouse movement, timers, etc.)

4. **After listing the ideas**, ask the user which one(s) they want to build, then offer to run `/new-site` for them.
