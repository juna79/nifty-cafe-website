# Nifty Cafe & Wine Bar website

Static website for Nifty Cafe & Wine Bar, Tigoni, Limuru. Plain HTML, CSS and JavaScript. No framework and no build step.

```
index.html          page markup and copy (menu items, events, hours, FAQ)
404.html            not-found page
robots.txt
netlify.toml        Netlify config and cache headers
assets/
  css/style.css     all styles (colours and fonts are CSS variables at the top)
  js/main.js        open-now badge, menu filter, gallery, lightbox, booking form
  images/           site photos and logo
```

## Making changes
Edit the file, commit, push. Netlify redeploys automatically.

| To change | Edit |
| --- | --- |
| Menu items and prices | `index.html`, the `.item` blocks inside the Food / Drinks / Wine & bar panels of the `#menu` section |
| Opening hours | `index.html` (`#hours` table, FAQ, footer) and the `status()` function in `assets/js/main.js` (510 to 1260 minutes = 8:30am to 9pm, day 1 = Monday closed) |
| Events and Nifty Mornings | `index.html`, the `#mornings` and `#events` sections |
| Phone / WhatsApp number | `index.html` (`tel:` links) and `PHONE` in `assets/js/main.js` |
| Colours and fonts | `:root` variables at the top of `assets/css/style.css` |
| Photos | replace files in `assets/images/` (keep the file names, roughly 520px wide, JPEG) |

To preview locally: `python3 -m http.server 8000` then open http://localhost:8000.

## Deploy on Netlify
Import this repo. Build command: none. Publish directory: `.`

## Things to confirm with Nifty
- 0115 435 374 is on WhatsApp (the booking form opens WhatsApp).
- The menu now comes from Nifty's A3 menu PDF (date unknown). Confirm it is current, and the Nifty Mornings offers (not on the PDF).
- Last-Friday karaoke is still running.
- Swap the Instagram photos for originals for a sharper hero and gallery.
