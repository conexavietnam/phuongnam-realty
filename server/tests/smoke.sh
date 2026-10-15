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
SEO_PORT="${SEO_PORT:-18082}"
BROKEN_PORT="${BROKEN_PORT:-18083}"
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
  : > "$BODY"
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
cp -r "$REPO/server/src" "$REPO/server/seed" "$REPO/server/bin" "$REPO/server/seo" "$ROOT/server/"
AUTH_KEY="$("$PHP_BIN" -r 'echo base64_encode(random_bytes(32));')"
write_config() { # base64 auth key ("" = not configured), optional extra config line
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
    'webroot' => '${ROOT}/web',
    ${2:-}
];
PHPCFG
}
write_config "$AUTH_KEY"

echo "== php -l on every server file"
lint_failures=0
for f in "$REPO"/server/api/*.php "$REPO"/server/src/*.php "$REPO"/server/bin/*.php "$REPO"/server/seo/*.php; do
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

# ---------------------------------------------------------------------------------------------
# SEO: validation of the new seo / slug / company.seo fields, then the server-side SEO shell
# ---------------------------------------------------------------------------------------------
body_has_f() { # name literal
  if grep -qF -- "$2" "$BODY"; then
    echo "PASS  $1"
    PASS=$((PASS + 1))
  else
    echo "FAIL  $1 (missing: $2)"
    FAIL=$((FAIL + 1))
  fi
}

body_lacks_f() { # name literal
  if grep -qF -- "$2" "$BODY"; then
    echo "FAIL  $1 (unexpected: $2)"
    FAIL=$((FAIL + 1))
  else
    echo "PASS  $1"
    PASS=$((PASS + 1))
  fi
}

body_count() { # name literal expected-count
  local n
  n="$(grep -oF -- "$2" "$BODY" | wc -l | tr -d ' ')"
  check "$1" "$3" "$n"
}

header_lacks() { # name extended-regex
  if grep -qiE -- "$2" "$HEADERS"; then
    echo "FAIL  $1 (unexpected header: $2)"
    FAIL=$((FAIL + 1))
  else
    echo "PASS  $1"
    PASS=$((PASS + 1))
  fi
}

putc() { # collection json [extra curl args...]
  local name=$1 json=$2
  shift 2
  http -b "$JAR" -X PUT -H "$JSON" -H "X-CSRF-Token: $CSRF" "$@" --data "$json" "$BASE?r=data&c=${name}"
}

echo "== seo: write validation (items)"
SEO_OK='{"title":"Tiêu đề SEO","description":"Mô tả SEO","keywords":["a","b"],"ogImage":"/uploads/x.jpg","noindex":false}'
check "news with a valid seo object -> 200" 200 "$(putc news "[{\"id\":\"n\",\"slug\":\"tin-hop-le\",\"title\":\"t\",\"seo\":${SEO_OK}}]")"
check "news with https ogImage and empty ogImage -> 200" 200 "$(putc news '[{"id":"n","slug":"a-1","seo":{"ogImage":"https://cdn.example/x.png"}},{"id":"m","seo":{"ogImage":""}}]')"
check "projects with a valid seo object -> 200" 200 "$(putc projects "[{\"id\":\"p\",\"slug\":\"du-an-1\",\"seo\":${SEO_OK}}]")"
check "properties with a valid seo object -> 200" 200 "$(putc properties "[{\"id\":\"p\",\"slug\":\"bds-1\",\"seo\":${SEO_OK}}]")"
check "consignments with a valid seo object -> 200" 200 "$(putc consignments "[{\"id\":\"c\",\"slug\":\"tin-1\",\"seo\":${SEO_OK}}]")"
check "item without seo or slug stays valid -> 200" 200 "$(putc news '[{"id":"n","title":"t"}]')"
check "news seo title over 120 chars -> 422" 422 "$(putc news "[{\"id\":\"n\",\"seo\":{\"title\":\"$(head -c 121 /dev/zero | tr '\0' 'a')\"}}]")"
check "projects seo description over 320 chars -> 422" 422 "$(putc projects "[{\"id\":\"n\",\"seo\":{\"description\":\"$(head -c 321 /dev/zero | tr '\0' 'a')\"}}]")"
check "properties seo with 16 keywords -> 422" 422 "$(putc properties "[{\"id\":\"n\",\"seo\":{\"keywords\":[$(printf '"k",%.0s' $(seq 1 15))\"z\"]}}]")"
check "consignments keyword over 60 chars -> 422" 422 "$(putc consignments "[{\"id\":\"n\",\"seo\":{\"keywords\":[\"$(head -c 61 /dev/zero | tr '\0' 'a')\"]}}]")"
check "seo keywords not a list -> 422" 422 "$(putc news '[{"id":"n","seo":{"keywords":"a,b"}}]')"
check "seo keywords with a number -> 422" 422 "$(putc news '[{"id":"n","seo":{"keywords":[1]}}]')"
check "seo ogImage javascript: URL -> 422" 422 "$(putc news '[{"id":"n","seo":{"ogImage":"javascript:alert(1)"}}]')"
check "seo ogImage plain http URL -> 422" 422 "$(putc news '[{"id":"n","seo":{"ogImage":"http://example.test/x.png"}}]')"
check "seo ogImage protocol-relative URL -> 422" 422 "$(putc news '[{"id":"n","seo":{"ogImage":"//evil.test/x.png"}}]')"
check "seo ogImage with a quote -> 422" 422 "$(putc news '[{"id":"n","seo":{"ogImage":"/uploads/x\"onerror=1"}}]')"
check "seo ogImage over 500 chars -> 422" 422 "$(putc news "[{\"id\":\"n\",\"seo\":{\"ogImage\":\"/uploads/$(head -c 500 /dev/zero | tr '\0' 'a')\"}}]")"
check "seo noindex as a string -> 422" 422 "$(putc news '[{"id":"n","seo":{"noindex":"yes"}}]')"
check "seo with an unknown key -> 422" 422 "$(putc news '[{"id":"n","seo":{"title":"t","extra":1}}]')"
check "seo as a list -> 422" 422 "$(putc news '[{"id":"n","seo":["a"]}]')"
check "seo as a string -> 422" 422 "$(putc news '[{"id":"n","seo":"x"}]')"
check "seo title as an array -> 422" 422 "$(putc news '[{"id":"n","seo":{"title":["x"]}}]')"
check "news slug with upper case -> 422" 422 "$(putc news '[{"id":"n","slug":"Tin-Tuc"}]')"
check "projects slug with a slash -> 422" 422 "$(putc projects '[{"id":"n","slug":"a/b"}]')"
check "properties slug with a space -> 422" 422 "$(putc properties '[{"id":"n","slug":"a b"}]')"
check "consignments slug with an accent -> 422" 422 "$(putc consignments '[{"id":"n","slug":"đường"}]')"
check "slug longer than 200 chars -> 422" 422 "$(putc news "[{\"id\":\"n\",\"slug\":\"$(head -c 201 /dev/zero | tr '\0' 'a')\"}]")"
check "slug as a number -> 422" 422 "$(putc news '[{"id":"n","slug":5}]')"
check "oldSlugs valid on every collection -> 200" 200 "$(putc news '[{"id":"n","slug":"moi","oldSlugs":["cu","cu-2"]}]')"
check "projects oldSlugs valid -> 200" 200 "$(putc projects '[{"id":"n","slug":"moi","oldSlugs":["cu"]}]')"
check "properties oldSlugs valid -> 200" 200 "$(putc properties '[{"id":"n","slug":"moi","oldSlugs":["cu"]}]')"
check "consignments oldSlugs valid -> 200" 200 "$(putc consignments '[{"id":"n","slug":"moi","oldSlugs":["cu"]}]')"
check "oldSlugs with exactly 10 entries -> 200" 200 "$(putc news "[{\"id\":\"n\",\"slug\":\"moi\",\"oldSlugs\":[$(printf '"s%s",' $(seq 1 9))\"s10\"]}]")"
check "oldSlugs with 11 entries -> 422" 422 "$(putc news "[{\"id\":\"n\",\"slug\":\"moi\",\"oldSlugs\":[$(printf '"s%s",' $(seq 1 10))\"s11\"]}]")"
check "oldSlugs containing the current slug -> 422" 422 "$(putc news '[{"id":"n","slug":"moi","oldSlugs":["moi"]}]')"
check "oldSlugs with a duplicate -> 422" 422 "$(putc projects '[{"id":"n","slug":"moi","oldSlugs":["cu","cu"]}]')"
check "oldSlugs with upper case -> 422" 422 "$(putc properties '[{"id":"n","slug":"moi","oldSlugs":["Cu"]}]')"
check "oldSlugs with a slash -> 422" 422 "$(putc consignments '[{"id":"n","slug":"moi","oldSlugs":["a/b"]}]')"
check "oldSlugs with an empty string -> 422" 422 "$(putc news '[{"id":"n","slug":"moi","oldSlugs":[""]}]')"
check "oldSlug over 200 chars -> 422" 422 "$(putc news "[{\"id\":\"n\",\"slug\":\"moi\",\"oldSlugs\":[\"$(head -c 201 /dev/zero | tr '\0' 'a')\"]}]")"
check "oldSlugs not a list -> 422" 422 "$(putc news '[{"id":"n","slug":"moi","oldSlugs":"cu"}]')"
check "oldSlugs with a non-string -> 422" 422 "$(putc news '[{"id":"n","slug":"moi","oldSlugs":[["x"]]}]')"
check "consignments seo invalid -> 422" 422 "$(putc consignments '[{"id":"n","slug":"ok","seo":{"noindex":1}}]')"

echo "== seo: write validation (company.seo)"
COMPANY_BASE='"name":"Phương Nam Realty","slogan":"s"'
cput() { putc company "{${COMPANY_BASE},\"seo\":$1}"; }
check "company without seo -> 200" 200 "$(putc company "{${COMPANY_BASE}}")"
check "company with a full valid seo -> 200" 200 "$(cput '{"titleSuffix":" | PN","defaultDescription":"d","defaultOgImage":"/images/og-default.png","googleSiteVerification":"abcDEF1234_-xyz","bingSiteVerification":"","googleHtmlFile":{"name":"google0123456789abcdef.html","content":"google-site-verification: google0123456789abcdef.html"},"indexSite":true}')"
check "company seo with googleHtmlFile null -> 200" 200 "$(cput '{"googleHtmlFile":null,"indexSite":false}')"
check "company seo titleSuffix over 60 chars -> 422" 422 "$(cput "{\"titleSuffix\":\"$(head -c 61 /dev/zero | tr '\0' 'a')\"}")"
check "company seo defaultDescription over 320 chars -> 422" 422 "$(cput "{\"defaultDescription\":\"$(head -c 321 /dev/zero | tr '\0' 'a')\"}")"
check "company seo bad defaultOgImage -> 422" 422 "$(cput '{"defaultOgImage":"javascript:alert(1)"}')"
check "company seo verification code too short -> 422" 422 "$(cput '{"googleSiteVerification":"abc"}')"
check "company seo verification code with a quote -> 422" 422 "$(cput '{"bingSiteVerification":"abcdefghij\"><script>"}')"
check "company seo verification code over 100 chars -> 422" 422 "$(cput "{\"googleSiteVerification\":\"$(head -c 101 /dev/zero | tr '\0' 'a')\"}")"
check "company seo html file bad name -> 422" 422 "$(cput '{"googleHtmlFile":{"name":"evil.html","content":"x"}}')"
check "company seo html file name with a path -> 422" 422 "$(cput '{"googleHtmlFile":{"name":"../google0123456789.html","content":"x"}}')"
check "company seo html file content with markup -> 422" 422 "$(cput '{"googleHtmlFile":{"name":"google0123456789.html","content":"<script>x</script>"}}')"
check "company seo html file content over 200 chars -> 422" 422 "$(cput "{\"googleHtmlFile\":{\"name\":\"google0123456789.html\",\"content\":\"$(head -c 201 /dev/zero | tr '\0' 'a')\"}}")"
check "company seo html file without content -> 422" 422 "$(cput '{"googleHtmlFile":{"name":"google0123456789.html"}}')"
check "company seo indexSite as a string -> 422" 422 "$(cput '{"indexSite":"false"}')"
check "company seo unknown key -> 422" 422 "$(cput '{"robotsTxt":"x"}')"
check "company seo as a list -> 422" 422 "$(cput '["a"]')"

echo "== news categories: write validation and public read"
CAT_A='{"id":"cat-a","slug":"thi-truong","label":"Thị trường","description":"Mô tả chuyên mục","order":1,"seo":{"title":"SEO tiêu đề","description":"SEO mô tả"}}'
CAT_B='{"id":"cat-b","slug":"tin-tuc","label":"Tin tức","order":2}'
check "two valid categories -> 200" 200 "$(putc news_categories "[${CAT_A},${CAT_B}]")"
check "categories are public: anonymous GET -> 200" 200 "$(http "$BASE?r=data&c=news_categories")"
body_has "public read returns the category" '"slug":"thi-truong"'
check "anonymous PUT news_categories -> 401" 401 "$(http -X PUT -H "$JSON" --data '[]' "$BASE?r=data&c=news_categories")"
check "empty category list -> 200" 200 "$(putc news_categories '[]')"
check "duplicate slug -> 422" 422 "$(putc news_categories '[{"id":"a","slug":"x","label":"A","order":1},{"id":"b","slug":"x","label":"B","order":2}]')"
check "slug with upper case -> 422" 422 "$(putc news_categories '[{"id":"a","slug":"Thi-Truong","label":"A","order":1}]')"
check "slug with a space -> 422" 422 "$(putc news_categories '[{"id":"a","slug":"thi truong","label":"A","order":1}]')"
check "slug with an accent -> 422" 422 "$(putc news_categories '[{"id":"a","slug":"thị-trường","label":"A","order":1}]')"
check "slug with a slash -> 422" 422 "$(putc news_categories '[{"id":"a","slug":"a/b","label":"A","order":1}]')"
check "empty slug -> 422" 422 "$(putc news_categories '[{"id":"a","slug":"","label":"A","order":1}]')"
check "slug of 80 chars -> 200" 200 "$(putc news_categories "[{\"id\":\"a\",\"slug\":\"$(head -c 80 /dev/zero | tr '\0' 'a')\",\"label\":\"A\",\"order\":1}]")"
check "slug of 81 chars -> 422" 422 "$(putc news_categories "[{\"id\":\"a\",\"slug\":\"$(head -c 81 /dev/zero | tr '\0' 'a')\",\"label\":\"A\",\"order\":1}]")"
check "label of 60 chars -> 200" 200 "$(putc news_categories "[{\"id\":\"a\",\"slug\":\"a\",\"label\":\"$(head -c 60 /dev/zero | tr '\0' 'a')\",\"order\":1}]")"
check "label of 61 chars -> 422" 422 "$(putc news_categories "[{\"id\":\"a\",\"slug\":\"a\",\"label\":\"$(head -c 61 /dev/zero | tr '\0' 'a')\",\"order\":1}]")"
check "blank label -> 422" 422 "$(putc news_categories '[{"id":"a","slug":"a","label":"   ","order":1}]')"
check "label as a number -> 422" 422 "$(putc news_categories '[{"id":"a","slug":"a","label":5,"order":1}]')"
check "description of 300 chars -> 200" 200 "$(putc news_categories "[{\"id\":\"a\",\"slug\":\"a\",\"label\":\"A\",\"description\":\"$(head -c 300 /dev/zero | tr '\0' 'a')\",\"order\":1}]")"
check "description of 301 chars -> 422" 422 "$(putc news_categories "[{\"id\":\"a\",\"slug\":\"a\",\"label\":\"A\",\"description\":\"$(head -c 301 /dev/zero | tr '\0' 'a')\",\"order\":1}]")"
check "order as a string -> 422" 422 "$(putc news_categories '[{"id":"a","slug":"a","label":"A","order":"1"}]')"
check "order as a fraction -> 422" 422 "$(putc news_categories '[{"id":"a","slug":"a","label":"A","order":1.5}]')"
check "missing order -> 422" 422 "$(putc news_categories '[{"id":"a","slug":"a","label":"A"}]')"
check "missing id -> 422" 422 "$(putc news_categories '[{"slug":"a","label":"A","order":1}]')"
check "unknown key -> 422" 422 "$(putc news_categories '[{"id":"a","slug":"a","label":"A","order":1,"extra":1}]')"
check "seo with an unknown key -> 422" 422 "$(putc news_categories '[{"id":"a","slug":"a","label":"A","order":1,"seo":{"noindex":true}}]')"
check "seo title over 120 chars -> 422" 422 "$(putc news_categories "[{\"id\":\"a\",\"slug\":\"a\",\"label\":\"A\",\"order\":1,\"seo\":{\"title\":\"$(head -c 121 /dev/zero | tr '\0' 'a')\"}}]")"
check "category that is not an object -> 422" 422 "$(putc news_categories '["tin-tuc"]')"
check "categories as an object -> 422" 422 "$(putc news_categories '{"slug":"a"}')"
CAT_40="$(for i in $(seq 1 40); do printf '{"id":"c%s","slug":"s%s","label":"L%s","order":%s},' "$i" "$i" "$i" "$i"; done)"
check "40 categories -> 200" 200 "$(putc news_categories "[${CAT_40%,}]")"
check "41 categories -> 422" 422 "$(putc news_categories "[${CAT_40}{\"id\":\"c41\",\"slug\":\"s41\",\"label\":\"L41\",\"order\":41}]")"
check "news slug danh-muc is reserved -> 422" 422 "$(putc news '[{"id":"n","slug":"danh-muc"}]')"
check "news oldSlugs danh-muc is reserved -> 422" 422 "$(putc news '[{"id":"n","slug":"moi","oldSlugs":["danh-muc"]}]')"
check "news slug danh-muc-2 -> 200" 200 "$(putc news '[{"id":"n","slug":"danh-muc-2"}]')"
check "other collections may use danh-muc -> 200" 200 "$(putc projects '[{"id":"n","slug":"danh-muc"}]')"
check "news with category and categoryLabel -> 200" 200 "$(putc news '[{"id":"n","slug":"tin-1","category":"thi-truong","categoryLabel":"Thị trường","author":"A","publishedAt":"2026-05-01T03:30:00.000Z","readTime":"3 phút đọc"}]')"

echo "== menu: write validation and public read"
MENU_FOOTER='"footer":{"columns":[{"id":"c","title":"T","links":[{"label":"L","url":"/du-an"}]}],"copyright":"c"}'
menu_put() { putc menu "$1"; }
check "legacy menu shape -> 200" 200 "$(menu_put "{\"desktop\":[{\"label\":\"Trang chủ\",\"path\":\"/\",\"exact\":true},{\"label\":\"Dự án\",\"path\":\"/du-an\"}],\"mobileBottomNav\":[{\"label\":\"Trang chủ\",\"path\":\"/\",\"icon\":\"Home\",\"exact\":true}],${MENU_FOOTER}}")"
check "anonymous read of the menu -> 200" 200 "$(http "$BASE?r=data&c=menu")"
body_has "footer is stored with the menu" '"copyright":"c"'
check "new menu shape with children, flags and ids -> 200" 200 "$(menu_put '{"desktop":[{"id":"home","label":"Trang chủ","path":"/","exact":true,"visible":true},{"id":"news","label":"Tin tức","path":"/tin-tuc","newTab":false,"children":[{"id":"news-market","label":"Thị trường","path":"/tin-tuc/danh-muc/thi-truong","visible":true,"newTab":true},{"id":"mail","label":"Email","path":"mailto:a@b.vn"},{"id":"tel","label":"Gọi","path":"tel:+84901234567"},{"id":"ext","label":"Ngoài","path":"https://example.test/x?y=1#z"}]}],"mobileBottomNav":[{"id":"b1","label":"Trang chủ","path":"/","icon":"Home","visible":true},{"id":"b2","label":"Liên hệ","path":"/lien-he","icon":"Phone"}]}')"
check "menu without footer or bottom bar -> 200" 200 "$(menu_put '{"desktop":[{"label":"A","path":"/"}]}')"
check "javascript: link in the header menu -> 422" 422 "$(menu_put '{"desktop":[{"label":"A","path":"javascript:alert(1)"}]}')"
check "JAVASCRIPT: in upper case -> 422" 422 "$(menu_put '{"desktop":[{"label":"A","path":"JavaScript:alert(1)"}]}')"
check "javascript: link in a submenu -> 422" 422 "$(menu_put '{"desktop":[{"label":"A","path":"/","children":[{"label":"B","path":"javascript:alert(1)"}]}]}')"
check "javascript: link in the bottom bar -> 422" 422 "$(menu_put '{"mobileBottomNav":[{"label":"A","path":"javascript:alert(1)","icon":"Home"}]}')"
check "data: link -> 422" 422 "$(menu_put '{"desktop":[{"label":"A","path":"data:text/html,x"}]}')"
check "protocol-relative link -> 422" 422 "$(menu_put '{"desktop":[{"label":"A","path":"//evil.test/x"}]}')"
check "link with a backslash -> 422" 422 "$(menu_put '{"desktop":[{"label":"A","path":"/\\evil.test"}]}')"
check "plain http link -> 422" 422 "$(menu_put '{"desktop":[{"label":"A","path":"http://example.test"}]}')"
check "https link without a host -> 422" 422 "$(menu_put '{"desktop":[{"label":"A","path":"https://"}]}')"
check "link with a space -> 422" 422 "$(menu_put '{"desktop":[{"label":"A","path":"/a b"}]}')"
check "link with a quote -> 422" 422 "$(menu_put '{"desktop":[{"label":"A","path":"/a\"onclick=1"}]}')"
check "link with angle brackets -> 422" 422 "$(menu_put '{"desktop":[{"label":"A","path":"/a<b>"}]}')"
check "relative link without a slash -> 422" 422 "$(menu_put '{"desktop":[{"label":"A","path":"du-an"}]}')"
check "empty link -> 422" 422 "$(menu_put '{"desktop":[{"label":"A","path":""}]}')"
check "missing link -> 422" 422 "$(menu_put '{"desktop":[{"label":"A"}]}')"
check "link of 500 chars -> 200" 200 "$(menu_put "{\"desktop\":[{\"label\":\"A\",\"path\":\"/$(head -c 499 /dev/zero | tr '\0' 'a')\"}]}")"
check "link of 501 chars -> 422" 422 "$(menu_put "{\"desktop\":[{\"label\":\"A\",\"path\":\"/$(head -c 500 /dev/zero | tr '\0' 'a')\"}]}")"
MENU_10="$(for i in $(seq 1 10); do printf '{"label":"M%s","path":"/m%s"},' "$i" "$i"; done)"
check "10 header items -> 200" 200 "$(menu_put "{\"desktop\":[${MENU_10%,}]}")"
check "11 header items -> 422" 422 "$(menu_put "{\"desktop\":[${MENU_10}{\"label\":\"M11\",\"path\":\"/m11\"}]}")"
KIDS_12="$(for i in $(seq 1 12); do printf '{"label":"K%s","path":"/k%s"},' "$i" "$i"; done)"
check "12 submenu items -> 200" 200 "$(menu_put "{\"desktop\":[{\"label\":\"A\",\"path\":\"/\",\"children\":[${KIDS_12%,}]}]}")"
check "13 submenu items -> 422" 422 "$(menu_put "{\"desktop\":[{\"label\":\"A\",\"path\":\"/\",\"children\":[${KIDS_12}{\"label\":\"K13\",\"path\":\"/k13\"}]}]}")"
check "children of children -> 422" 422 "$(menu_put '{"desktop":[{"label":"A","path":"/","children":[{"label":"B","path":"/b","children":[{"label":"C","path":"/c"}]}]}]}')"
check "children that is not a list -> 422" 422 "$(menu_put '{"desktop":[{"label":"A","path":"/","children":{"label":"B"}}]}')"
check "children on a bottom bar item -> 422" 422 "$(menu_put '{"mobileBottomNav":[{"label":"A","path":"/","icon":"Home","children":[]}]}')"
BOTTOM_5="$(for i in 1 2 3 4 5; do printf '{"label":"B%s","path":"/b%s","icon":"Home"},' "$i" "$i"; done)"
check "5 bottom bar items -> 200" 200 "$(menu_put "{\"mobileBottomNav\":[${BOTTOM_5%,}]}")"
check "6 bottom bar items -> 422" 422 "$(menu_put "{\"mobileBottomNav\":[${BOTTOM_5}{\"label\":\"B6\",\"path\":\"/b6\",\"icon\":\"Home\"}]}")"
check "icon outside the allow-list -> 422" 422 "$(menu_put '{"mobileBottomNav":[{"label":"A","path":"/","icon":"Skull"}]}')"
check "icon as a number -> 422" 422 "$(menu_put '{"mobileBottomNav":[{"label":"A","path":"/","icon":3}]}')"
check "icon with markup -> 422" 422 "$(menu_put '{"mobileBottomNav":[{"label":"A","path":"/","icon":"<svg>"}]}')"
check "icon on a header item -> 422" 422 "$(menu_put '{"desktop":[{"label":"A","path":"/","icon":"Home"}]}')"
check "label of 40 chars -> 200" 200 "$(menu_put "{\"desktop\":[{\"label\":\"$(head -c 40 /dev/zero | tr '\0' 'a')\",\"path\":\"/\"}]}")"
check "label of 41 chars -> 422" 422 "$(menu_put "{\"desktop\":[{\"label\":\"$(head -c 41 /dev/zero | tr '\0' 'a')\",\"path\":\"/\"}]}")"
check "blank label -> 422" 422 "$(menu_put '{"desktop":[{"label":"  ","path":"/"}]}')"
check "label as a number -> 422" 422 "$(menu_put '{"desktop":[{"label":5,"path":"/"}]}')"
check "id with a space -> 422" 422 "$(menu_put '{"desktop":[{"id":"a b","label":"A","path":"/"}]}')"
check "id as a number -> 422" 422 "$(menu_put '{"desktop":[{"id":5,"label":"A","path":"/"}]}')"
check "visible as a string -> 422" 422 "$(menu_put '{"desktop":[{"label":"A","path":"/","visible":"yes"}]}')"
check "newTab as a number -> 422" 422 "$(menu_put '{"desktop":[{"label":"A","path":"/","newTab":1}]}')"
check "unknown key on an item -> 422" 422 "$(menu_put '{"desktop":[{"label":"A","path":"/","onclick":"x"}]}')"
check "item that is not an object -> 422" 422 "$(menu_put '{"desktop":["/du-an"]}')"
check "desktop as an object -> 422" 422 "$(menu_put '{"desktop":{"label":"A","path":"/"}}')"
check "mobileBottomNav as a string -> 422" 422 "$(menu_put '{"mobileBottomNav":"x"}')"
check "menu as a list -> 422" 422 "$(menu_put '[{"label":"A","path":"/"}]')"
check "restore the seeded menu -> 200" 200 "$(menu_put "$(cat "$REPO/server/seed/menu.json")")"

echo "== seo: SEO shell fixtures"
SEO="http://127.0.0.1:${SEO_PORT}"
mkdir -p "$ROOT/web"
cat > "$ROOT/web/index.html" <<'HTML'
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0A192F" />
    <meta name="description" content="STATIC-DESCRIPTION" />
    <meta property="og:title" content="STATIC-OG-TITLE" />
    <meta property="og:description" content="STATIC-OG-DESCRIPTION" />
    <title>STATIC-TITLE</title>
    <script type="module" crossorigin src="/assets/index-abc.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
HTML
cat > "$ROOT/data/news.json" <<'JSON'
[
 {"id":"n1","slug":"tin-thuong","category":"thi-truong","categoryLabel":"Thị trường","oldSlugs":["tin-thuong-cu"],"title":"Tin thường","excerpt":"Tóm tắt tin thường","content":"<p>Nội dung <strong>chi tiết</strong> bài viết &amp; hơn nữa.</p><script>alert(2)</script>","thumbnail":"/uploads/n1.jpg","author":"Biên tập","publishedAt":"2026-03-01","seo":{"title":"SEO tiêu đề tin","description":"SEO mô tả tin","keywords":["bất động sản","Bất Động Sản","thị trường"]}},
 {"id":"n2","slug":"tin-hostile","category":"hostile","title":"</title><script>alert(1)</script>\"'&x","excerpt":"</script><script>alert(3)</script>","content":"","thumbnail":"/images/x.svg","publishedAt":"2026-03-02"},
 {"id":"n3","slug":"tin-noindex","category":"thi-truong","oldSlugs":["tin-thuong","tin-xoa"],"title":"Tin noindex","excerpt":"e","content":"c","thumbnail":"/uploads/n3.jpg","publishedAt":"2026-03-03","seo":{"noindex":true}},
 {"id":"n4","slug":"tin-tuy-chinh","category":"tuy-chinh","title":"Tin tùy chỉnh","excerpt":"e","content":"c","thumbnail":"/uploads/n4.jpg","publishedAt":"2026-03-05"}
]
JSON
cat > "$ROOT/data/news_categories.json" <<'JSON'
[
 {"id":"k1","slug":"thi-truong","label":"Thị trường","description":"Phân tích thị trường","order":1},
 {"id":"k2","slug":"hostile","label":"</title><script>alert(9)</script>\"'&c","description":"</script><script>alert(8)</script>","order":2},
 {"id":"k3","slug":"trong","label":"Chuyên mục trống","order":3},
 {"id":"k4","slug":"tuy-chinh","label":"Tùy chỉnh","description":"Mô tả gốc","order":4,"seo":{"title":"SEO tiêu đề chuyên mục","description":"SEO mô tả chuyên mục"}}
]
JSON
cat > "$ROOT/data/projects.json" <<'JSON'
[{"id":"p1","slug":"du-an-mot","oldSlugs":["du-an-cu"],"name":"Dự án Một","shortDescription":"Mô tả ngắn dự án","fullDescription":"<p>Chi tiết dự án</p>","thumbnail":"/uploads/p1.jpg","images":[],"priceFrom":"3 Tỷ","location":"Quận 2"}]
JSON
cat > "$ROOT/data/properties.json" <<'JSON'
[{"id":"r1","slug":"bds-mot","oldSlugs":["bds-cu"],"title":"BĐS Một","shortDescription":"Mô tả BĐS","fullDescription":"","thumbnail":"/uploads/r1.jpg","price":4500000000,"location":"Thủ Đức","createdAt":"2026-02-01T00:00:00Z"}]
JSON
cat > "$ROOT/data/consignments.json" <<'JSON'
[
 {"id":"c1","slug":"ky-gui-dang","oldSlugs":["ky-gui-cu"],"status":"published","section":"ky-gui","title":"Ký gửi đang đăng","shortDescription":"mô tả ký gửi","fullDescription":"<p>x</p>","thumbnail":"/uploads/c1.jpg","price":4.5,"publishedAt":"2026-04-01T00:00:00Z","internalNote":"SECRET-NOTE","ownerPhone":"0900111222"},
 {"id":"c2","slug":"ky-gui-nhap","oldSlugs":["ky-gui-nhap-cu"],"status":"draft","title":"Bản nháp","shortDescription":"nháp"},
 {"id":"c3","slug":"ky-gui-sang-du-an","oldSlugs":["ky-gui-cu-du-an"],"status":"published","section":"du-an","title":"Chuyển dự án","shortDescription":"d","publishedAt":"2026-04-02T00:00:00Z"},
 {"id":"c4","slug":"ky-gui-da-ban","status":"sold","title":"Đã bán","shortDescription":"d","publishedAt":"2026-04-03T00:00:00Z","seo":{"noindex":true}},
 {"id":"c5","slug":"ky-gui-sang-bds","status":"published","section":"chuyen-nhuong","title":"Chuyển BĐS","shortDescription":"d","price":2,"publishedAt":"2026-04-04T00:00:00Z"}
]
JSON
write_company() { # indexSite (true|false)
  cat > "$ROOT/data/company.json" <<JSON
{"name":"Phương Nam Realty","slogan":"Kiến tạo giá trị","hotline":"0901 234 567","email":"info@example.test","address":"Hà Nội","social":{"facebook":"https://facebook.com/pn","zalo":"#"},"seo":{"titleSuffix":" | PN Test","defaultDescription":"Mô tả mặc định test","googleSiteVerification":"abcdefghij1234567890","bingSiteVerification":"BINGCODE1234567890","googleHtmlFile":{"name":"google1234567890abcdef.html","content":"google-site-verification: google1234567890abcdef.html"},"indexSite":$1}}
JSON
}
write_company true

# nginx stand-in: every request goes to server/seo/index.php with REQUEST_URI intact.
cat > "$ROOT/seo_router.php" <<PHPROUTER
<?php
\$_SERVER['SCRIPT_FILENAME'] = '${ROOT}/server/seo/index.php';
require '${ROOT}/server/seo/index.php';
PHPROUTER
"$PHP_BIN" -d opcache.enable=0 -S "127.0.0.1:${SEO_PORT}" "$ROOT/seo_router.php" >"$ROOT/seo.log" 2>&1 &
PIDS+=($!)
wait_for "$SEO/" || { echo "SEO shell did not start:"; cat "$ROOT/seo.log"; exit 2; }

echo "== seo: published news"
check "news article -> 200" 200 "$(http "$SEO/tin-tuc/tin-thuong")"
header_has "HTML with charset" '^content-type: text/html; charset=utf-8'
header_has "nosniff" '^x-content-type-options: nosniff'
header_has "revalidation cache header" '^cache-control: public, max-age=0, must-revalidate'
header_has "ETag present" '^etag: '
header_has "Last-Modified present" '^last-modified: '
header_lacks "indexable page has no X-Robots-Tag" '^x-robots-tag'
body_has_f "custom seo title" '<title>SEO tiêu đề tin</title>'
body_count "exactly one <title>" '<title>' 1
body_count "exactly one description meta" 'name="description"' 1
body_lacks_f "static description replaced" 'STATIC-DESCRIPTION'
body_lacks_f "static og:title replaced" 'STATIC-OG-TITLE'
body_has_f "custom seo description" '<meta name="description" content="SEO mô tả tin" />'
body_has_f "keywords de-duplicated" '<meta name="keywords" content="bất động sản, thị trường" />'
body_has_f "robots index" '<meta name="robots" content="index, follow" />'
body_has_f "canonical from the Host header" '<link rel="canonical" href="https://127.0.0.1:'"${SEO_PORT}"'/tin-tuc/tin-thuong" />'
body_has_f "og:type article" '<meta property="og:type" content="article" />'
body_has_f "og:locale" '<meta property="og:locale" content="vi_VN" />'
body_has_f "og:site_name" '<meta property="og:site_name" content="Phương Nam Realty" />'
body_has_f "og:title" '<meta property="og:title" content="SEO tiêu đề tin" />'
body_has_f "og:url absolute" '<meta property="og:url" content="https://127.0.0.1:'"${SEO_PORT}"'/tin-tuc/tin-thuong" />'
body_has_f "og:image absolute" '<meta property="og:image" content="https://127.0.0.1:'"${SEO_PORT}"'/uploads/n1.jpg" />'
body_has_f "twitter card" '<meta name="twitter:card" content="summary_large_image" />'
body_has_f "google-site-verification" '<meta name="google-site-verification" content="abcdefghij1234567890" />'
body_has_f "msvalidate.01" '<meta name="msvalidate.01" content="BINGCODE1234567890" />'
body_has_f "Article JSON-LD" '"@type":"Article"'
body_has_f "Article author" '"author":{"@type":"Person","name":"Biên tập"}'
body_has_f "Article date" '"datePublished":"2026-03-01"'
body_has_f "BreadcrumbList JSON-LD" '"@type":"BreadcrumbList"'
body_has_f "crawler h1" '<h1>Tin thường</h1>'
body_has_f "crawler description paragraph" '<p>SEO mô tả tin</p>'
body_has_f "crawler plain-text excerpt (entities escaped again)" '<p>Nội dung chi tiết bài viết &amp; hơn nữa.</p>'
body_lacks_f "stored HTML never injected" '<strong>'
body_lacks_f "stored script content never injected" 'alert(2)'
body_has_f "SPA entry script kept" '<script type="module" crossorigin src="/assets/index-abc.js"></script>'
body_has_f "root div filled" '<div id="root"><main id="seo-fallback"'

echo "== seo: derived defaults"
check "project -> 200" 200 "$(http "$SEO/du-an/du-an-mot")"
body_has_f "project title = name + site suffix" '<title>Dự án Một | PN Test</title>'
body_has_f "project description from shortDescription" '<meta name="description" content="Mô tả ngắn dự án" />'
body_has_f "project og:image from thumbnail" 'content="https://127.0.0.1:'"${SEO_PORT}"'/uploads/p1.jpg"'
body_has_f "project og:type website" '<meta property="og:type" content="website" />'
body_has_f "project RealEstateListing JSON-LD" '"@type":"RealEstateListing"'
body_lacks_f "no keywords meta when none" 'name="keywords"'
check "property -> 200" 200 "$(http "$SEO/chuyen-nhuong/bds-mot")"
body_has_f "property title" '<title>BĐS Một | PN Test</title>'
body_has_f "property price in VND" '"price":4500000000'
body_has_f "property currency" '"priceCurrency":"VND"'
check "consignment -> 200" 200 "$(http "$SEO/ky-gui/ky-gui-dang")"
body_has_f "consignment title" '<title>Ký gửi đang đăng | PN Test</title>'
body_has_f "consignment price billions -> VND" '"price":4500000000'
body_lacks_f "consignment private note never leaks" 'SECRET-NOTE'
body_lacks_f "consignment owner phone never leaks" '0900111222'
check "promoted listing under /du-an -> 200" 200 "$(http "$SEO/du-an/ky-gui-sang-du-an")"
body_has_f "promoted project title" '<title>Chuyển dự án | PN Test</title>'
check "promoted listing under /chuyen-nhuong -> 200" 200 "$(http "$SEO/chuyen-nhuong/ky-gui-sang-bds")"
body_has_f "promoted property price (2 billion)" '"price":2000000000'
check "home -> 200" 200 "$(http "$SEO/")"
body_has_f "home title from company name + slogan" '<title>Phương Nam Realty — Kiến tạo giá trị</title>'
body_has_f "home default description from settings" '<meta name="description" content="Mô tả mặc định test" />'
body_has_f "home default og image" '<meta property="og:image" content="https://127.0.0.1:'"${SEO_PORT}"'/images/og-default.png" />'
body_has_f "home og image width" '<meta property="og:image:width" content="1200" />'
body_has_f "home Organization JSON-LD" '"@type":"RealEstateAgent"'
body_has_f "home WebSite JSON-LD" '"@type":"WebSite"'
body_has_f "home sameAs only https links" '"sameAs":["https://facebook.com/pn"]'
body_has_f "home canonical" '<link rel="canonical" href="https://127.0.0.1:'"${SEO_PORT}"'/" />'
check "contact page -> 200" 200 "$(http "$SEO/lien-he")"
body_has_f "contact title" '<title>Liên hệ tư vấn | PN Test</title>'
check "trailing slash on a list page -> 200" 200 "$(http "$SEO/du-an/")"
body_has_f "trailing slash canonical has none" '/du-an" />'

echo "== seo: hostile content is escaped"
check "hostile news -> 200" 200 "$(http "$SEO/tin-tuc/tin-hostile")"
body_has_f "title escaped in <title>" '<title>&lt;/title&gt;&lt;script&gt;alert(1)&lt;/script&gt;&quot;&#039;&amp;x | PN Test</title>'
body_lacks_f "no raw script tag from the title" '<script>alert(1)'
body_lacks_f "no raw script tag from the excerpt" '<script>alert(3)'
body_lacks_f "no raw closing title injection" '</title><script>'
body_has_f "JSON-LD escapes angle brackets" "$(printf '\134u003C/script\134u003E')"
body_lacks_f "JSON-LD never carries a raw closing script from data" '</script><script>'
body_has_f "svg thumbnail falls back to the default og image" 'content="https://127.0.0.1:'"${SEO_PORT}"'/images/og-default.png"'
body_has_f "crawler h1 escaped" '<h1>&lt;/title&gt;&lt;script&gt;alert(1)&lt;/script&gt;&quot;&#039;&amp;x</h1>'

echo "== seo: lists"
check "project list -> 200" 200 "$(http "$SEO/du-an")"
body_has_f "list title" '<title>Dự án bất động sản | PN Test</title>'
body_has_f "list links the native project" '<li><a href="/du-an/du-an-mot">Dự án Một</a></li>'
body_has_f "list links the promoted project" '<li><a href="/du-an/ky-gui-sang-du-an">Chuyển dự án</a></li>'
check "consignment list -> 200" 200 "$(http "$SEO/ky-gui")"
body_has_f "ky-gui list has the ky-gui listing" '/ky-gui/ky-gui-dang'
body_lacks_f "ky-gui list has no draft" 'ky-gui-nhap'
body_lacks_f "ky-gui list has no promoted listing" 'ky-gui-sang-du-an'
check "news list -> 200" 200 "$(http "$SEO/tin-tuc")"
body_has_f "news list links an article" '/tin-tuc/tin-thuong'
body_lacks_f "news list skips a noindex article" 'tin-noindex'
check "property list -> 200" 200 "$(http "$SEO/chuyen-nhuong")"
body_has_f "property list links a property" '/chuyen-nhuong/bds-mot'

echo "== seo: news categories"
check "category page -> 200" 200 "$(http "$SEO/tin-tuc/danh-muc/thi-truong")"
body_has_f "category title = label + suffix" '<title>Thị trường | PN Test</title>'
body_has_f "category description from the category" '<meta name="description" content="Phân tích thị trường" />'
body_has_f "category canonical" '<link rel="canonical" href="https://127.0.0.1:'"${SEO_PORT}"'/tin-tuc/danh-muc/thi-truong" />'
body_has_f "category og:url" '<meta property="og:url" content="https://127.0.0.1:'"${SEO_PORT}"'/tin-tuc/danh-muc/thi-truong" />'
body_has_f "category is indexable" '<meta name="robots" content="index, follow" />'
body_count "category has exactly one <title>" '<title>' 1
body_has_f "category JSON-LD CollectionPage" '"@type":"CollectionPage"'
body_has_f "category JSON-LD ItemList" '"@type":"ItemList"'
body_has_f "category JSON-LD lists the article" '"url":"https://127.0.0.1:'"${SEO_PORT}"'/tin-tuc/tin-thuong"'
body_has_f "category JSON-LD breadcrumb" '"@type":"BreadcrumbList"'
body_has_f "category breadcrumb ends with the category" '"name":"Thị trường","item":"https://127.0.0.1:'"${SEO_PORT}"'/tin-tuc/danh-muc/thi-truong"'
body_has_f "category h1" '<h1>Thị trường</h1>'
body_has_f "category crawler list links the article" '<li><a href="/tin-tuc/tin-thuong">Tin thường</a></li>'
body_lacks_f "category list skips a noindex article" 'tin-noindex'
body_lacks_f "category list skips another category's article" 'tin-tuy-chinh'
header_lacks "category page has no X-Robots-Tag" '^x-robots-tag'
check "category with custom seo -> 200" 200 "$(http "$SEO/tin-tuc/danh-muc/tuy-chinh")"
body_has_f "custom category title used as is" '<title>SEO tiêu đề chuyên mục</title>'
body_has_f "custom category description" '<meta name="description" content="SEO mô tả chuyên mục" />'
check "empty category -> 200" 200 "$(http "$SEO/tin-tuc/danh-muc/trong")"
body_has_f "empty category is noindex" '<meta name="robots" content="noindex, nofollow" />'
header_has "empty category sends X-Robots-Tag" '^x-robots-tag: noindex, nofollow'
body_lacks_f "empty category has no canonical" 'rel="canonical"'
body_has_f "empty category without description gets a generated one" 'content="Tin tức chuyên mục Chuyên mục trống: cập nhật mới nhất từ Phương Nam Realty."'
check "hostile category -> 200" 200 "$(http "$SEO/tin-tuc/danh-muc/hostile")"
body_has_f "hostile label escaped in <title>" '<title>&lt;/title&gt;&lt;script&gt;alert(9)&lt;/script&gt;&quot;&#039;&amp;c | PN Test</title>'
body_lacks_f "no raw script from the category label" '<script>alert(9)'
body_lacks_f "no raw script from the category description" '<script>alert(8)'
body_lacks_f "no raw closing title injection from the label" '</title><script>'
body_has_f "category h1 escaped" '<h1>&lt;/title&gt;&lt;script&gt;alert(9)&lt;/script&gt;&quot;&#039;&amp;c</h1>'
body_has_f "category JSON-LD escapes angle brackets" "$(printf '\134u003C/script\134u003E')"
check "unknown category -> 404" 404 "$(http "$SEO/tin-tuc/danh-muc/khong-co")"
body_has_f "unknown category keeps the SPA shell" '/assets/index-abc.js'
body_has_f "unknown category is noindex" '<meta name="robots" content="noindex, nofollow" />'
header_has "unknown category sends X-Robots-Tag" '^x-robots-tag: noindex, nofollow'
check "category slug with upper case -> 404" 404 "$(http "$SEO/tin-tuc/danh-muc/Thi-Truong")"
check "category slug percent-encoded junk -> 404" 404 "$(http "$SEO/tin-tuc/danh-muc/%3Cscript%3E")"
check "/tin-tuc/danh-muc alone is no article -> 404" 404 "$(http "$SEO/tin-tuc/danh-muc")"
check "/tin-tuc/danh-muc/ with a trailing slash -> 404" 404 "$(http "$SEO/tin-tuc/danh-muc/")"
check "category page with a trailing slash -> 200" 200 "$(http "$SEO/tin-tuc/danh-muc/thi-truong/")"
check "category page with a query string -> 200" 200 "$(http "$SEO/tin-tuc/danh-muc/thi-truong?page=2")"
check "news list -> 200" 200 "$(http "$SEO/tin-tuc")"
body_has_f "news list links every category" '<li><a href="/tin-tuc/danh-muc/thi-truong">Thị trường</a></li>'
body_has_f "news list links the custom category" '<li><a href="/tin-tuc/danh-muc/tuy-chinh">Tùy chỉnh</a></li>'

echo "== seo: 404, noindex, redirects"
check "unknown news slug -> 404" 404 "$(http "$SEO/tin-tuc/khong-co")"
body_has_f "404 keeps the SPA shell" '/assets/index-abc.js'
body_has_f "404 is noindex" '<meta name="robots" content="noindex, nofollow" />'
header_has "404 sends X-Robots-Tag" '^x-robots-tag: noindex, nofollow'
body_lacks_f "404 has no canonical" 'rel="canonical"'
check "unknown path -> 404" 404 "$(http "$SEO/khong-co-trang-nay")"
check "unknown nested path -> 404" 404 "$(http "$SEO/du-an/a/b")"
check "static index.html is not a route -> 404" 404 "$(http "$SEO/index.html")"
check "double slash -> 404" 404 "$(http "$SEO//du-an")"
check "invalid UTF-8 slug -> 404" 404 "$(http "$SEO/tin-tuc/%E0%FF")"
check "draft consignment -> 404" 404 "$(http "$SEO/ky-gui/ky-gui-nhap")"
body_lacks_f "draft title never shown" 'Bản nháp'
check "listing under the wrong section -> 404" 404 "$(http "$SEO/chuyen-nhuong/ky-gui-dang")"
check "noindex news -> 200" 200 "$(http "$SEO/tin-tuc/tin-noindex")"
body_has_f "noindex item robots meta" '<meta name="robots" content="noindex, nofollow" />'
header_has "noindex item X-Robots-Tag" '^x-robots-tag: noindex, nofollow'
body_lacks_f "noindex item has no canonical" 'rel="canonical"'
body_lacks_f "noindex item has no JSON-LD" 'application/ld+json'
check "sold + noindex consignment -> 200" 200 "$(http "$SEO/ky-gui/ky-gui-da-ban")"
header_has "sold noindex X-Robots-Tag" '^x-robots-tag: noindex, nofollow'
check "consignment of another section -> 301" 301 "$(http "$SEO/ky-gui/ky-gui-sang-du-an")"
header_has "301 points at the real section (absolute URL)" '^location: https://127.0.0.1:'"${SEO_PORT}"'/du-an/ky-gui-sang-du-an'
check "consignment promoted to chuyen-nhuong -> 301" 301 "$(http "$SEO/ky-gui/ky-gui-sang-bds")"
header_has "301 to chuyen-nhuong" '^location: .*/chuyen-nhuong/ky-gui-sang-bds'
check "admin -> 200" 200 "$(http "$SEO/admin")"
body_has_f "admin is noindex" '<meta name="robots" content="noindex, nofollow" />'
header_has "admin X-Robots-Tag" '^x-robots-tag: noindex, nofollow'
body_lacks_f "admin has no canonical" 'rel="canonical"'
body_lacks_f "admin page has no crawler content" 'seo-fallback'

