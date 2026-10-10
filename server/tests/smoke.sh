#!/usr/bin/env bash
# Self-contained API smoke test. Needs: bash, curl, php 8.3 (cli with curl/mbstring/fileinfo).
# It copies the PHP code into a throw-away app root, starts `php -S` for the API and for a
# stub Telegram server (to read the OTP), then checks the API with curl. It never touches
# real data or the real Telegram API.
#
#   bash server/tests/smoke.sh          # optional: PHP_BIN=php8.3 APP_PORT=18080 STUB_PORT=18081
set -u

PHP_BIN="${PHP_BIN:-php}"
APP_PORT="${APP_PORT:-18080}"
STUB_PORT="${STUB_PORT:-18081}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ROOT="$(mktemp -d)"
BASE="http://127.0.0.1:${APP_PORT}/api/index.php"
JAR="$ROOT/cookies.txt"
BODY="$ROOT/body.txt"
HEADERS="$ROOT/headers.txt"
STUB_LOG="$ROOT/telegram.log"
ADMIN_PHONE="0900000000"
PASS=0
FAIL=0
PIDS=()

cleanup() {
  for pid in "${PIDS[@]:-}"; do
    [ -n "$pid" ] && kill "$pid" 2>/dev/null
  done
  rm -rf "$ROOT"
}
trap cleanup EXIT

check() { # name expected actual
  if [ "$2" = "$3" ]; then
    echo "PASS  $1"
    PASS=$((PASS + 1))
  else
    echo "FAIL  $1 (expected $2, got $3)"
    FAIL=$((FAIL + 1))
  fi
}

body_has() { # name needle
  if grep -q -- "$2" "$BODY"; then
    echo "PASS  $1"
    PASS=$((PASS + 1))
  else
    echo "FAIL  $1 (missing: $2)"
    FAIL=$((FAIL + 1))
  fi
}

body_lacks() { # name needle
  if grep -q -- "$2" "$BODY"; then
    echo "FAIL  $1 (unexpected: $2)"
    FAIL=$((FAIL + 1))
  else
    echo "PASS  $1"
    PASS=$((PASS + 1))
  fi
}

header_has() { # name extended-regex
  if grep -qiE -- "$2" "$HEADERS"; then
    echo "PASS  $1"
    PASS=$((PASS + 1))
  else
    echo "FAIL  $1 (header not matching: $2)"
    FAIL=$((FAIL + 1))
  fi
}

# Prints the HTTP status; the body goes to $BODY and the response headers to $HEADERS.
http() {
  curl -s -o "$BODY" -D "$HEADERS" -w '%{http_code}' "$@"
}

last_otp() {
  grep -o 'code>[0-9]\{6\}' "$STUB_LOG" | tail -n 1 | grep -o '[0-9]\{6\}'
}

wait_for() { # url
  for _ in $(seq 1 50); do
    curl -s -o /dev/null "$1" && return 0
    sleep 0.2
  done
  return 1
}

command -v "$PHP_BIN" >/dev/null || { echo "php not found (set PHP_BIN)"; exit 2; }
command -v curl >/dev/null || { echo "curl not found"; exit 2; }

# App root: <root>/web/api/index.php, <root>/server/{src,seed,config.php}, <root>/data, <root>/uploads
mkdir -p "$ROOT/web/api" "$ROOT/server" "$ROOT/data" "$ROOT/uploads"
cp "$REPO/server/api/index.php" "$ROOT/web/api/index.php"
cp -r "$REPO/server/src" "$REPO/server/seed" "$ROOT/server/"
cat > "$ROOT/server/config.php" <<PHPCFG
<?php
return [
    'telegram_bot_token' => '123456:ABCdef_smoke-test-token',
    'telegram_admin_chat_id' => '1',
    'telegram_api_base' => 'http://127.0.0.1:${STUB_PORT}',
    'admin_phone' => '${ADMIN_PHONE}',
    'data_dir' => '${ROOT}/data',
    'session_dir' => '${ROOT}/data/sessions',
    'uploads_dir' => '${ROOT}/uploads',
    'uploads_url' => '/uploads/',
    'cookie_secure' => false,
];
PHPCFG

