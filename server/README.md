# Backend (PHP 8.3 + JSON files)

Small same-origin API for the SPA. No database, no Node on the server. Secrets live only in
`server/config.php` on the server (gitignored).

## Layout on the server

```
/var/www/phuongnam/              <- app root (NOT served by nginx)
  data/                          <- JSON collections, backups, OTP, rate limits, sessions (created on first use)
  uploads/                       <- admin image uploads (written by PHP, served by nginx at /uploads/)
  server/
    config.php                   <- real secrets, never committed
    api/index.php                <- PHP entry point (nginx maps /api/index.php to this file)
    seo/index.php                <- SEO shell: HTML routes, sitemap.xml, robots.txt (see "SEO shell" below)
    src/  seed/                  <- from this repo's server/src and server/seed
  public_html/                   <- nginx root: ONLY the built SPA (contents of `dist/`)
```

`public_html/` contains nothing but the built site, so wiping it can never remove the backend or the
uploaded images. `api/index.php` finds the shared code at `<app root>/server/` (two levels above its
own directory). The same relative layout works in this repo for local runs (`server/api` -> repo root -> `server/`).

## Requirements

PHP 8.3 FPM with `curl`, `mbstring`, `fileinfo` (core `json`, `session`, `openssl`).
Suggested php.ini for the pool: `upload_max_filesize = 6M`, `post_max_size = 8M`, `expose_php = Off`.

## Deploy

> **Deploy only with `server/deploy/deploy.sh`.** A manual `rm -rf public_html/*` once deleted the
> backend and ~80 uploaded images (they used to live inside `public_html/`). They now live outside it,
> but the script also takes a backup first, so keep using it.

### One-time server setup

```bash
cd /var/www/phuongnam
cp server/config.sample.php server/config.php && $EDITOR server/config.php
mkdir -p data uploads server/api
# in config.php set 'uploads_dir' => '<app root>/uploads' and 'data_dir' => '<app root>/data'
chown -R deploy:www-data data uploads server
chmod 750 server server/api server/src server/seed data
chmod 640 server/config.php server/src/*.php
chmod 770 data                              # php-fpm (group www-data) must write here
chmod 755 uploads                           # php-fpm user owns it; nginx reads it
# php-fpm pool: add <app root>/server, <app root>/data, <app root>/uploads and <app root>/public_html (the SEO shell reads index.html) to open_basedir
```

### Every release

```bash
export DEPLOY_HOST=my-ssh-alias            # alias from ~/.ssh/config
export APP_ROOT=/var/www/phuongnam         # contains data/, server/, public_html/
export SITE_USER=deploy SITE_GROUP=www-data
export SITE_URL=https://example.com        # used for the post-deploy checks
# optional: PHP_FPM_SERVICE=php8.3-fpm  REMOTE_SUDO="sudo -n" (empty if the ssh user owns everything)
bash server/deploy/deploy.sh
```

The script, in order:

1. runs `npm run build`, requires `dist/index.html`, refuses `dist/` containing `api/`, `uploads/` or
   `config.php`, and aborts if anything shaped like a Telegram bot token is in `dist/`;
2. uploads tarballs of `dist`, `server/api`, `server/seo`, `server/src` and `server/seed` to a staging dir
   (`$APP_ROOT/.deploy-incoming/<timestamp>`);
3. on the server: `php -l` on every PHP file, then a timestamped backup
   `$APP_ROOT/backups/pre-deploy-<timestamp>.tgz` of `uploads` and `data` (dir mode 700,
   newest 14 kept);
4. replaces the built files in `public_html/`, then installs `server/api`, `server/seo`, `server/src` and
   `server/seed`. It never touches `uploads/`, `data/` or `server/config.php`;
5. fixes permissions (public files 755/644, `server/src` and `server/seed` 750/640), reloads php-fpm;
6. checks from your machine: home page 200, `api/index.php?r=auth/me` 200, `/server/config.php` not 200.

### Production values (vaway fleet, https://phuongnamrealty.vn)

Everything is named after the domain, like every other site on the VPS:

| What | Value |
|-|-|
| Domain | `phuongnamrealty.vn` (the old `phuongnamrealty.s6.vaway.vn` only 301-redirects to it) |
| ssh alias | `vps-s6` (103.173.226.134) |
| App root / home | `/home/phuongnamrealty.vn` (mode 710, owner = site user, group `www-data`) |
| Site user / group | `site_phuongnamrealty_vn` / `site_phuongnamrealty_vn` |
| PHP-FPM pool, socket | `/etc/php/8.3/fpm/pool.d/phuongnamrealty.vn.conf`, `/run/php/phuongnamrealty.vn.sock` |
| nginx vhost | `/etc/nginx/sites-available/vaway-phuongnamrealty.vn.conf` (symlinked in `sites-enabled`, certbot-managed) |
| Backups | `/home/phuongnamrealty.vn/backups` (root only): `pre-deploy-*` per deploy, `daily-*` from `/etc/cron.d/pn-realty-backup` |

```bash
export DEPLOY_HOST=vps-s6 APP_ROOT=/home/phuongnamrealty.vn
export SITE_USER=site_phuongnamrealty_vn SITE_GROUP=www-data PRIVATE_GROUP=site_phuongnamrealty_vn
export SITE_URL=https://phuongnamrealty.vn REMOTE_SUDO=""     # ssh user is root on this VPS
bash server/deploy/deploy.sh
```

`SITE_GROUP` (public files, `uploads/`) stays `www-data` so nginx can read them; `PRIVATE_GROUP` owns the
`server/` code. The admin session cookie is per host: after a domain change the admin logs in again.

### Backups and restore

Each deploy leaves `$APP_ROOT/backups/pre-deploy-<timestamp>.tgz` (paths inside are relative to
`$APP_ROOT`). To restore, inspect first, then extract only what you need:

```bash
cd "$APP_ROOT"
tar -tzf backups/pre-deploy-<timestamp>.tgz | head
tar -xzf backups/pre-deploy-<timestamp>.tgz uploads                # images only
tar -xzf backups/pre-deploy-<timestamp>.tgz data                    # JSON data only
```

This overwrites files with the same name and does not delete anything else. Copy the archive off the
server from time to time: backups on the same disk do not protect against losing the server.

Collections are seeded from `server/seed/*.json` into `data/` on first access (only when the file is
missing). Data files are written with `flock` + temp file + `rename`; the last 10 versions of each
collection are kept in `data/backups/`.

## nginx

The PHP entry point and the uploads live outside the webroot, so nginx maps them explicitly
(inside the `server { }` of the site; replace `<app root>` and the FPM socket path):

```nginx
client_max_body_size 6m;                 # uploads are capped at 5MB by PHP

# API entry point (outside the webroot)
location = /api/index.php {
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME <app root>/server/api/index.php;
    fastcgi_pass unix:/run/php/<pool>.sock;
}
location ^~ /api/ { return 404; }        # nothing else under /api/

# uploaded images: serve static images only, never execute anything
location ^~ /uploads/ {
    alias <app root>/uploads/;
    location ~ \.php$ { deny all; }
    add_header X-Content-Type-Options nosniff always;
    try_files $uri =404;
}
```

The pool's `open_basedir` must include `<app root>/server`, `<app root>/data`, `<app root>/uploads` and `<app root>/public_html`.

## SEO shell (Google, Zalo, Facebook)

The SPA ships one static `<head>`. Crawlers that do not run JavaScript (Zalo, Facebook) and Google's first pass
need the real title, description, canonical, Open Graph tags and JSON-LD in the HTML. `server/seo/index.php`
(logic in `server/src/seo.php`) takes the built `public_html/index.html`, replaces its title/meta tags with the
ones for the requested URL, puts a small crawler-readable block (h1, description, excerpt, links) inside
`<div id="root">` (React replaces it on start-up) and sends it. It only reads data (falls back to `server/seed`
when a collection is missing or corrupt) and never writes. It also serves `/sitemap.xml`, `/robots.txt` and the
Google HTML verification file `/google<token>.html` (name and content come from Cài đặt > SEO).