echo "== seo: old slugs redirect (301)"
check "old news slug -> 301" 301 "$(http "$SEO/tin-tuc/tin-thuong-cu")"
header_has "301 to the current news URL" '^location: https://127.0.0.1:'"${SEO_PORT}"'/tin-tuc/tin-thuong\s*$'
check "a current slug beats another item's old slug -> 200" 200 "$(http "$SEO/tin-tuc/tin-thuong")"
check "old slug of a noindex item still redirects -> 301" 301 "$(http "$SEO/tin-tuc/tin-xoa")"
header_has "301 to the noindex item" '^location: .*/tin-tuc/tin-noindex'
check "old project slug -> 301" 301 "$(http "$SEO/du-an/du-an-cu")"
header_has "301 to the project" '^location: .*/du-an/du-an-mot'
check "old property slug -> 301" 301 "$(http "$SEO/chuyen-nhuong/bds-cu")"
header_has "301 to the property" '^location: .*/chuyen-nhuong/bds-mot'
check "old consignment slug -> 301" 301 "$(http "$SEO/ky-gui/ky-gui-cu")"
header_has "301 to the listing" '^location: .*/ky-gui/ky-gui-dang'
check "old slug of a listing now in another section -> 301" 301 "$(http "$SEO/ky-gui/ky-gui-cu-du-an")"
header_has "301 to the listing's section" '^location: .*/du-an/ky-gui-sang-du-an'
check "old slug under the wrong section -> 404" 404 "$(http "$SEO/du-an/bds-cu")"
check "old slug of a draft -> 404" 404 "$(http "$SEO/ky-gui/ky-gui-nhap-cu")"

