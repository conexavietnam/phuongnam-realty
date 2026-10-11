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
ALL_BODIES="$ROOT/all_bodies.txt"
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
  local code
  code="$(curl -s -o "$BODY" -D "$HEADERS" -w '%{http_code}' "$@")"
  cat "$BODY" >> "$ALL_BODIES"
  printf '%s' "$code"
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
cp -r "$REPO/server/src" "$REPO/server/seed" "$REPO/server/bin" "$ROOT/server/"
AUTH_KEY="$("$PHP_BIN" -r 'echo base64_encode(random_bytes(32));')"
write_config() { # base64 auth key ("" = not configured)
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
    'auth_key' => '$1',
];
PHPCFG
}
write_config "$AUTH_KEY"

echo "== php -l on every server file"
lint_failures=0
for f in "$REPO"/server/api/*.php "$REPO"/server/src/*.php "$REPO"/server/bin/*.php; do
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
"$PHP_BIN" -d opcache.enable=0 -S "127.0.0.1:${APP_PORT}" -t "$ROOT/web" >"$ROOT/app.log" 2>&1 &
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
 {"id":"c-legacy","slug":"tin-cu","name":"LEGACY-MARKER","category":"can-ho"},
 {"id":"c-prop","slug":"tin-chuyen-nhuong","status":"published","section":"chuyen-nhuong","title":"PROMOTED-PROPERTY-MARKER","floor":"Tang 5","view":"Song","internalNote":"PROP-NOTE-SECRET"},
 {"id":"c-proj","slug":"tin-du-an","status":"sold","section":"du-an","title":"PROMOTED-PROJECT-MARKER","investor":"CDT","projectStatus":"Dang mo ban","priceFrom":"3 Ty","categoryLabel":"Can ho","highlights":["a","b"],"leadId":"lead-2"},
 {"id":"c-prop-draft","slug":"tin-nhap-2","status":"draft","section":"du-an","title":"PROMOTED-DRAFT-MARKER"}
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
check "PUT invalid section -> 422" 422 "$(put '[{"id":"x","section":"hacked","title":"t"}]' -H "X-CSRF-Token: $CSRF")"
check "PUT section as array -> 422" 422 "$(put '[{"id":"x","section":["ky-gui"]}]' -H "X-CSRF-Token: $CSRF")"
check "PUT too many highlights -> 422" 422 "$(put "[{\"id\":\"x\",\"highlights\":[$(printf '"a",%.0s' $(seq 1 20))\"b\"]}]" -H "X-CSRF-Token: $CSRF")"
check "PUT highlights not strings -> 422" 422 "$(put '[{"id":"x","highlights":[1,2]}]' -H "X-CSRF-Token: $CSRF")"
check "PUT oversized investor -> 422" 422 "$(put "[{\"id\":\"x\",\"investor\":\"$(head -c 300 /dev/zero | tr '\0' 'a')\"}]" -H "X-CSRF-Token: $CSRF")"
check "PUT valid list -> 200" 200 "$(put "$GOOD" -H "X-CSRF-Token: $CSRF")"

echo "== consignments: public vs admin view"
check "public GET -> 200" 200 "$(http "$BASE?r=data&c=consignments")"
body_has "public sees published" 'PUBLISHED-MARKER'
body_has "public sees sold" 'SOLD-MARKER'
body_has "public sees legacy item without status" 'LEGACY-MARKER'
body_has "public sees published promoted property" 'PROMOTED-PROPERTY-MARKER'
body_has "public sees sold promoted project" 'PROMOTED-PROJECT-MARKER'
body_has "public keeps the section key" '"section":"chuyen-nhuong"'
body_lacks "public does not see promoted drafts" 'PROMOTED-DRAFT-MARKER'
body_lacks "public does not see promoted internalNote" 'PROP-NOTE-SECRET'
body_lacks "public does not see promoted leadId" 'lead-2'
body_lacks "public does not see drafts" '"DRAFT-MARKER'
body_lacks "public does not see _ keys" 'UNDERSCORE-SECRET'
body_lacks "public does not see internalNote" 'NOTE-SECRET'
body_lacks "public does not see ownerPhone" '0900111222'
body_lacks "public does not see leadId" 'lead-1'
header_has "public view is revalidated (no-cache)" '^cache-control:.*no-cache'
header_has "public view varies on Cookie" '^vary:.*cookie'
check "admin GET -> 200" 200 "$(http -b "$JAR" "$BASE?r=data&c=consignments")"
body_has "admin sees drafts" '"DRAFT-MARKER'
body_has "admin sees promoted drafts" 'PROMOTED-DRAFT-MARKER'
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

# ---------------------------------------------------------------------------------------------
# Email + password login, account management, TOTP 2FA, reset script
# ---------------------------------------------------------------------------------------------
EMAIL="admin@example.test"
PASS1="Kx9#mPq2-vLw8zRt"
EMAIL2="boss@example.test"
PASS2="Zy7!rQw4-nB3xLmP"
GENERIC='Email hoặc mật khẩu không đúng'

reset_limits() { rm -rf "$ROOT/data/ratelimit" "$ROOT/data/auth_locks"; }
csrf_of() { sed -n 's/.*"csrf":"\([^"]*\)".*/\1/p' "$BODY"; }
sid_of() { awk '$6 == "pn_sid" { print $7 }' "$1"; }
jpost() { # route json [extra curl args...]  (no session)
  local route=$1 json=$2
  shift 2
  http -X POST -H "$JSON" "$@" --data "$json" "$BASE?r=$route"
}
login() { # email password [extra curl args...]
  local email=$1 password=$2
  shift 2
  jpost auth/login "{\"email\":\"${email}\",\"password\":\"${password}\"}" "$@"
}
admin_post() { # jar csrf route json
  http -b "$1" -X POST -H "$JSON" -H "X-CSRF-Token: $2" --data "$4" "$BASE?r=$3"
}
setacct() { admin_post "$JAR" "$CSRF" auth/account/set "$1"; }
totp_code() { # base32-secret [offset-seconds]
  "$PHP_BIN" -r 'require $argv[1]; echo pn_totp_code(pn_base32_decode($argv[2]), intdiv(time() + (int) $argv[3], 30));' \
    "$ROOT/server/src/totp.php" "$1" "${2:-0}"
}
rfc_vector() { # unix time
  "$PHP_BIN" -r 'require $argv[1]; echo pn_totp_code("12345678901234567890", intdiv((int) $argv[2], 30));' \
    "$ROOT/server/src/totp.php" "$1"
}
session_file() { echo "$ROOT/data/sessions/sess_$(sid_of "$1")"; }

