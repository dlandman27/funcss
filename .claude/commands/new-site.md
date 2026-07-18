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
   - Vanilla HTML + CSS + JS only — no external libraries, no CDN imports, no frameworks
   - Fully self-contained in one file
   - Responsive — must look good on mobile
   - Creative and fun — make it genuinely interesting, not generic
   - Smooth animations and interactions where appropriate
   - Match the vibe of the existing sites (playful, polished, a little quirky)

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