echo "== seo: sitemap and robots"
check "sitemap.xml -> 200" 200 "$(http "$SEO/sitemap.xml")"
header_has "sitemap is XML" '^content-type: application/xml; charset=utf-8'
body_has_f "sitemap root" '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
for p in "" du-an chuyen-nhuong ky-gui tin-tuc lien-he tin-tuc/tin-thuong tin-tuc/tin-hostile du-an/du-an-mot chuyen-nhuong/bds-mot ky-gui/ky-gui-dang du-an/ky-gui-sang-du-an chuyen-nhuong/ky-gui-sang-bds; do
  body_has_f "sitemap lists /$p" "<loc>https://127.0.0.1:${SEO_PORT}/${p}</loc>"
done
body_has_f "sitemap lastmod from publishedAt" '<loc>https://127.0.0.1:'"${SEO_PORT}"'/tin-tuc/tin-thuong</loc><lastmod>2026-03-01</lastmod>'
body_has_f "sitemap lastmod normalised from ISO" '<lastmod>2026-04-01T00:00:00+00:00</lastmod>'
body_lacks_f "sitemap skips noindex news" 'tin-noindex'
for c in thi-truong hostile tuy-chinh; do
  body_has_f "sitemap lists the category $c" "<loc>https://127.0.0.1:${SEO_PORT}/tin-tuc/danh-muc/${c}</loc>"