echo "== TOTP primitives (RFC 6238 test vectors, SHA-1, 6 digits)"
check "RFC 6238 T=59" 287082 "$(rfc_vector 59)"
check "RFC 6238 T=1111111109" 081804 "$(rfc_vector 1111111109)"
check "RFC 6238 T=1111111111" 050471 "$(rfc_vector 1111111111)"
check "RFC 6238 T=1234567890" 005924 "$(rfc_vector 1234567890)"
check "RFC 6238 T=2000000000" 279037 "$(rfc_vector 2000000000)"
check "RFC 6238 T=20000000000" 353130 "$(rfc_vector 20000000000)"
check "base32 encode of the RFC secret" GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ \
  "$("$PHP_BIN" -r 'require $argv[1]; echo pn_base32_encode("12345678901234567890");' "$ROOT/server/src/totp.php")"
check "base32 round trip" 12345678901234567890 \
  "$("$PHP_BIN" -r 'require $argv[1]; echo pn_base32_decode("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");' "$ROOT/server/src/totp.php")"
check "a step that is not newer than last_step is rejected" none \
  "$("$PHP_BIN" -r 'require $argv[1]; $s = "12345678901234567890"; $c = pn_totp_code($s, 10); $r = pn_totp_verify($s, $c, 10, 315); echo $r === null ? "none" : $r;' "$ROOT/server/src/totp.php")"
check "a newer step inside the +-1 window is accepted" 10 \
  "$("$PHP_BIN" -r 'require $argv[1]; $s = "12345678901234567890"; $c = pn_totp_code($s, 10); $r = pn_totp_verify($s, $c, 9, 315); echo $r === null ? "none" : $r;' "$ROOT/server/src/totp.php")"

echo "== mode and endpoint protection (bootstrap)"
check "auth/mode -> 200" 200 "$(http "$BASE?r=auth/mode")"
body_has "mode is bootstrap" '"mode":"bootstrap"'
body_has "twofa is always false" '"twofa":false'
check "auth/login in bootstrap -> 403" 403 "$(login "$EMAIL" "$PASS1")"
body_has "bootstrap login answer" 'Không khả dụng'
check "GET auth/account without session -> 401" 401 "$(http "$BASE?r=auth/account")"
for route in auth/account/set auth/logout-all auth/2fa/begin auth/2fa/enable auth/2fa/disable; do
  check "POST $route without session -> 401" 401 "$(jpost "$route" '{}')"
  check "POST $route without CSRF -> 403" 403 "$(http -b "$JAR" -X POST -H "$JSON" --data '{}' "$BASE?r=$route")"
  check "POST $route from a foreign Origin -> 403" 403 \
    "$(http -b "$JAR" -X POST -H "$JSON" -H "X-CSRF-Token: $CSRF" -H 'Origin: http://evil.example' --data '{}' "$BASE?r=$route")"
  check "GET $route -> 405" 405 "$(http -b "$JAR" "$BASE?r=$route")"
