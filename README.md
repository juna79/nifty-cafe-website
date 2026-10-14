# Nifty Cafe & Wine Bar website

Static one-page site. `index.html` at the repo root is the **built output** that Netlify serves.

## Making changes
1. Edit `src/template.html` (all copy, styles and scripts) or swap photos in `src/photos/`.
2. Rebuild: `python3 src/build.py` (needs `pip install pillow`). This embeds the photos and rewrites `index.html`.
3. Commit and push. Netlify redeploys automatically.

Never edit `index.html` directly, it is overwritten by the build.

## Deploy on Netlify
Import this repo. Build command: none. Publish directory: `.` (already set in `netlify.toml`).

## Things to confirm with Nifty
- Phone 0115 435 374 is on WhatsApp (the booking form opens WhatsApp). Change `PHONE` near the bottom of the script in `src/template.html`.
- Menu prices (from a third-party takeaway listing, items are in `src/build.py`) and the Nifty Mornings offers.
- Last-Friday karaoke is still running.
- Replace the Instagram photos in `src/photos/` with originals for a sharper hero and gallery.