done
body_has_f "category lastmod is its newest article" '<loc>https://127.0.0.1:'"${SEO_PORT}"'/tin-tuc/danh-muc/tuy-chinh</loc><lastmod>2026-03-05</lastmod>'
body_lacks_f "sitemap skips an empty category" '/tin-tuc/danh-muc/trong'
body_lacks_f "sitemap skips drafts" 'ky-gui-nhap'
body_lacks_f "sitemap skips sold noindex" 'ky-gui-da-ban'
body_lacks_f "sitemap skips admin" '/admin'
for old in tin-thuong-cu tin-xoa du-an-cu bds-cu ky-gui-cu ky-gui-cu-du-an; do
  body_lacks_f "sitemap never lists the old slug $old" "/$old<"
done
check "every sitemap URL is absolute" "$(grep -o '<loc>' "$BODY" | wc -l | tr -d ' ')" "$(grep -o "<loc>https://127.0.0.1:${SEO_PORT}/" "$BODY" | wc -l | tr -d ' ')"
check "robots.txt -> 200" 200 "$(http "$SEO/robots.txt")"
header_has "robots is plain text" '^content-type: text/plain; charset=utf-8'
body_has_f "robots allows all" 'Allow: /'
body_has_f "robots blocks admin" 'Disallow: /admin'
body_has_f "robots blocks api" 'Disallow: /api/'
body_has_f "robots points at the sitemap" "Sitemap: https://127.0.0.1:${SEO_PORT}/sitemap.xml"
check "Google HTML verification file -> 200" 200 "$(http "$SEO/google1234567890abcdef.html")"
header_has "verification file is text/html" '^content-type: text/html; charset=utf-8'
check "verification file body is exactly the stored content" "google-site-verification: google1234567890abcdef.html" "$(cat "$BODY")"
check "another google*.html name -> 404" 404 "$(http "$SEO/google0000000000000000.html")"