done
check "login from a foreign Origin -> 403" 403 "$(login "$EMAIL" "$PASS1" -H 'Origin: http://evil.example')"

echo "== second bootstrap session (must die once the account exists)"
reset_limits
check "OTP request for session B -> 200" 200 "$(http -X POST -H "$JSON" --data "{\"phone\":\"${ADMIN_PHONE}\"}" "$BASE?r=auth/otp")"
JAR_B="$ROOT/cookies_b.txt"
check "OTP verify for session B -> 200" 200 "$(http -c "$JAR_B" -X POST -H "$JSON" --data "{\"otp\":\"$(last_otp)\"}" "$BASE?r=auth/verify")"
check "session B works in bootstrap mode" 200 "$(http -b "$JAR_B" "$BASE?r=data&c=customer_leads")"

echo "== password policy (422) and account creation"
LOCAL_PASS="xx-tuan.nguyen-Kp7"
LONG_PASS="$(head -c 129 /dev/zero | tr '\0' 'x')"
check "too short -> 422" 422 "$(setacct "{\"email\":\"$EMAIL\",\"password\":\"Ab1!xyz\"}")"
check "all digits -> 422" 422 "$(setacct "{\"email\":\"$EMAIL\",\"password\":\"918273645546372\"}")"
body_has "all digits reason" 'chữ số'
check "one repeated character -> 422" 422 "$(setacct "{\"email\":\"$EMAIL\",\"password\":\"aaaaaaaaaaaaaa\"}")"
check "contains the email local part -> 422" 422 "$(setacct "{\"email\":\"tuan.nguyen@example.test\",\"password\":\"$LOCAL_PASS\"}")"
check "equals the email -> 422" 422 "$(setacct '{"email":"longlocalpartx@example.test","password":"longlocalpartx@example.test"}')"
check "common password (Vietnamese) -> 422" 422 "$(setacct "{\"email\":\"$EMAIL\",\"password\":\"matkhau123456\"}")"
body_has "common password reason" 'phổ biến'
check "common base word plus symbols -> 422" 422 "$(setacct "{\"email\":\"$EMAIL\",\"password\":\"Password@2024!\"}")"
check "common 12-digit password -> 422" 422 "$(setacct "{\"email\":\"$EMAIL\",\"password\":\"123456789012\"}")"
check "129 characters -> 422" 422 "$(setacct "{\"email\":\"$EMAIL\",\"password\":\"${LONG_PASS}\"}")"
check "invalid email -> 422" 422 "$(setacct "{\"email\":\"not-an-email\",\"password\":\"$PASS1\"}")"
check "email longer than 120 characters -> 422" 422 \
  "$(setacct "{\"email\":\"$(head -c 115 /dev/zero | tr '\0' 'a')@example.test\",\"password\":\"$PASS1\"}")"
check "missing password in bootstrap -> 422" 422 "$(setacct "{\"email\":\"$EMAIL\"}")"
check "no account file after rejected requests" 0 "$([ -f "$ROOT/data/admin_account.json" ] && echo 1 || echo 0)"
check "create the account -> 200" 200 "$(setacct "{\"email\":\"$EMAIL\",\"password\":\"$PASS1\"}")"
check "account file mode is 640" 640 "$(stat -c %a "$ROOT/data/admin_account.json" 2>/dev/null || stat -f %Lp "$ROOT/data/admin_account.json")"
check "password stored as an argon2id or bcrypt hash" 1 "$(grep -cE '"password_hash": "\$(argon2id|2y)\$' "$ROOT/data/admin_account.json")"
check "plain password is not stored anywhere in data/" 0 "$(grep -rlF -- "$PASS1" "$ROOT/data" | wc -l | tr -d ' ')"
check "creating a second account in bootstrap form is no longer possible without the password -> 403" 403 \
  "$(setacct "{\"email\":\"other@example.test\",\"password\":\"Qw3rty-Zx9-Lm2-pK\"}")"