Behaviour: unknown paths and unknown slugs answer **404** with the normal SPA shell and `noindex` (no soft 404); a
`/ky-gui/<slug>` whose listing belongs to another section answers **301** to its real URL; drafts never resolve;
items with `seo.noindex` (or the whole site when `company.seo.indexSite` is false) get `<meta name="robots">` and
`X-Robots-Tag`; `/admin` is always `noindex, nofollow`; only GET/HEAD (405 otherwise); HTML has
`Cache-Control: public, max-age=0, must-revalidate` + `ETag`/`Last-Modified` (304 supported). If the script
itself fails (bad config, missing index.html) it logs the error and sends the plain static `index.html`
(sitemap/robots answer 503 instead of a fake page).

Optional keys in `server/config.php`: `'site_url' => 'https://phuongnamrealty.vn'` (canonical origin; without it
the script uses `https://` + the Host header) and `'webroot' => '<app root>/public_html'` (default is
`<app root>/public_html`).

### Route table (one table: `PN_SEO_ROUTES` in `server/src/seo.php`, `SITE_ROUTES` in `src/seo/routes.ts`)

| Path | Page | Answer |
|-|-|-|
| `/` | home | 200, Organization + WebSite JSON-LD |
| `/du-an`, `/chuyen-nhuong`, `/ky-gui`, `/tin-tuc` | lists | 200, up to 30 item links in the body |
| `/du-an/:slug` | project, or a promoted listing with section `du-an` | 200 / 404 |
| `/chuyen-nhuong/:slug` | property, or a promoted listing with section `chuyen-nhuong` | 200 / 404 |
| `/ky-gui/:slug` | published or sold listing | 200 / 301 to its section / 404 (drafts) |
| `/tin-tuc/:slug` | news article (Article JSON-LD) | 200 / 404 |
| `/lien-he` | contact | 200 |
| `/admin` | admin SPA | 200, `noindex, nofollow`, no data lookup |
| `/sitemap.xml`, `/robots.txt`, `/google<token>.html` | generated | 200 (verification file only for the configured name) |
| anything else | SPA shell | 404, `noindex` |

### nginx

Add inside the site's `server { }` (apply it BEFORE deploying this release: the post-deploy check requests
`/sitemap.xml`). `root` stays `<app root>/public_html`. The `/api/` and `/uploads/` blocks above stay as they are.

```nginx
root <app root>/public_html;

# "/" must reach PHP. It is an exact match, so the "index" directive never serves index.html for it.
location = / { try_files /__seo__ @seo; }

# machine-readable documents; a PHP failure stays a 5xx here (crawlers retry), never an HTML page
location = /sitemap.xml { try_files /__seo__ @seo_doc; }
location = /robots.txt { try_files /__seo__ @seo_doc; }
location ~ ^/google[a-z0-9]+\.html$ { try_files /__seo__ @seo_doc; }

# the raw SPA shell stays reachable (the service worker precaches it) but is never indexed
location = /index.html { add_header X-Robots-Tag "noindex" always; }

# real files (assets, icons, sw.js, manifest, images) are served as is; every other URL goes to the SEO shell.
# Do NOT add "$uri/" or "/index.html" to this try_files: that would bypass PHP.
location / { try_files $uri @seo; }

location @seo {
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME <app root>/server/seo/index.php;
    fastcgi_param REQUEST_URI $request_uri;
    fastcgi_pass unix:/run/php/<pool>.sock;
    fastcgi_read_timeout 10s;
    fastcgi_intercept_errors on;
    error_page 500 502 503 504 = @spa_static;     # PHP down: serve the plain SPA so the site never breaks
}

location @seo_doc {
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME <app root>/server/seo/index.php;
    fastcgi_param REQUEST_URI $request_uri;
    fastcgi_pass unix:/run/php/<pool>.sock;
    fastcgi_read_timeout 10s;
}

location @spa_static { rewrite ^ /index.html break; }
```

Why it works: `/` and the three documents never look at the disk; every other URL is first looked up as a file
(so `/assets/...`, `/favicon.svg` keep being served statically) and otherwise handed to PHP, whose 404/301 answers
pass through untouched (`fastcgi_intercept_errors` only rewrites the 5xx codes listed in `error_page`).
Check after applying: `nginx -t && systemctl reload nginx`, then
`curl -sI https://<domain>/ -A Googlebot` (expect `200`, `etag`), `curl -s https://<domain>/tin-tuc/<slug> | grep -E '<title>|canonical'`,
`curl -s -o /dev/null -w '%{http_code}' https://<domain>/khong-co` (expect `404`).
Full guide: `docs/SEO.md`.