echo "== seo: HTTP behaviour"
check "POST -> 405" 405 "$(http -X POST --data x "$SEO/")"
header_has "405 lists the allowed methods" '^allow: GET, HEAD'
check "PUT -> 405" 405 "$(http -X PUT --data x "$SEO/tin-tuc/tin-thuong")"
check "HEAD -> 200" 200 "$(http -I "$SEO/tin-tuc/tin-thuong")"
check "request URI over 2000 chars -> 414" 414 "$(http "$SEO/tin-tuc/$(head -c 2100 /dev/zero | tr '\0' 'a')")"
check "path over 300 chars -> 414" 414 "$(http "$SEO/tin-tuc/$(head -c 400 /dev/zero | tr '\0' 'a')")"
check "first fetch for the ETag" 200 "$(http "$SEO/tin-tuc/tin-thuong")"
ETAG="$(grep -i '^etag:' "$HEADERS" | sed 's/^[Ee][Tt]ag: *//' | tr -d '\r')"
LASTMOD="$(grep -i '^last-modified:' "$HEADERS" | sed 's/^[Ll]ast-[Mm]odified: *//' | tr -d '\r')"
check "If-None-Match with the ETag -> 304" 304 "$(http -H "If-None-Match: ${ETAG}" "$SEO/tin-tuc/tin-thuong")"
check "304 has no body" 0 "$(wc -c < "$BODY" | tr -d ' ')"
check "If-None-Match with another ETag -> 200" 200 "$(http -H 'If-None-Match: W/"other"' "$SEO/tin-tuc/tin-thuong")"
check "If-Modified-Since with the Last-Modified -> 304" 304 "$(http -H "If-Modified-Since: ${LASTMOD}" "$SEO/tin-tuc/tin-thuong")"
check "404 is never answered with 304" 404 "$(http -H "If-None-Match: ${ETAG}" "$SEO/tin-tuc/khong-co")"
check "Host header decides the canonical host" 200 "$(http -H 'Host: www.example.test' "$SEO/tin-tuc/tin-thuong")"
body_has_f "canonical uses the request Host" '<link rel="canonical" href="https://www.example.test/tin-tuc/tin-thuong" />'
check "hostile Host header -> 200" 200 "$(http -H 'Host: a"b<c' "$SEO/tin-tuc/tin-thuong")"
body_has_f "hostile Host falls back to the production host" '<link rel="canonical" href="https://phuongnamrealty.vn/tin-tuc/tin-thuong" />'
body_lacks_f "hostile Host is never echoed" 'a"b<c'
write_config "$AUTH_KEY" "'site_url' => 'https://canonical.example/',"
check "site_url configured -> 200" 200 "$(http -H 'Host: www.example.test' "$SEO/tin-tuc/tin-thuong")"
body_has_f "canonical uses site_url, not Host" '<link rel="canonical" href="https://canonical.example/tin-tuc/tin-thuong" />'
check "sitemap uses site_url" 200 "$(http "$SEO/sitemap.xml")"
body_has_f "sitemap URLs on site_url" '<loc>https://canonical.example/tin-tuc/tin-thuong</loc>'
write_config "$AUTH_KEY"