echo "== bootstrap is closed, the creating session survives, other bootstrap sessions die"
check "auth/mode -> 200" 200 "$(http "$BASE?r=auth/mode")"
body_has "mode is password" '"mode":"password"'
check "legacy auth/otp -> 403" 403 "$(http -X POST -H "$JSON" --data "{\"phone\":\"${ADMIN_PHONE}\"}" "$BASE?r=auth/otp")"
body_has "legacy otp answer" 'Không khả dụng'
check "legacy auth/verify -> 403" 403 "$(http -X POST -H "$JSON" --data '{"otp":"123456"}' "$BASE?r=auth/verify")"
check "creating session still works (re-stamped epoch)" 200 "$(http -b "$JAR" "$BASE?r=data&c=customer_leads")"
check "other bootstrap session B is invalid now -> 401" 401 "$(http -b "$JAR_B" "$BASE?r=data&c=customer_leads")"
check "GET auth/account -> 200" 200 "$(http -b "$JAR" "$BASE?r=auth/account")"
body_has "account shows the email" "\"email\":\"$EMAIL\""
body_has "account is configured" '"configured":true'
body_has "2FA off" '"twofaEnabled":false'
grep -q 'Đã thiết lập tài khoản' "$STUB_LOG" && { echo "PASS  Telegram alert for account creation"; PASS=$((PASS + 1)); } || { echo "FAIL  Telegram alert for account creation"; FAIL=$((FAIL + 1)); }

echo "== login: identical failures, session regeneration"
reset_limits
A_CODE="$(login "$EMAIL" "WrongPassword-12345")"
A_BODY="$(cat "$BODY")"
U_CODE="$(login "ghost@example.test" "WrongPassword-12345")"
U_BODY="$(cat "$BODY")"
check "wrong password -> 401" 401 "$A_CODE"
check "unknown email -> same status as wrong password" "$A_CODE" "$U_CODE"
check "unknown email -> byte-identical body" "$A_BODY" "$U_BODY"
check "generic message" "{\"error\":\"$GENERIC\"}" "$A_BODY"
check "empty credentials -> same generic 401" 401 "$(jpost auth/login '{"email":"","password":""}')"
check "non-string credentials -> same generic 401" 401 "$(jpost auth/login '{"email":["x"],"password":1}')"
check "GET auth/login -> 405" 405 "$(http "$BASE?r=auth/login")"
check "oversized login body -> 413" 413 "$(jpost auth/login "{\"email\":\"$EMAIL\",\"password\":\"$(head -c 5000 /dev/zero | tr '\0' 'a')\"}")"
JAR1="$ROOT/cookies_1.txt"
check "login (email is case-insensitive) -> 200" 200 "$(login "ADMIN@Example.Test" "$PASS1" -c "$JAR1")"
CSRF1="$(csrf_of)"
check "login returns a CSRF token" 64 "${#CSRF1}"
check "session from the password login works" 200 "$(http -b "$JAR1" "$BASE?r=data&c=customer_leads")"
SID_BEFORE="$(sid_of "$JAR1")"
JAR2="$ROOT/cookies_2.txt"
check "second login on top of the first session -> 200" 200 "$(login "$EMAIL" "$PASS1" -b "$JAR1" -c "$JAR2")"
CSRF2="$(csrf_of)"
check "session id changed at login" 1 "$([ -n "$(sid_of "$JAR2")" ] && [ "$(sid_of "$JAR2")" != "$SID_BEFORE" ] && echo 1 || echo 0)"
check "the replaced session id is dead" 401 "$(http -b "$JAR1" "$BASE?r=data&c=customer_leads")"
check "the new session works" 200 "$(http -b "$JAR2" "$BASE?r=data&c=customer_leads")"
check "tampered session id stays anonymous" 401 "$(http -H 'Cookie: pn_sid=0123456789abcdef0123456789abcdef' "$BASE?r=data&c=customer_leads")"
grep -q 'Đăng nhập quản trị thành công' "$STUB_LOG" && { echo "PASS  Telegram alert for a successful login"; PASS=$((PASS + 1)); } || { echo "FAIL  Telegram alert for a successful login"; FAIL=$((FAIL + 1)); }
JAR="$JAR2"
CSRF="$CSRF2"

echo "== lockouts"
reset_limits
for i in 1 2 3 4 5; do
  check "known email, wrong password $i -> 401" 401 "$(login "$EMAIL" "WrongPassword-$i")"