echo "== php -l on every server file"
lint_failures=0
for f in "$REPO"/server/api/*.php "$REPO"/server/src/*.php; do
  "$PHP_BIN" -l "$f" >/dev/null 2>&1 || { echo "FAIL  php -l $f"; lint_failures=$((lint_failures + 1)); }
done
check "php -l (all files)" 0 "$lint_failures"

# Stub Telegram: logs every request body and answers ok:true.
cat > "$ROOT/stub.php" <<PHPSTUB
<?php
file_put_contents('${STUB_LOG}', file_get_contents('php://input') . "\n", FILE_APPEND);
header('Content-Type: application/json');
echo '{"ok":true,"result":{"message_id":1,"username":"smoke_bot"}}';
PHPSTUB
"$PHP_BIN" -S "127.0.0.1:${STUB_PORT}" "$ROOT/stub.php" >/dev/null 2>&1 &
PIDS+=($!)
"$PHP_BIN" -S "127.0.0.1:${APP_PORT}" -t "$ROOT/web" >"$ROOT/app.log" 2>&1 &
PIDS+=($!)
wait_for "$BASE?r=auth/me" || { echo "API did not start:"; cat "$ROOT/app.log"; exit 2; }

JSON='Content-Type: application/json'

echo "== anonymous access"
check "GET customer_leads without session -> 401" 401 "$(http "$BASE?r=data&c=customer_leads")"
check "GET media without session -> 401" 401 "$(http "$BASE?r=data&c=media")"
check "GET auth/me anonymous -> 200" 200 "$(http "$BASE?r=auth/me")"
body_has "auth/me says not authenticated" '"authenticated":false'
check "PUT consignments without session -> 401" 401 "$(http -X PUT -H "$JSON" --data '[]' "$BASE?r=data&c=consignments")"
check "POST upload without session -> 401" 401 "$(http -X POST -F 'file=@/dev/null' "$BASE?r=upload")"

echo "== cross-origin"
check "OTP request from a foreign Origin -> 403" 403 \
  "$(http -X POST -H 'Origin: http://evil.example' -H "$JSON" --data "{\"phone\":\"${ADMIN_PHONE}\"}" "$BASE?r=auth/otp")"
check "lead from a foreign Origin -> 403" 403 \
  "$(http -X POST -H 'Origin: http://evil.example' -H "$JSON" --data '{"fullName":"Test User","phone":"0901234567","purpose":"ban"}' "$BASE?r=lead")"

echo "== admin login through the OTP stub"
check "wrong phone -> 403" 403 "$(http -X POST -H "$JSON" --data '{"phone":"0911111111"}' "$BASE?r=auth/otp")"
check "OTP request -> 200" 200 "$(http -X POST -H "$JSON" --data "{\"phone\":\"${ADMIN_PHONE}\"}" "$BASE?r=auth/otp")"
OTP="$(last_otp)"
check "OTP delivered to the Telegram stub (6 digits)" 6 "${#OTP}"
check "OTP verify -> 200" 200 "$(http -c "$JAR" -X POST -H "$JSON" --data "{\"otp\":\"${OTP}\"}" "$BASE?r=auth/verify")"
CSRF="$(sed -n 's/.*"csrf":"\([^"]*\)".*/\1/p' "$BODY")"
check "CSRF token returned (64 chars)" 64 "${#CSRF}"
check "authenticated GET customer_leads -> 200" 200 "$(http -b "$JAR" "$BASE?r=data&c=customer_leads")"

