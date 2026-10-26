# Nifty Cafe & Wine Bar website

Static website (plain HTML, CSS and JavaScript) plus a small staff area where the **Event of the week** poster can be changed without touching code.

```
public/                 the website. Only this folder is published.
  index.html            page markup and copy (menu, events, hours, FAQ)
  404.html, robots.txt
  admin/index.html      staff login + poster upload (not indexed by search engines)
  assets/css/style.css  all styles (colours and fonts are CSS variables at the top; --amber is the gold)
  assets/css/admin.css  staff page styles
  assets/js/main.js     open-now badge, menu tabs, gallery, booking form, loads the event of the week
  assets/js/event-render.js  shared by the site and the staff preview
  assets/js/admin.js    staff page logic
  assets/images/        site photos and logo
alt-cpanel-php/         OPTIONAL PHP backend for cPanel hosting (read its README first; see PHP security note)
netlify/functions/      serverless backend
  login.mjs             POST /api/login   password -> 12 hour session token (rate limited)
  event.mjs             GET /api/event    public; POST/DELETE need a valid token
netlify/lib/auth.mjs    password check and token signing
netlify.toml            publish folder, functions folder, headers
```

## Staff: updating the event of the week
1. Go to `yourwebsite/admin/` (there is a small lock "Admin" link top right of the site).
2. Log in with the staff password.
3. Choose this week's poster (it is resized automatically), optionally add a name, date, time and note, and press **Publish to website**.
4. If you add a date, the poster comes down by itself after that day and the usual Saturday Sundown Sessions section returns. **Take poster down** does the same immediately.

Saturday and Sunday events automatically show the KSh 1,000 per person voucher note.

## One-time Netlify setup (needed for the staff area)
1. Deploy this repo from GitHub (Site configuration, Build and deploy). Functions do not run on drag-and-drop folder deploys.
2. Site configuration, Environment variables: add `ADMIN_PASSWORD` (8+ characters, make it strong and share it only with staff). Optionally add `SESSION_SECRET` (any long random text).
3. Trigger a redeploy. The poster is stored in Netlify Blobs, which is built into Netlify (no other account or service).
Changing `ADMIN_PASSWORD` later logs everyone out and needs the new password.

## Making other changes
Edit the file, commit, push. Netlify redeploys.

| To change | Edit |
| --- | --- |
| Menu items and prices | `public/index.html`, the `.item` blocks in the Food / Drinks / Wine & bar panels of `#menu` |
| Opening hours | `public/index.html` (`#hours` table, FAQ, footer) and `status()` in `public/assets/js/main.js` (510 to 1260 minutes = 8:30am to 9pm, day 1 = Monday closed) |
| Nifty Mornings, weekly events | `public/index.html`, the `#mornings` and `#events` sections |
| Default section when no poster is up | the `data-fallback` attribute and markup of `#thisweek` in `public/index.html` |
| Phone / WhatsApp number | `tel:` and `wa.me` links in `public/index.html`, `PHONE` in `main.js` and `event-render.js` |
| Weekend voucher | `voucherText()` in `main.js`, the voucher callout and FAQ in `index.html` |
| Colours and fonts | `:root` variables at the top of `public/assets/css/style.css` |
| Photos | replace files in `public/assets/images/` (use a new file name when you replace a photo) |

## Preview locally
Static pages only: `cd public && python3 -m http.server 8000`.
With the staff area and poster backend: `npm install`, create a git-ignored `.env` containing `ADMIN_PASSWORD=...`, then `npx netlify-cli dev --offline`.

## Things to confirm with Nifty
- Menu and prices come from Nifty's A3 menu PDF (confirmed current 2026-10-15). Still to confirm: the Nifty Mornings offers (not on the PDF) and which dishes count as vegetarian (marked from the descriptions).
- A photo of an on-menu pizza, and raw photos in general: the Instagram frames are only 512px wide.

## Hosting note (cafenifty.com)
The existing cafenifty.com WordPress site runs on a cPanel host (DNS: mailsafi.com, email on Google). The plan is to deploy this site on Netlify
and point a subdomain (e.g. new.cafenifty.com, CNAME) at it, then later switch the `@` and `www` records. Do not change nameservers (email would break).
Netlify keeps PHP out of the picture (see the PHP security note in `alt-cpanel-php/README.md`).