Serve the site over HTTPS only: the session cookie is `Secure`, `HttpOnly`, `SameSite=Strict`
(path `/api/`). Keep `server/` and `data/` outside the nginx root.

## Routes (all `GET|POST|PUT /api/index.php?r=...`)

| Route | Method | Auth | Purpose |
|-|-|-|-|
| `data&c=<name>` | GET | public for properties, projects, news, agents, consignments, company, filters, menu; admin for customer_leads, media | read a collection. `consignments` has two views on the same URL: an admin session gets everything (`no-store`); everyone else gets only `published`/`sold` items (missing status = published) without keys starting with `_` or named `internalNote`, `leadId`, `ownerName`, `ownerPhone` (`no-cache`, `Vary: Cookie`) |
| `data&c=<name>` | PUT | admin + `X-CSRF-Token` | replace a collection (JSON, max 2MB, shape-validated; `consignments` items also need an `id`, a `status` of draft/published/sold when present, bounded text/image sizes, numeric price/area/rooms, `section` in ky-gui/chuyen-nhuong/du-an, bounded investor/projectStatus/priceFrom/floor/view/categoryLabel and a highlights list of at most 20 short strings; projects/properties/news/consignments also validate `slug` (`a-z0-9-`, max 200) and an optional `seo` object: title max 120, description max 320, at most 15 keywords of 60 chars, `ogImage` a `/uploads/`, `/images/` or https URL, boolean `noindex`, no other keys; `company.seo` is bounded too: suffix, description, verification codes, `google<token>.html` file name and content, `indexSite` boolean) |
| `lead` | POST | public | contact/consignment form: validated, honeypot `website`, 5 per 10 min per IP, saved, Telegram notice |
| `auth/mode` | GET | public | `{mode: password or bootstrap, twofa: false}` and nothing more |
| `auth/login` | POST `{email,password,code?}` | public | password mode only (bootstrap: 403). Max 4KB. Same 401 `Email hoặc mật khẩu không đúng` for unknown email, wrong password, wrong/missing code; `401 {twofa:true}` only after the password was verified. 429 + `Retry-After` for: 10 attempts/15 min per IP, 120/10 min global, per-account lock after 5 / 8 / 10 failures (1 / 5 / 30 min, identical for unknown emails). Regenerates the session |
| `auth/otp` | POST `{phone}` | public | bootstrap mode only (403 once an account exists); admin phone only; OTP stored as hash, 3 min TTL, 3 sends per 10 min per IP |
| `auth/verify` | POST `{otp}` | public | bootstrap mode only; 5 attempts per OTP (then 429), regenerates session, returns CSRF token |
| `auth/account` | GET | admin | `{configured, email, twofaEnabled, twofaAvailable, lastLoginAt, lastLoginIp (masked), recoveryCodesLeft}` |
| `auth/account/set` | POST `{email?, password?, currentPassword?}` | admin + CSRF | bootstrap: creates the account; password mode: needs `currentPassword`. Policy errors are 422. Bumps the session epoch (other sessions die, this one is kept) |
| `auth/logout-all` | POST | admin + CSRF | bumps the session epoch and destroys the current session |
| `auth/2fa/begin` | POST `{password}` | admin + CSRF | 503 without `auth_key`; returns `{secret, otpauth}` (pending for 15 min) |
| `auth/2fa/enable` | POST `{code}` | admin + CSRF | verifies the TOTP, returns 10 recovery codes once (stored only as hashes), bumps the epoch |
| `auth/2fa/disable` | POST `{password, code}` | admin + CSRF | code = TOTP or a recovery code; bumps the epoch |
| `auth/me` | GET | session | `{authenticated, csrf}` |
| `auth/logout` | POST | admin + CSRF | destroy session |
| `settings/admin` | GET | admin | `{phone, chatIdMasked, botUsername}` (bot username fetched once via `getMe` and cached in `admin_settings.json`) |
| `settings/telegram/request` | POST `{newChatId?, newPhone?, currentPassword}` | admin + CSRF (+ current password in password mode) | probe message to the new chat id (422 if Telegram rejects it), then OTP sent to the OLD chat id only; 3 per 10 min per session+IP |
| `settings/telegram/confirm` | POST `{otp}` | admin + CSRF | 5 attempts then 429 and pending cleared; on success writes `data/admin_settings.json` and notifies old and new chat |
| `upload` | POST multipart `file`, `category` | admin + CSRF | JPG/PNG/WebP/GIF only (finfo + getimagesize), 5MB, random name, appended to `media` |

