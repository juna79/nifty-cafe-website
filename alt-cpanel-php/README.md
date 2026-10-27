# OPTIONAL: PHP version of the staff poster backend (for cPanel hosting)

**Not used by default. Prefer Netlify** (no PHP on the server). Use this only if the site must be hosted on a cPanel/PHP host.

## Read first: PHP security
In October 2026 a critical, actively exploited PHP flaw ("PHP2Shell", CVE-2026-109618/109619, remote code execution) was disclosed.
Affected: PHP **older than 8.2.35 / 8.3.36 / 8.4.27 / 8.5.12**. Do not deploy this folder unless the host confirms in writing
that the PHP version used for the site is patched (cPanel: Software, MultiPHP Manager shows the major version; ask the host for the exact patch level).
If the host's PHP is not patched, the host itself is at risk whatever site is on it, so raise it with them regardless.

> **Note:** this PHP version only supports ONE event (no Event 2/3 tabs, no weekend-note tickbox). The Netlify functions are the maintained version.

## Contents
- `api/event.php`, `api/login.php`, `api/lib.php`: same behaviour as the Netlify functions (public read, password login with lockout, signed 12h token, validated poster upload stored outside the web root where possible). PHP 7.2+ compatible.
- `api/config.sample.php`: copy to `api/config.php` on the server and set a strong password (never commit `config.php`).
- `htaccess-root.txt`: rename to `.htaccess` in the site root (routes `/api/event` and `/api/login` to the PHP files, blocks config files, security headers).
- `htaccess-admin.txt`: rename to `.htaccess` inside `admin/`.

## To use
Upload everything in `public/` to the site folder, then copy `alt-cpanel-php/api/` into it as `api/`, add the two `.htaccess` files and create `api/config.php`.
Tested locally on 2026-10-26 (login, lockout, publish, replace, take down, image integrity) before PHP was removed from the dev machine for being unpatched.
