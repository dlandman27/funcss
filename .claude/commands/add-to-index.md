# Add to Index

Register an existing site folder in the site catalog (`catalog.json`). The homepage
(`index.html`) is GENERATED from the catalog — never edit it by hand.

## Usage
`/add-to-index <folder-name> "<title>" "<description>" <category>`

**category** must be one of: `educational`, `fun`, `tools`, `games`, `entertainment`, `mindfulness`, `art`

Example: `/add-to-index timemeters "Time Meters" "Progress bars for the day, week, month, year, decade, century, and millennium" tools`

---

## What to do

1. **Parse the arguments** — folder name, title, description, category. If any are missing, ask.

2. **Verify the folder exists** at `sites/<folder-name>/index.html`. If it doesn't, warn the user.

3. **Check `catalog.json`** for an existing entry with that slug. If one exists (e.g. imported
   as hidden during migration), UPDATE it in place — set `name`, `description`, `section`,
   `visible: true`, `random: true` — instead of adding a duplicate.

4. **Otherwise append** to the `sites` array in `catalog.json`:

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

   `created` is required (the build fails without it). For a site that already existed
   in git before being indexed, use its first commit date:
   `git log --diff-filter=A --reverse --format=%as -- sites/<folder-name>/ | head -1`.
   Cards newer than 21 days get a "NEW!" sticker on the homepage automatically.

5. **Run `npm run build`** — regenerates `index.html`. The build validates the catalog and
   fails with a clear message if the entry is malformed.

6. **Show the user** the new card in the `git diff` of `index.html` and confirm.
