#!/usr/bin/env bash
# Safe deploy: build locally, back up user data on the server, swap ONLY the app files.
# It never touches public_html/uploads, data/ or server/config.php, and never deletes a glob of public_html.
#
# Required env:  DEPLOY_HOST (ssh alias)  APP_ROOT (e.g. /home/site)  SITE_USER  SITE_GROUP
#                SITE_URL (public base URL used for the post-deploy checks, no trailing slash)
# Optional env:  PHP_FPM_SERVICE (default php8.3-fpm)
#                REMOTE_SUDO (default "sudo -n"; set to an empty string if the ssh user owns everything)
set -euo pipefail

: "${DEPLOY_HOST:?set DEPLOY_HOST (ssh alias)}"
: "${APP_ROOT:?set APP_ROOT (e.g. /home/site)}"
: "${SITE_USER:?set SITE_USER}"
: "${SITE_GROUP:?set SITE_GROUP}"
: "${SITE_URL:?set SITE_URL (e.g. https://example.com)}"
PHP_FPM_SERVICE="${PHP_FPM_SERVICE:-php8.3-fpm}"
REMOTE_SUDO="${REMOTE_SUDO-sudo -n}"

case "$APP_ROOT" in
  /?*) ;;
  *) echo "APP_ROOT must be an absolute path" >&2; exit 1 ;;
esac

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

echo "==> Building"
npm run build

if [ ! -f dist/index.html ]; then
  echo "dist/index.html is missing: refusing to deploy" >&2
  exit 1
fi
if [ -e dist/api ] || [ -e dist/uploads ] || [ -e dist/config.php ]; then
  echo "dist/ must not contain api/, uploads/ or config.php: refusing to deploy" >&2
  exit 1
fi

echo "==> Scanning dist for secrets"
if grep -rEl '[0-9]{8,12}:[A-Za-z0-9_-]{30,}' dist; then
  echo "A Telegram-token-shaped string is in dist/ (files above): aborting" >&2
  exit 1
fi

TS="$(date +%Y%m%d-%H%M%S)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "==> Packing"
tar -czf "$WORK/dist.tgz" -C dist .
tar -czf "$WORK/api.tgz" -C server/api .
tar -czf "$WORK/src.tgz" -C server/src .
tar -czf "$WORK/seed.tgz" -C server/seed .

STAGE="$APP_ROOT/.deploy-incoming/$TS"
echo "==> Uploading to $DEPLOY_HOST:$STAGE"
ssh "$DEPLOY_HOST" "mkdir -p -- $(printf '%q' "$STAGE")"
scp -q "$WORK"/dist.tgz "$WORK"/api.tgz "$WORK"/src.tgz "$WORK"/seed.tgz "$DEPLOY_HOST:$STAGE/"