done
check "attempt 6 (locked) -> 429" 429 "$(login "$EMAIL" "WrongPassword-6")"
header_has "429 carries Retry-After" '^retry-after: [0-9]+'
check "right password while locked -> still 429" 429 "$(login "$EMAIL" "$PASS1")"
LOCKED_KNOWN="$(cat "$BODY")"
body_has "locked answer is generic" 'Quá nhiều lần thử'
grep -q 'khóa tạm thời' "$STUB_LOG" && { echo "PASS  Telegram alert for the lock"; PASS=$((PASS + 1)); } || { echo "FAIL  Telegram alert for the lock"; FAIL=$((FAIL + 1)); }
reset_limits
for i in 1 2 3 4 5; do
  check "unknown email, wrong password $i -> 401" 401 "$(login "nobody@example.test" "WrongPassword-$i")"
done
check "unknown email is locked identically -> 429" 429 "$(login "nobody@example.test" "WrongPassword-6")"
header_has "unknown email 429 carries Retry-After" '^retry-after: [0-9]+'
check "locked body identical for known and unknown emails" "$LOCKED_KNOWN" "$(cat "$BODY")"
reset_limits
SEEN_401=0
for i in $(seq 1 10); do
  [ "$(login "user$i@example.test" "WrongPassword-12345")" = 401 ] && SEEN_401=$((SEEN_401 + 1))
done
check "10 attempts from one IP are answered 401" 10 "$SEEN_401"
check "11th attempt from the IP -> 429, even with the right password" 429 "$(login "$EMAIL" "$PASS1")"
header_has "IP limit carries Retry-After" '^retry-after: [0-9]+'
reset_limits
mkdir -p "$ROOT/data/ratelimit"
"$PHP_BIN" -r 'echo json_encode(array_fill(0, 120, time()));' > "$ROOT/data/ratelimit/login_all-$(printf global | sha256sum | cut -d' ' -f1).json"
check "global limit (120 per 10 min) -> 429" 429 "$(login "$EMAIL" "$PASS1")"
reset_limits
check "after the limits are cleared the login works" 200 "$(login "$EMAIL" "$PASS1" -c "$ROOT/cookies_tmp.txt")"

echo "== settings/telegram/request needs the password in password mode"
reset_limits
check "telegram change without currentPassword -> 403" 403 "$(admin_post "$JAR" "$CSRF" settings/telegram/request '{"newChatId":"123456"}')"
check "telegram change with a wrong currentPassword -> 403" 403 "$(admin_post "$JAR" "$CSRF" settings/telegram/request '{"newChatId":"123456","currentPassword":"WrongPassword-12345"}')"
check "telegram change with the password -> 200" 200 "$(admin_post "$JAR" "$CSRF" settings/telegram/request "{\"newChatId\":\"123456\",\"currentPassword\":\"$PASS1\"}")"

echo "== changing the password invalidates other sessions"
reset_limits
JAR_C="$ROOT/cookies_c.txt"
check "second device login -> 200" 200 "$(login "$EMAIL" "$PASS1" -c "$JAR_C")"
check "second device works" 200 "$(http -b "$JAR_C" "$BASE?r=data&c=customer_leads")"
check "change without currentPassword -> 403" 403 "$(setacct "{\"password\":\"$PASS2\"}")"
check "change with a wrong currentPassword -> 403" 403 "$(setacct "{\"password\":\"$PASS2\",\"currentPassword\":\"WrongPassword-12345\"}")"
check "new password equal to the current one -> 422" 422 "$(setacct "{\"password\":\"$PASS1\",\"currentPassword\":\"$PASS1\"}")"
check "weak new password -> 422" 422 "$(setacct "{\"password\":\"matkhau123456\",\"currentPassword\":\"$PASS1\"}")"
check "nothing to change -> 422" 422 "$(setacct "{\"currentPassword\":\"$PASS1\"}")"
check "change password and email -> 200" 200 "$(setacct "{\"email\":\"$EMAIL2\",\"password\":\"$PASS2\",\"currentPassword\":\"$PASS1\"}")"
check "the changing session survives" 200 "$(http -b "$JAR" "$BASE?r=data&c=customer_leads")"
check "the other device is signed out -> 401" 401 "$(http -b "$JAR_C" "$BASE?r=data&c=customer_leads")"
check "old credentials no longer work -> 401" 401 "$(login "$EMAIL" "$PASS1")"
check "new credentials work -> 200" 200 "$(login "$EMAIL2" "$PASS2" -c "$ROOT/cookies_tmp.txt")"
check "an account backup was written" 1 "$([ -n "$(ls "$ROOT"/data/backups/admin_account.* 2>/dev/null)" ] && echo 1 || echo 0)"
grep -q 'Mật khẩu quản trị đã được đổi' "$STUB_LOG" && { echo "PASS  Telegram alert for the password change"; PASS=$((PASS + 1)); } || { echo "FAIL  Telegram alert for the password change"; FAIL=$((FAIL + 1)); }
EMAIL="$EMAIL2"
PASS1="$PASS2"

