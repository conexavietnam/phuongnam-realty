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
# php-fpm pool: add <app root>/server, <app root>/data and <app root>/uploads to open_basedir
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
2. uploads tarballs of `dist`, `server/api`, `server/src` and `server/seed` to a staging dir
   (`$APP_ROOT/.deploy-incoming/<timestamp>`);
3. on the server: `php -l` on every PHP file, then a timestamped backup
   `$APP_ROOT/backups/pre-deploy-<timestamp>.tgz` of `uploads` and `data` (dir mode 700,
   newest 14 kept);
4. replaces the built files in `public_html/`, then installs `server/api`, `server/src` and
   `server/seed`. It never touches `uploads/`, `data/` or `server/config.php`;
5. fixes permissions (public files 755/644, `server/src` and `server/seed` 750/640), reloads php-fpm;
6. checks from your machine: home page 200, `api/index.php?r=auth/me` 200, `/server/config.php` not 200.

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

The pool's `open_basedir` must include `<app root>/server`, `<app root>/data` and `<app root>/uploads`.

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
| `settings/admin` | GET | admin | `{phone, chatIdMasked, botUsername}` (bot username fetched once via `getMe` and cached in `admin_settings.json`) |
| `settings/telegram/request` | POST `{newChatId?, newPhone?}` | admin + CSRF | probe message to the new chat id (422 if Telegram rejects it), then OTP sent to the OLD chat id only; 3 per 10 min per session+IP |
| `settings/telegram/confirm` | POST `{otp}` | admin + CSRF | 5 attempts then 429 and pending cleared; on success writes `data/admin_settings.json` and notifies old and new chat |
| `upload` | POST multipart `file`, `category` | admin + CSRF | JPG/PNG/WebP/GIF only (finfo + getimagesize), 5MB, random name, appended to `media` |

If Telegram cannot deliver the OTP, `auth/otp` returns 502 and no OTP stays valid.

Effective admin phone and chat id come from `data/admin_settings.json` when present, otherwise from `config.php`. The bot token is only ever read from `config.php`.

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