echo "==> Deploying on the server"
{
  printf 'APP_ROOT=%q\nSTAGE=%q\nTS=%q\nSITE_USER=%q\nSITE_GROUP=%q\nPHP_FPM_SERVICE=%q\nREMOTE_SUDO=%q\n' \
    "$APP_ROOT" "$STAGE" "$TS" "$SITE_USER" "$SITE_GROUP" "$PHP_FPM_SERVICE" "$REMOTE_SUDO"
  cat <<'REMOTE'
set -euo pipefail
PUBLIC="$APP_ROOT/public_html"
BACKUPS="$APP_ROOT/backups"

[ -d "$PUBLIC" ] || { echo "$PUBLIC does not exist" >&2; exit 1; }
[ -f "$APP_ROOT/server/config.php" ] || { echo "server/config.php is missing: not a configured app root" >&2; exit 1; }

mkdir -p "$STAGE/dist" "$STAGE/api" "$STAGE/src" "$STAGE/seed"
tar -xzf "$STAGE/dist.tgz" -C "$STAGE/dist"
tar -xzf "$STAGE/api.tgz" -C "$STAGE/api"
tar -xzf "$STAGE/src.tgz" -C "$STAGE/src"
tar -xzf "$STAGE/seed.tgz" -C "$STAGE/seed"

echo "-- php -l"
find "$STAGE/api" "$STAGE/src" -name '*.php' -print0 | xargs -0 -n1 php -l >/dev/null

echo "-- backup of uploads + data"
mkdir -p "$BACKUPS"
chmod 700 "$BACKUPS"
BACKUP_ITEMS=()
[ -d "$PUBLIC/uploads" ] && BACKUP_ITEMS+=("public_html/uploads")
[ -d "$APP_ROOT/data" ] && BACKUP_ITEMS+=("data")
if [ "${#BACKUP_ITEMS[@]}" -gt 0 ]; then
  tar -czf "$BACKUPS/pre-deploy-$TS.tgz" -C "$APP_ROOT" "${BACKUP_ITEMS[@]}"
  chmod 600 "$BACKUPS/pre-deploy-$TS.tgz"
  tar -tzf "$BACKUPS/pre-deploy-$TS.tgz" >/dev/null
fi
# keep the 14 newest backups
ls -1t "$BACKUPS"/pre-deploy-*.tgz 2>/dev/null | tail -n +15 | while IFS= read -r old; do rm -f -- "$old"; done

echo "-- replacing dist files (uploads/ and api/ are never touched)"
find "$PUBLIC" -mindepth 1 -maxdepth 1 ! -name uploads ! -name api -exec rm -r -- {} +
cp -a "$STAGE/dist/." "$PUBLIC/"
mkdir -p "$PUBLIC/api"
cp -a "$STAGE/api/." "$PUBLIC/api/"

echo "-- replacing server/src and server/seed (config.php untouched)"
for part in src seed; do
  target="$APP_ROOT/server/$part"
  [ -e "$target" ] && mv -- "$target" "$target.prev-$TS"
  mv -- "$STAGE/$part" "$target"
  rm -r -- "$target.prev-$TS" 2>/dev/null || true
done

echo "-- permissions"
$REMOTE_SUDO chown -R "$SITE_USER:$SITE_GROUP" "$APP_ROOT/server/src" "$APP_ROOT/server/seed"
find "$PUBLIC" -path "$PUBLIC/uploads" -prune -o -exec $REMOTE_SUDO chown -h "$SITE_USER:$SITE_GROUP" {} +
find "$PUBLIC" -path "$PUBLIC/uploads" -prune -o -type d -exec chmod 755 {} +
find "$PUBLIC" -path "$PUBLIC/uploads" -prune -o -type f -exec chmod 644 {} +
find "$APP_ROOT/server/src" "$APP_ROOT/server/seed" -type d -exec chmod 750 {} +
find "$APP_ROOT/server/src" "$APP_ROOT/server/seed" -type f -exec chmod 640 {} +

echo "-- reloading $PHP_FPM_SERVICE"
$REMOTE_SUDO systemctl reload "$PHP_FPM_SERVICE"

rm -r -- "$STAGE"
echo "-- server side done (backup: $BACKUPS/pre-deploy-$TS.tgz)"
REMOTE
} | ssh "$DEPLOY_HOST" bash -s

echo "==> Post-deploy checks against $SITE_URL"
fail=0
check_status() {
  local label="$1" url="$2" want="$3" got
  got="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$url" || true)"
  if [ "$want" = "ok" ] && [ "$got" = "200" ]; then
    echo "OK   $label ($got)"
  elif [ "$want" = "not200" ] && [ "$got" != "200" ]; then
    echo "OK   $label ($got)"
  else
    echo "FAIL $label (got $got)" >&2
    fail=1
  fi
}
check_status "home page" "$SITE_URL/" ok
check_status "api auth/me" "$SITE_URL/api/index.php?r=auth/me" ok
check_status "server/config.php is not public" "$SITE_URL/server/config.php" not200

if [ "$fail" -ne 0 ]; then
  echo "Deploy finished but a check failed: investigate now. Restore steps are in server/README.md." >&2
  exit 1
fi
echo "Deploy OK ($TS)"