echo "== logout-all, epoch, idle and absolute lifetime"
reset_limits
JAR_E="$ROOT/cookies_e.txt"
JAR_F="$ROOT/cookies_f.txt"
check "login E -> 200" 200 "$(login "$EMAIL" "$PASS1" -c "$JAR_E")"
CSRF_E="$(csrf_of)"
check "login F -> 200" 200 "$(login "$EMAIL" "$PASS1" -c "$JAR_F")"
check "logout-all -> 200" 200 "$(admin_post "$JAR_E" "$CSRF_E" auth/logout-all '{}')"
check "the calling session is gone -> 401" 401 "$(http -b "$JAR_E" "$BASE?r=data&c=customer_leads")"
check "every other session is gone -> 401" 401 "$(http -b "$JAR_F" "$BASE?r=data&c=customer_leads")"
check "the previous main session is gone too -> 401" 401 "$(http -b "$JAR" "$BASE?r=data&c=customer_leads")"
JAR_G="$ROOT/cookies_g.txt"
check "login G -> 200" 200 "$(login "$EMAIL" "$PASS1" -c "$JAR_G")"
sed -i 's/last_seen|i:[0-9]*;/last_seen|i:1000;/' "$(session_file "$JAR_G")"
check "idle for more than 2 hours -> 401" 401 "$(http -b "$JAR_G" "$BASE?r=data&c=customer_leads")"
check "auth/me reports an idle session as anonymous" 200 "$(http -b "$JAR_G" "$BASE?r=auth/me")"
body_has "idle session is not authenticated" '"authenticated":false'
JAR_H="$ROOT/cookies_h.txt"
check "login H -> 200" 200 "$(login "$EMAIL" "$PASS1" -c "$JAR_H")"
sed -i 's/login_at|i:[0-9]*;/login_at|i:1000;/' "$(session_file "$JAR_H")"
check "older than 8 hours -> 401" 401 "$(http -b "$JAR_H" "$BASE?r=data&c=customer_leads")"
JAR_I="$ROOT/cookies_i.txt"
check "login I -> 200" 200 "$(login "$EMAIL" "$PASS1" -c "$JAR_I")"
NOW="$(date +%s)"
sed -i "s/last_seen|i:[0-9]*;/last_seen|i:$((NOW - 600));/" "$(session_file "$JAR_I")"
check "activity inside the idle window keeps the session -> 200" 200 "$(http -b "$JAR_I" "$BASE?r=data&c=customer_leads")"
SEEN="$(sed -n 's/.*last_seen|i:\([0-9]*\);.*/\1/p' "$(session_file "$JAR_I")")"
check "last_seen was refreshed" 1 "$([ "${SEEN:-0}" -ge $((NOW - 5)) ] && echo 1 || echo 0)"

