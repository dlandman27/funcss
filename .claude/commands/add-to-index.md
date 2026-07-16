# Add to Index

Register an existing site folder in the main directory listing on the homepage (`index.html`).

## Usage
`/add-to-index <folder-name> "<title>" "<description>" <category>`

**category** must be one of: `educational`, `fun`, `tools`, `games`, `entertainment`, `mindfulness`, `art`

Example: `/add-to-index timemeters "Time Meters" "Progress bars for the day, week, month, year, decade, century, and millennium" tools`

---

## What to do

1. **Parse the arguments** — folder name, title, description, category. If any are missing, ask.

2. **Verify the folder exists** at `sites/<folder-name>/index.html`. If it doesn't, warn the user.

3. **Add a card to `index.html`** (the directory lives in the `.directory-inner` section near the bottom of the page). Find the `<div class="site-grid">` that follows the matching `<h2 class="category-title <category>">` heading and append a new card at the end of that grid:

   ```html
   <div class="site-card" data-categories="<category> <subcategory>">
       <a href="<folder-name>/">
           <h2><title></h2>
           <p><description></p>
           <div class="category"><Category> • <Subcategory></div>
       </a>
   </div>
   ```

   Keep the `href` folder-relative (e.g. `<folder-name>/`) — the homepage prefixes `/sites/` at runtime. Pick a fitting subcategory (e.g. `interactive`, `puzzle`, `reflexes`, `music`, etc.).

4. **Tell the user** the card was added.