If Telegram cannot deliver the OTP, `auth/otp` returns 502 and no OTP stays valid.

Effective admin phone and chat id come from `data/admin_settings.json` when present, otherwise from `config.php`. The bot token is only ever read from `config.php`.

## Admin login modes and recovery

Two modes, decided by whether `data/admin_account.json` exists:

- **bootstrap** (no account): the Telegram OTP login works; afterwards the dashboard asks for an email + password (Security tab). Creating the account switches the site to password mode and disables `auth/otp` / `auth/verify`.
- **password**: only `auth/login` works. Optional TOTP 2FA needs `auth_key` in `config.php` (see `config.sample.php`: 32 random bytes in base64); it encrypts the TOTP secret at rest.

There is no web "forgot password". If the password (or the 2FA device and recovery codes) is lost, SSH to the server and run as the site user (not root):

```bash
php server/bin/reset-admin.php          # asks to type RESET; --yes skips the prompt
```

It backs up and deletes `data/admin_account.json`, deletes all session and login-lock files, sends a Telegram alert and returns the site to bootstrap mode. The script refuses to run under a web SAPI. If `auth_key` is lost while 2FA is on, the same reset is the recovery. Manual checklist: `docs/ADMIN_AUTH.md`.

## Local development

```bash
cp server/config.sample.php server/config.php   # set cookie_secure => false for http://localhost
php -S 127.0.0.1:8080 -t server/api              # backend
npm run dev                                      # Vite proxies /api -> 127.0.0.1:8080
```

For tests without real Telegram, set `telegram_api_base` to a local stub and use a token of the form
`123456:ABCdef...`. Uploaded files are not served by Vite in dev (use a real nginx for that).

## Smoke test

`server/tests/smoke.sh` checks the API end to end on any Linux box with bash, curl and PHP 8.3 (`curl`, `mbstring`, `fileinfo`):

```bash
bash server/tests/smoke.sh            # optional: PHP_BIN=php8.3 APP_PORT=18080 STUB_PORT=18081
```

It copies `server/` (including `server/seo/`) into a temp app root with its own config, starts `php -S` for the API and for a stub Telegram server (to read the OTP), and prints PASS/FAIL per check. It exits non-zero when anything fails and removes the temp dir. It never uses real data or the real Telegram API. Checks: `php -l` on every file (including `server/bin`); email/password login, lockouts, password policy, 2FA (RFC 6238 vectors), epoch/idle logic and `reset-admin.php`; anonymous 401s (leads, media, consignment PUT, upload); foreign Origin 403; OTP login through the stub; PUT without/with a wrong CSRF token 403; invalid consignment status/price/size/shape 422; public consignments hide drafts and private keys while the admin sees them (plus cache headers); upload of PHP code 415; OTP lockout 429; the new `seo`/`slug`/`company.seo` write validation (422 cases); the SEO shell (head injection, escaping of hostile titles in the head and in JSON-LD, 404/301/noindex rules, sitemap/robots/Google file, 304, canonical host, `indexSite=false`, missing/corrupt data, broken config fallback) on extra `php -S` instances (ports `SEO_PORT`=18082, `BROKEN_PORT`=18083); and the derivation vectors in `server/tests/seo-vectors.json`, which `node scripts/check-seo.mjs` runs against `src/utils/seo.ts`.

## Rotating the Telegram bot token

The previous token was committed to git history and shipped in a public JS bundle. Revoke it with
BotFather (`/revoke`) and put only the new token in `server/config.php`.
