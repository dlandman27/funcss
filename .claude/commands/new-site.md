# New Site

Create a brand new site for randomsitesontheweb.

## Usage
`/new-site <folder-name> "<title>" "<description>" <category>`

**category** must be one of: `educational`, `fun`, `tools`, `games`, `entertainment`, `mindfulness`, `art`

Example: `/new-site typeracer "Type Racer" "Race against the clock to type a random sentence as fast as possible" games`

---

## What to do

1. **Parse the arguments** from the user's message — folder name, title, description, category. If any are missing, ask.

2. **Create the site file** at `sites/<folder-name>/index.html`.

   Build a complete, polished, self-contained site. Follow these rules exactly:
   - First tag in `<head>` must be: `<script defer src="https://randomsitesontheweb.com/globals/global.js"></script>`
   - Include `<meta charset="UTF-8">` and `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
   - Vanilla HTML + CSS + JS first. CDN packages are allowed via ESM imports at the top of
     a `<script type="module">` — but only when the library IS the mechanic (springs via
     Motion, 3D via Three.js, audio via Tone.js, real physics via matter-js), never for
     things CSS/WAAPI or a cheap hand-rolled sim can do:
     ```html
     <script type="module">
       import { animate, spring, press } from "https://cdn.jsdelivr.net/npm/motion@12.15.0/+esm";
     </script>
     ```
     **Pin exact versions** — these sites sit untouched forever; `@latest` rots.
     No frameworks (React/Vue/etc) — nothing that wants JSX or a build step.
   - Fully self-contained in one file
   - Responsive — must look good on mobile
   - Creative and fun — make it genuinely interesting, not generic
   - Smooth animations and interactions where appropriate
   - **Read `.claude/commands/site-style.md` first and follow it** — the sticker-comic design
     language, interaction feel, voice, and tech checklist for every site

3. **Register the site in `catalog.json`** — the homepage is GENERATED from the catalog;
   never edit `index.html` by hand. Append to the `sites` array:

   ```json
   {
     "slug": "<folder-name>",
     "name": "<title>",
     "description": "<description>",
     "section": "<category>",
     "visible": true,
     "random": true,
     "icon": null,
     "created": "<today, YYYY-MM-DD>"
   }
   ```

   `created` is required — the build fails without it. Cards newer than 21 days get a
   "NEW!" sticker on the homepage automatically.

   Then run `npm run build` to regenerate `index.html`.

4. **Tell the user** what was created and where to find it.
