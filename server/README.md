# Backend (PHP 8.3 + JSON files)

Small same-origin API for the SPA. No database, no Node on the server. Secrets live only in
`server/config.php` on the server (gitignored).

## Layout on the server

```
/var/www/phuongnam/              <- app root (NOT served by nginx)
  data/                          <- JSON collections, backups, OTP, rate limits, sessions (created on first use)
  server/
    config.php                   <- real secrets, never committed
    src/  seed/                  <- from this repo's server/src and server/seed
  public_html/                   <- nginx root (contents of `dist/`)
    api/index.php                <- from this repo's server/api/index.php
    uploads/                     <- admin image uploads (written by PHP)
```

`api/index.php` finds the shared code at `<app root>/server/` (two levels above `api/`). The same
relative layout works in this repo for local runs (`server/api` -> repo root -> `server/`).

## Requirements

PHP 8.3 FPM with `curl`, `mbstring`, `fileinfo` (core `json`, `session`, `openssl`).
Suggested php.ini for the pool: `upload_max_filesize = 6M`, `post_max_size = 8M`, `expose_php = Off`.

## Deploy

```bash
# 1. build the SPA locally
npm ci && npm run build

# 2. upload (never --delete the api/ or uploads/ directories)
rsync -a --delete --exclude 'api/' --exclude 'uploads/' dist/ user@host:/var/www/phuongnam/public_html/
rsync -a server/api/  user@host:/var/www/phuongnam/public_html/api/
rsync -a --delete server/src/  user@host:/var/www/phuongnam/server/src/
rsync -a --delete server/seed/ user@host:/var/www/phuongnam/server/seed/

# 3. one-time on the server
cd /var/www/phuongnam
cp server/config.sample.php server/config.php && $EDITOR server/config.php
mkdir -p data public_html/uploads
chown -R deploy:www-data data server public_html/uploads
chmod 750 server server/src server/seed data
chmod 640 server/config.php server/src/*.php
chmod 770 data public_html/uploads         # php-fpm (group www-data) must write here
chmod 755 public_html/uploads              # if you prefer: 750 + nginx in the same group
```

Collections are seeded from `server/seed/*.json` into `data/` on first access (only when the file is
missing). Data files are written with `flock` + temp file + `rename`; the last 10 versions of each
collection are kept in `data/backups/`.

## nginx

The router is `index.php?r=<route>` so the existing `location ~ \.php$` FastCGI block works unchanged.
Only add these (inside the `server { }` of the site):

```nginx
client_max_body_size 6m;                 # uploads are capped at 5MB by PHP

# uploaded files: serve static images only, never execute anything
location ^~ /uploads/ {
    location ~ \.php$ { deny all; }
    add_header X-Content-Type-Options nosniff always;
    try_files $uri =404;
}
```

Serve the site over HTTPS only: the session cookie is `Secure`, `HttpOnly`, `SameSite=Strict`
(path `/api/`). Keep `server/` and `data/` outside the nginx root.

## Routes (all `GET|POST|PUT /api/index.php?r=...`)

| Route | Method | Auth | Purpose |
|-|-|-|-|
| `data&c=<name>` | GET | public for properties, projects, news, agents, consignments, company, filters, menu; admin for customer_leads, media | read a collection |
| `data&c=<name>` | PUT | admin + `X-CSRF-Token` | replace a collection (JSON, max 2MB, shape-validated) |
| `lead` | POST | public | contact/consignment form: validated, honeypot `website`, 5 per 10 min per IP, saved, Telegram notice |
| `auth/otp` | POST `{phone}` | public | admin phone only; OTP stored as hash, 3 min TTL, 3 sends per 10 min per IP |
| `auth/verify` | POST `{otp}` | public | 5 attempts per OTP (then 429), regenerates session, returns CSRF token |
| `auth/me` | GET | session | `{authenticated, csrf}` |
| `auth/logout` | POST | admin + CSRF | destroy session |
| `upload` | POST multipart `file`, `category` | admin + CSRF | JPG/PNG/WebP/GIF only (finfo + getimagesize), 5MB, random name, appended to `media` |

If Telegram cannot deliver the OTP, `auth/otp` returns 502 and no OTP stays valid.

## Local development

```bash
cp server/config.sample.php server/config.php   # set cookie_secure => false for http://localhost
php -S 127.0.0.1:8080 -t server/api              # backend
npm run dev                                      # Vite proxies /api -> 127.0.0.1:8080
```

For tests without real Telegram, set `telegram_api_base` to a local stub and use a token of the form
`123456:ABCdef...`. Uploaded files are not served by Vite in dev (use a real nginx for that).

## Rotating the Telegram bot token

The previous token was committed to git history and shipped in a public JS bundle. Revoke it with
BotFather (`/revoke`) and put only the new token in `server/config.php`.