echo "== seo: indexSite = false"
write_company false
check "robots.txt when indexing is off -> 200" 200 "$(http "$SEO/robots.txt")"
check "robots has no blanket Disallow (Google must see noindex)" 0 "$(grep -cx 'Disallow: /' "$BODY")"
body_has_f "robots allows crawling" 'Allow: /'
body_has_f "robots still blocks admin" 'Disallow: /admin'
body_has_f "robots still blocks api" 'Disallow: /api/'
body_lacks_f "robots has no Sitemap line" 'Sitemap:'
check "sitemap when indexing is off -> 200" 200 "$(http "$SEO/sitemap.xml")"
check "sitemap is an empty urlset" 0 "$(grep -c '<url>' "$BODY" | tr -d ' ')"
body_has_f "empty sitemap is still valid XML" '</urlset>'
check "category page when indexing is off -> 200" 200 "$(http "$SEO/tin-tuc/danh-muc/thi-truong")"
body_has_f "category page is noindex too" '<meta name="robots" content="noindex, nofollow" />'
check "page when indexing is off -> 200" 200 "$(http "$SEO/tin-tuc/tin-thuong")"
body_has_f "page is noindex" '<meta name="robots" content="noindex, nofollow" />'
header_has "page X-Robots-Tag" '^x-robots-tag: noindex, nofollow'
write_company true