echo "== consignments: write validation"
GOOD='[
 {"id":"c-pub","slug":"tin-dang","status":"published","title":"PUBLISHED-MARKER","price":4.5,"images":["/images/a.svg"],"_hidden":"UNDERSCORE-SECRET","internalNote":"NOTE-SECRET","ownerPhone":"0900111222","leadId":"lead-1"},
 {"id":"c-draft","slug":"tin-nhap","status":"draft","title":"DRAFT-MARKER"},
 {"id":"c-sold","slug":"tin-ban","status":"sold","title":"SOLD-MARKER"},
 {"id":"c-legacy","slug":"tin-cu","name":"LEGACY-MARKER","category":"can-ho"}
]'
LONG_TITLE="$(head -c 400 /dev/zero | tr '\0' 'a')"
put() { # json [extra curl args...]
  local json=$1
  shift
  http -b "$JAR" -X PUT -H "$JSON" "$@" --data "$json" "$BASE?r=data&c=consignments"
}
check "PUT without CSRF token -> 403" 403 "$(put "$GOOD")"
check "PUT with a wrong CSRF token -> 403" 403 "$(put "$GOOD" -H 'X-CSRF-Token: nope')"
check "PUT from a foreign Origin -> 403" 403 "$(put "$GOOD" -H "X-CSRF-Token: $CSRF" -H 'Origin: http://evil.example')"
check "PUT invalid status -> 422" 422 "$(put '[{"id":"x","status":"hacked","title":"t"}]' -H "X-CSRF-Token: $CSRF")"
check "PUT price as string -> 422" 422 "$(put '[{"id":"x","status":"draft","price":"1"}]' -H "X-CSRF-Token: $CSRF")"
check "PUT oversized title -> 422" 422 "$(put "[{\"id\":\"x\",\"title\":\"${LONG_TITLE}\"}]" -H "X-CSRF-Token: $CSRF")"
check "PUT item without id -> 422" 422 "$(put '[{"title":"no id"}]' -H "X-CSRF-Token: $CSRF")"
check "PUT non-list -> 422" 422 "$(put '{"a":1}' -H "X-CSRF-Token: $CSRF")"
check "PUT valid list -> 200" 200 "$(put "$GOOD" -H "X-CSRF-Token: $CSRF")"

echo "== consignments: public vs admin view"
check "public GET -> 200" 200 "$(http "$BASE?r=data&c=consignments")"
body_has "public sees published" 'PUBLISHED-MARKER'
body_has "public sees sold" 'SOLD-MARKER'
body_has "public sees legacy item without status" 'LEGACY-MARKER'
body_lacks "public does not see drafts" 'DRAFT-MARKER'
body_lacks "public does not see _ keys" 'UNDERSCORE-SECRET'
body_lacks "public does not see internalNote" 'NOTE-SECRET'
body_lacks "public does not see ownerPhone" '0900111222'
body_lacks "public does not see leadId" 'lead-1'
header_has "public view is revalidated (no-cache)" '^cache-control:.*no-cache'
header_has "public view varies on Cookie" '^vary:.*cookie'
check "admin GET -> 200" 200 "$(http -b "$JAR" "$BASE?r=data&c=consignments")"
body_has "admin sees drafts" 'DRAFT-MARKER'
body_has "admin sees internalNote" 'NOTE-SECRET'
header_has "admin view is no-store" '^cache-control:.*no-store'

echo "== leads"
check "public lead -> 200" 200 "$(http -X POST -H "$JSON" --data '{"fullName":"Smoke Tester","phone":"0901234567","purpose":"ban","source":"consignment","region":"quan-2"}' "$BASE?r=lead")"
check "admin GET customer_leads -> 200" 200 "$(http -b "$JAR" "$BASE?r=data&c=customer_leads")"
body_has "lead stored with status new" '"status": "new"'

echo "== upload"
printf '<?php echo "pwned"; ?>' > "$ROOT/evil.php"
check "upload of PHP code posing as PNG -> 415" 415 "$(http -b "$JAR" -X POST -H "X-CSRF-Token: $CSRF" -F "file=@$ROOT/evil.php;type=image/png;filename=evil.png" -F category=general "$BASE?r=upload")"
check "upload of evil.php -> 415" 415 "$(http -b "$JAR" -X POST -H "X-CSRF-Token: $CSRF" -F "file=@$ROOT/evil.php;type=image/jpeg;filename=evil.php" -F category=general "$BASE?r=upload")"
check "nothing landed in uploads" 0 "$(find "$ROOT/uploads" -type f | wc -l | tr -d ' ')"

echo "== OTP lockout"
check "second OTP request -> 200" 200 "$(http -X POST -H "$JSON" --data "{\"phone\":\"${ADMIN_PHONE}\"}" "$BASE?r=auth/otp")"
REAL="$(last_otp)"
WRONG=111111
[ "$REAL" = "$WRONG" ] && WRONG=222222
for i in 1 2 3 4 5; do
  check "wrong OTP attempt $i -> 401" 401 "$(http -X POST -H "$JSON" --data "{\"otp\":\"${WRONG}\"}" "$BASE?r=auth/verify")"
done
check "attempt 6 is locked, even with the right code -> 429" 429 "$(http -X POST -H "$JSON" --data "{\"otp\":\"${REAL}\"}" "$BASE?r=auth/verify")"

echo
echo "Result: ${PASS} passed, ${FAIL} failed"
[ "$FAIL" -eq 0 ]