echo "== 2FA (TOTP)"
reset_limits
JAR="$ROOT/cookies_main.txt"
check "main login -> 200" 200 "$(login "$EMAIL" "$PASS1" -c "$JAR")"
CSRF="$(csrf_of)"
write_config ""
check "2FA without auth_key -> 503" 503 "$(admin_post "$JAR" "$CSRF" auth/2fa/begin "{\"password\":\"$PASS1\"}")"
body_has "503 message" 'Chưa cấu hình khóa mã hóa 2FA'
write_config "$AUTH_KEY"
check "2FA begin with a wrong password -> 403" 403 "$(admin_post "$JAR" "$CSRF" auth/2fa/begin '{"password":"WrongPassword-12345"}')"
check "2FA enable without a pending setup -> 422" 422 "$(admin_post "$JAR" "$CSRF" auth/2fa/enable '{"code":"123456"}')"
check "2FA begin -> 200" 200 "$(admin_post "$JAR" "$CSRF" auth/2fa/begin "{\"password\":\"$PASS1\"}")"
SECRET="$(sed -n 's/.*"secret":"\([A-Z2-7]*\)".*/\1/p' "$BODY")"
check "secret is 32 base32 characters (20 bytes)" 32 "${#SECRET}"
body_has "otpauth URI" 'otpauth://totp/Phuong%20Nam%20Realty:'
body_has "otpauth URI carries the secret" "secret=$SECRET"
check "pending secret is not stored in clear text" 0 "$(grep -rlF -- "$SECRET" "$ROOT/data" | wc -l | tr -d ' ')"
check "2FA still off before it is confirmed" 1 "$(grep -c '"enabled": false' "$ROOT/data/admin_account.json")"
GOOD_CODE="$(totp_code "$SECRET")"
BAD_CODE="$(printf '%06d' $(((10#$GOOD_CODE + 500000) % 1000000)))"
check "enable with a wrong code -> 422" 422 "$(admin_post "$JAR" "$CSRF" auth/2fa/enable "{\"code\":\"$BAD_CODE\"}")"
check "enable with a malformed code -> 422" 422 "$(admin_post "$JAR" "$CSRF" auth/2fa/enable '{"code":"12ab56"}')"
check "enable with the right code -> 200" 200 "$(admin_post "$JAR" "$CSRF" auth/2fa/enable "{\"code\":\"$GOOD_CODE\"}")"
RECOVERY=($(grep -o '[A-Z2-7]\{5\}-[A-Z2-7]\{5\}' "$BODY"))
check "10 recovery codes returned once" 10 "${#RECOVERY[@]}"
check "recovery codes are not stored in clear text" 0 "$(grep -rlF -- "${RECOVERY[0]}" "$ROOT/data" | wc -l | tr -d ' ')"
check "secret is stored encrypted (secret_enc present)" 1 "$(grep -c '"secret_enc": "[^"]\{20,\}"' "$ROOT/data/admin_account.json")"
check "the enabling session survives" 200 "$(http -b "$JAR" "$BASE?r=data&c=customer_leads")"
check "enable again -> 409" 409 "$(admin_post "$JAR" "$CSRF" auth/2fa/enable "{\"code\":\"$GOOD_CODE\"}")"
check "GET auth/account -> 200" 200 "$(http -b "$JAR" "$BASE?r=auth/account")"
body_has "2FA on" '"twofaEnabled":true'
body_has "10 recovery codes left" '"recoveryCodesLeft":10'

reset_limits
check "password only with 2FA on -> 401 asking for the code" 401 "$(login "$EMAIL" "$PASS1")"
body_has "twofa flag" '"twofa":true'
body_lacks "no error text in the twofa answer" '"error"'
check "wrong password with 2FA on is the plain generic 401" 401 "$(login "$EMAIL" "WrongPassword-12345")"
check "generic body, no twofa hint" "$A_BODY" "$(cat "$BODY")"
check "wrong code -> same generic 401" 401 "$(jpost auth/login "{\"email\":\"$EMAIL\",\"password\":\"$PASS1\",\"code\":\"$BAD_CODE\"}")"
check "wrong code -> generic body" "$A_BODY" "$(cat "$BODY")"
check "replaying the code used for enabling is rejected" 401 \
  "$(jpost auth/login "{\"email\":\"$EMAIL\",\"password\":\"$PASS1\",\"code\":\"$GOOD_CODE\"}")"
NEXT_CODE="$(totp_code "$SECRET" 30)"
JAR_J="$ROOT/cookies_j.txt"
check "login with the next step's code -> 200" 200 \
  "$(jpost auth/login "{\"email\":\"$EMAIL\",\"password\":\"$PASS1\",\"code\":\"$NEXT_CODE\"}" -c "$JAR_J")"
check "replaying the same code -> 401" 401 \
  "$(jpost auth/login "{\"email\":\"$EMAIL\",\"password\":\"$PASS1\",\"code\":\"$NEXT_CODE\"}")"

reset_limits
JAR_K="$ROOT/cookies_k.txt"
check "recovery code login -> 200" 200 \
  "$(jpost auth/login "{\"email\":\"$EMAIL\",\"password\":\"$PASS1\",\"code\":\"${RECOVERY[0]}\"}" -c "$JAR_K")"
check "the same recovery code again -> 401" 401 \
  "$(jpost auth/login "{\"email\":\"$EMAIL\",\"password\":\"$PASS1\",\"code\":\"${RECOVERY[0]}\"}")"
LOWER_RECOVERY="$(echo "${RECOVERY[2]}" | tr 'A-Z' 'a-z' | tr -d '-')"
check "recovery code accepted in lower case without the dash -> 200" 200 \
  "$(jpost auth/login "{\"email\":\"$EMAIL\",\"password\":\"$PASS1\",\"code\":\"$LOWER_RECOVERY\"}" -c "$ROOT/cookies_tmp.txt")"
grep -q 'mã dự phòng' "$STUB_LOG" && { echo "PASS  Telegram alert for a recovery code"; PASS=$((PASS + 1)); } || { echo "FAIL  Telegram alert for a recovery code"; FAIL=$((FAIL + 1)); }
check "GET auth/account (recovery codes left)" 200 "$(http -b "$JAR" "$BASE?r=auth/account")"
body_has "8 recovery codes left" '"recoveryCodesLeft":8'
body_has "previous login info is reported" '"lastLoginAt":[0-9]'

reset_limits
check "disable with a wrong password -> 403" 403 "$(admin_post "$JAR" "$CSRF" auth/2fa/disable "{\"password\":\"WrongPassword-12345\",\"code\":\"${RECOVERY[1]}\"}")"
check "disable with a wrong code -> 422" 422 "$(admin_post "$JAR" "$CSRF" auth/2fa/disable "{\"password\":\"$PASS1\",\"code\":\"$BAD_CODE\"}")"
check "disable with password and a recovery code -> 200" 200 "$(admin_post "$JAR" "$CSRF" auth/2fa/disable "{\"password\":\"$PASS1\",\"code\":\"${RECOVERY[1]}\"}")"
check "2FA is off: password only login -> 200" 200 "$(login "$EMAIL" "$PASS1" -c "$ROOT/cookies_tmp.txt")"
check "disable again -> 409" 409 "$(admin_post "$JAR" "$CSRF" auth/2fa/disable "{\"password\":\"$PASS1\",\"code\":\"${RECOVERY[3]}\"}")"
check "the disabling session survives" 200 "$(http -b "$JAR" "$BASE?r=data&c=customer_leads")"
grep -q 'đã bị tắt' "$STUB_LOG" && { echo "PASS  Telegram alert for disabling 2FA"; PASS=$((PASS + 1)); } || { echo "FAIL  Telegram alert for disabling 2FA"; FAIL=$((FAIL + 1)); }

echo "== reset-admin.php returns to bootstrap mode"
check "reset script refuses to run outside the CLI" 1 "$(grep -c "PHP_SAPI !== 'cli'" "$REPO/server/bin/reset-admin.php")"
RESET_OUT="$("$PHP_BIN" "$ROOT/server/bin/reset-admin.php" --yes --allow-root 2>&1)"
RESET_CODE=$?
check "reset-admin exit code" 0 "$RESET_CODE"
check "account file removed" 0 "$([ -f "$ROOT/data/admin_account.json" ] && echo 1 || echo 0)"
check "a backup of the account was kept" 1 "$([ -n "$(ls "$ROOT"/data/backups/admin_account.* 2>/dev/null)" ] && echo 1 || echo 0)"
check "auth/mode -> 200" 200 "$(http "$BASE?r=auth/mode")"
body_has "bootstrap mode is back" '"mode":"bootstrap"'
check "old password session is dead after the reset -> 401" 401 "$(http -b "$JAR" "$BASE?r=data&c=customer_leads")"
check "password login is closed again -> 403" 403 "$(login "$EMAIL" "$PASS1")"
grep -q 'reset-admin.php' "$STUB_LOG" && { echo "PASS  Telegram alert for the reset"; PASS=$((PASS + 1)); } || { echo "FAIL  Telegram alert for the reset"; FAIL=$((FAIL + 1)); }
reset_limits
check "OTP request works again -> 200" 200 "$(http -X POST -H "$JSON" --data "{\"phone\":\"${ADMIN_PHONE}\"}" "$BASE?r=auth/otp")"
check "OTP login works again -> 200" 200 "$(http -c "$ROOT/cookies_boot.txt" -X POST -H "$JSON" --data "{\"otp\":\"$(last_otp)\"}" "$BASE?r=auth/verify")"
check "second reset is a harmless no-op" 0 "$("$PHP_BIN" "$ROOT/server/bin/reset-admin.php" --yes --allow-root >/dev/null 2>&1; echo $?)"

echo "== no secret or hash in any response"
check "no password hash, secret or pending value in a response body" 0 \
  "$(grep -cE '\$argon2|\$2y\$|password_hash|secret_enc|pending_enc|recovery_hashes' "$ALL_BODIES")"
check "no plain password in a response body" 0 "$(grep -cF -- "$PASS1" "$ALL_BODIES")"
check "the encryption key never appears in a response body" 0 "$(grep -cF -- "$AUTH_KEY" "$ALL_BODIES")"

echo
echo "Result: ${PASS} passed, ${FAIL} failed"
[ "$FAIL" -eq 0 ]