echo "== seo: missing and corrupt data"
rm -f "$ROOT/data/news.json"
check "news.json missing -> list still served from the seed" 200 "$(http "$SEO/tin-tuc")"
check "the SEO shell never creates data files" 0 "$([ -f "$ROOT/data/news.json" ] && echo 1 || echo 0)"
rm -f "$ROOT/data/news_categories.json"
check "news_categories.json missing -> category page from the seed" 200 "$(http "$SEO/tin-tuc/danh-muc/du-an")"
body_has_f "seed category lists a seed article" '/tin-tuc/tien-do-thi-cong-vanh-dai-3-don-bay-khu-dong'
check "the SEO shell never creates news_categories.json" 0 "$([ -f "$ROOT/data/news_categories.json" ] && echo 1 || echo 0)"
check "slug from the missing file -> 404, not an error" 404 "$(http "$SEO/tin-tuc/tin-thuong")"
printf '{{{ not json' > "$ROOT/data/news.json"
check "corrupt news.json -> list served from the seed" 200 "$(http "$SEO/tin-tuc")"
body_has_f "seed article is linked" '/tin-tuc/xu-huong-gia-bat-dong-san-ven-song-2025'
printf '[]' > "$ROOT/data/company.json"
check "company.json with the wrong shape -> home 200" 200 "$(http "$SEO/")"
body_has_f "default title from the seed company" '<title>Phương Nam Realty — Kiến tạo giá trị, Đồng hành cùng bạn</title>'
printf '"just a string"' > "$ROOT/data/projects.json"
check "projects.json with the wrong shape -> 200" 200 "$(http "$SEO/du-an")"
check "corrupt data still gives a valid sitemap" 200 "$(http "$SEO/sitemap.xml")"
body_has_f "sitemap built from the seeds" '<urlset'

echo "== seo: unusable server config falls back to the static shell"
BROKEN="$ROOT/broken"
mkdir -p "$BROKEN/server" "$BROKEN/public_html"
cp -r "$REPO/server/src" "$REPO/server/seed" "$REPO/server/seo" "$BROKEN/server/"
printf '<?php return "not an array";' > "$BROKEN/server/config.php"
cp "$ROOT/web/index.html" "$BROKEN/public_html/index.html"
cat > "$BROKEN/router.php" <<PHPROUTER
<?php
\$_SERVER['SCRIPT_FILENAME'] = '${BROKEN}/server/seo/index.php';
require '${BROKEN}/server/seo/index.php';
PHPROUTER
"$PHP_BIN" -d opcache.enable=0 -S "127.0.0.1:${BROKEN_PORT}" "$BROKEN/router.php" >"$BROKEN/app.log" 2>&1 &
PIDS+=($!)
wait_for "http://127.0.0.1:${BROKEN_PORT}/" || { echo "broken-config SEO shell did not start"; exit 2; }
check "page with a broken config -> 200" 200 "$(http "http://127.0.0.1:${BROKEN_PORT}/tin-tuc/tin-thuong")"
body_has_f "broken config serves the untouched static index.html" '<title>STATIC-TITLE</title>'
body_lacks_f "broken config injects nothing" 'og:locale'
check "sitemap with a broken config -> 503 (never a fake page)" 503 "$(http "http://127.0.0.1:${BROKEN_PORT}/sitemap.xml")"
check "robots.txt with a broken config -> 503" 503 "$(http "http://127.0.0.1:${BROKEN_PORT}/robots.txt")"
check "no PHP error text in the fallback" 0 "$(grep -ci 'warning\|fatal\|stack trace\|exception' "$BODY" | tr -d ' ')"

echo "== seo: derivation test vectors (shared with src/utils/seo.ts)"
cat > "$ROOT/seo_vectors.php" <<'PHPVEC'
<?php
declare(strict_types=1);
require $argv[1] . '/storage.php';
require $argv[1] . '/seo.php';
$v = json_decode(file_get_contents($argv[2]), true, 64, JSON_THROW_ON_ERROR);
$fail = 0;
$total = 0;
$expect = static function (string $name, mixed $want, mixed $got) use (&$fail, &$total): void {
    $total++;
    if ($want !== $got) {
        $fail++;
        fwrite(STDERR, "VECTOR FAIL $name\n  want: " . json_encode($want, JSON_UNESCAPED_UNICODE) . "\n  got:  " . json_encode($got, JSON_UNESCAPED_UNICODE) . "\n");
    }
};
foreach ($v['plainText'] as $i => [$in, $out]) {
    $expect("plainText #$i", $out, pn_seo_plain_text($in));
}
foreach ($v['snippet'] as $i => [$in, $out]) {
    $expect("snippet #$i", $out, pn_seo_snippet($in));
}
foreach ($v['usableImage'] as $i => [$in, $out]) {
    $expect("usableImage #$i", $out, pn_seo_usable_image($in));
}
foreach ($v['keywords'] as $i => [$in, $out]) {
    $expect("keywords #$i", $out, pn_seo_clean_keywords($in));
}
foreach ($v['items'] as $i => $case) {
    $site = pn_seo_site($case['company']);
    $meta = pn_seo_item_meta($case['kind'], $case['item'], $site, $case['path']);
    foreach ($case['expect'] as $key => $want) {
        $expect("items #$i {$case['name']} $key", $want, $meta[$key]);
    }
}
foreach ($v['pages'] as $i => $case) {
    $site = pn_seo_site($case['company']);
    $meta = $case['page'] === 'home' ? pn_seo_home_meta($site) : pn_seo_static_meta($case['page'], $case['path'], $site);
    foreach ($case['expect'] as $key => $want) {
        $expect("pages #$i {$case['page']} $key", $want, $meta[$key]);
    }
}
foreach ($v['categories'] as $i => $case) {
    $site = pn_seo_site($case['company']);
    $meta = pn_seo_category_meta($case['category'], $case['indexableCount'], $site, $case['path']);
    foreach ($case['expect'] as $key => $want) {
        $expect("categories #$i {$case['name']} $key", $want, $meta[$key]);
    }
}
echo $total . ' ' . $fail;
PHPVEC
VECTOR_OUT="$("$PHP_BIN" "$ROOT/seo_vectors.php" "$ROOT/server/src" "$REPO/server/tests/seo-vectors.json" 2>"$ROOT/vectors.err")"
cat "$ROOT/vectors.err"
check "PHP derivation matches every shared vector (checked: ${VECTOR_OUT%% *})" 0 "${VECTOR_OUT##* }"

rm -f "$ROOT/data/news.json" "$ROOT/data/news_categories.json" "$ROOT/data/projects.json" "$ROOT/data/properties.json" "$ROOT/data/consignments.json" "$ROOT/data/company.json"

echo "== menu: link vectors (shared with src/utils/menuConfig.ts)"
cat > "$ROOT/menu_vectors.php" <<'PHPVEC'
<?php
declare(strict_types=1);
require $argv[1] . '/storage.php';
$v = json_decode(file_get_contents($argv[2]), true, 64, JSON_THROW_ON_ERROR);
$fail = 0;
foreach ($v['links'] as [$url, $ok]) {
    if (pn_valid_menu_link($url) !== $ok) {
        $fail++;
        fwrite(STDERR, 'MENU VECTOR FAIL ' . json_encode($url, JSON_UNESCAPED_UNICODE) . ' want ' . json_encode($ok) . "
");
    }
}
echo count($v['links']) . ' ' . $fail;
PHPVEC
MENU_VECTOR_OUT="$("$PHP_BIN" "$ROOT/menu_vectors.php" "$ROOT/server/src" "$REPO/server/tests/menu-vectors.json" 2>"$ROOT/menu_vectors.err")"
cat "$ROOT/menu_vectors.err"
check "PHP menu link check matches every shared vector (checked: ${MENU_VECTOR_OUT%% *})" 0 "${MENU_VECTOR_OUT##* }"

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
