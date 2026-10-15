<?php
declare(strict_types=1);

// Server-side SEO shell: gives crawlers and social scrapers (Google, Zalo, Facebook) a page whose <head>
// already holds the right title, description, canonical, Open Graph and JSON-LD, plus sitemap.xml,
// robots.txt and the Google HTML verification file. Entry point: server/seo/index.php.
//
// This code only READS the data files (it falls back to server/seed when a collection is missing or corrupt)
// and never writes anything.
//
// DERIVATION RULES (title, description, image, keywords, robots) are the PHP twin of src/utils/seo.ts:
// KEEP BOTH IDENTICAL. Shared test vectors: server/tests/seo-vectors.json.
//  1. plain text: block-closing tags and <br> become a space, other tags are dropped, entities decoded,
//     whitespace (incl. U+00A0) collapsed, trimmed.
//  2. snippet: <= 155 code points unchanged; else cut to 155, back up to the last space at index >= 100,
//     strip trailing " ,;:.-" and append "…".
//  3. title: seo.title as is, else <item title> + site titleSuffix.
//  4. description: seo.description, else snippet(short/excerpt), else snippet(full text), else site default.
//  5. image: first usable of seo.ogImage, thumbnail, images[0], site default; usable = /uploads/ or /images/ path
//     or https URL, and not .svg.
//  6. keywords: trimmed, collapsed, <= 60 chars, case-insensitive de-dupe, <= 15, joined ", ".
//  7. robots: "noindex, nofollow" when seo.noindex or the site's indexSite is false, else "index, follow".
//  8. news category page (/tin-tuc/danh-muc/<slug>): title = seo.title, else label + site titleSuffix;
//     description = seo.description, else snippet(category description), else "Tin tức chuyên mục <label>: ...";
//     image = site default; robots noindex when the site is not indexed or the category has no indexable article.

const PN_SEO_SITE_NAME = 'Phương Nam Realty';
const PN_SEO_DEFAULT_SUFFIX = ' | Phương Nam Realty';
const PN_SEO_DEFAULT_DESCRIPTION = 'Bất động sản Phương Nam — Kiến tạo giá trị, Đồng hành cùng bạn. Phân phối, chuyển nhượng, ký gửi bất động sản uy tín.';
const PN_SEO_DEFAULT_IMAGE = '/images/og-default.png';
const PN_SEO_SNIPPET_MAX = 155;
const PN_SEO_SNIPPET_MIN_CUT = 100;
const PN_SEO_EXCERPT_MAX = 800;
const PN_SEO_LIST_LINKS_MAX = 30;
const PN_SEO_MAX_PATH = 300;
const PN_SEO_MAX_URI = 2000;
const PN_SEO_ROBOTS_INDEX = 'index, follow';
const PN_SEO_ROBOTS_NOINDEX = 'noindex, nofollow';
const PN_SEO_FALLBACK_HOST = 'phuongnamrealty.vn';

/** The ONE route table of the SEO shell. Keep in step with src/seo/routes.ts and src/App.tsx. */
const PN_SEO_ROUTES = [
    ['path' => '/', 'page' => 'home'],
    ['path' => '/du-an', 'page' => 'projects'],
    ['path' => '/du-an/:slug', 'page' => 'project'],
    ['path' => '/chuyen-nhuong', 'page' => 'properties'],
    ['path' => '/chuyen-nhuong/:slug', 'page' => 'property'],
    ['path' => '/ky-gui', 'page' => 'consignments'],
    ['path' => '/ky-gui/:slug', 'page' => 'consignment'],
    ['path' => '/tin-tuc', 'page' => 'news'],
    ['path' => '/tin-tuc/danh-muc/:slug', 'page' => 'newsCategory'],
    ['path' => '/tin-tuc/:slug', 'page' => 'article'],
    ['path' => '/lien-he', 'page' => 'contact'],
    ['path' => '/admin', 'page' => 'admin'],
];

/** Fixed pages: [title, description]. Same text as STATIC_PAGES in src/utils/seo.ts. */
const PN_SEO_STATIC_PAGES = [
    'projects' => ['Dự án bất động sản', 'Danh sách dự án bất động sản do Phương Nam Realty phân phối: căn hộ, nhà phố, biệt thự, đất nền với thông tin minh bạch, pháp lý rõ ràng.'],
    'properties' => ['Bất động sản chuyển nhượng', 'Bất động sản chuyển nhượng chọn lọc: căn hộ, nhà phố, biệt thự, đất nền có pháp lý rõ ràng, giá tốt, hỗ trợ xem nhà và thủ tục trọn gói.'],
    'consignments' => ['Tin ký gửi bất động sản', 'Tin ký gửi mua bán và cho thuê bất động sản đã được Phương Nam Realty xác minh. Đăng ký gửi nhà đất của bạn để được tư vấn miễn phí.'],
    'news' => ['Tin tức & thị trường bất động sản', 'Cập nhật tin tức, phân tích thị trường và xu hướng giá bất động sản mới nhất từ đội ngũ chuyên gia Phương Nam Realty.'],
    'contact' => ['Liên hệ tư vấn', 'Liên hệ Phương Nam Realty để được tư vấn mua bán, thuê, ký gửi bất động sản. Hotline, email và địa chỉ văn phòng.'],
    'notFound' => ['Không tìm thấy trang', 'Trang bạn tìm không tồn tại hoặc đã được di chuyển.'],
    'admin' => ['Quản trị', 'Khu vực quản trị nội bộ.'],
];

/** Per list page: label used in breadcrumbs and crawler links. */
const PN_SEO_SECTION_LABELS = [
    '/du-an' => 'Dự án',
    '/chuyen-nhuong' => 'BĐS chuyển nhượng',
    '/ky-gui' => 'Ký gửi',
    '/tin-tuc' => 'Tin tức',
];

const PN_SEO_NEWS_BASE = '/tin-tuc';
const PN_SEO_NEWS_CATEGORY_BASE = '/tin-tuc/danh-muc';

const PN_SEO_SECTION_BASES = ['ky-gui' => '/ky-gui', 'chuyen-nhuong' => '/chuyen-nhuong', 'du-an' => '/du-an'];

// ---------------------------------------------------------------------------------------------
// Derivation rules (twin of src/utils/seo.ts)
// ---------------------------------------------------------------------------------------------

function pn_seo_collapse(string $text): string
{
    return trim(preg_replace('/[\s\x{00A0}]+/u', ' ', $text) ?? '');
}

function pn_seo_plain_text(?string $html): string
{
    $source = $html ?? '';
    $source = preg_replace('~<(script|style)\b[^>]*>.*?</\1\s*>~is', ' ', $source) ?? '';
    $source = preg_replace('~</(?:p|div|h[1-6]|li|ul|ol|blockquote|tr)\s*>|<br\s*/?>~i', ' ', $source) ?? '';
    $source = preg_replace('~</?[a-zA-Z!][^>]*>~', '', $source) ?? '';
    $decoded = html_entity_decode($source, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    return pn_seo_collapse($decoded);
}

function pn_seo_snippet(string $text, int $max = PN_SEO_SNIPPET_MAX): string
{
    $clean = pn_seo_collapse($text);
    $chars = mb_str_split($clean);
    if (count($chars) <= $max) {
        return $clean;
    }
    $cut = array_slice($chars, 0, $max);
    for ($i = count($cut) - 1; $i >= PN_SEO_SNIPPET_MIN_CUT; $i--) {
        if ($cut[$i] === ' ') {
            $cut = array_slice($cut, 0, $i);
            break;
        }
    }
    return preg_replace('/[\s,;:.\-–—]+$/u', '', implode('', $cut)) . '…';
}

/** '' when the value cannot be used as a social-preview image (unsafe, too long or SVG). */
function pn_seo_usable_image(mixed $value): string
{
    if (!is_string($value)) {
        return '';
    }
    $v = trim($value);
    if ($v === '' || strlen($v) > PN_SEO_URL_MAX || preg_match(PN_SEO_IMAGE_PATTERN, $v) !== 1) {
        return '';
    }
    $withoutQuery = strtolower(preg_split('/[?#]/', $v)[0]);
    return str_ends_with($withoutQuery, '.svg') ? '' : $v;
}

/** @return list<string> */
function pn_seo_clean_keywords(mixed $list): array
{
    if (!is_array($list) || !array_is_list($list)) {
        return [];
    }
    $seen = [];
    $out = [];
    foreach ($list as $entry) {
        if (!is_string($entry)) {
            continue;
        }
        $keyword = mb_substr(pn_seo_collapse($entry), 0, PN_SEO_KEYWORD_MAX);
        $key = mb_strtolower($keyword);
        if ($keyword === '' || isset($seen[$key])) {
            continue;
        }
        $seen[$key] = true;
        $out[] = $keyword;
        if (count($out) >= PN_SEO_MAX_KEYWORDS) {
            break;
        }
    }
    return $out;
}

function pn_seo_text(mixed $value): string
{
    return is_string($value) ? $value : '';
}

/** Site-wide settings with defaults. */
function pn_seo_site(array $company): array
{
    $seo = is_array($company['seo'] ?? null) ? $company['seo'] : [];
    $verification = static fn(mixed $v): string => is_string($v) && preg_match(PN_SEO_VERIFICATION_PATTERN, $v) === 1 ? $v : '';
    $file = $seo['googleHtmlFile'] ?? null;
    $validFile = is_array($file)
        && is_string($file['name'] ?? null) && preg_match(PN_SEO_HTML_FILE_NAME_PATTERN, $file['name']) === 1
        && is_string($file['content'] ?? null) && preg_match(PN_SEO_HTML_FILE_CONTENT_PATTERN, $file['content']) === 1;
    return [
        'titleSuffix' => is_string($seo['titleSuffix'] ?? null) ? $seo['titleSuffix'] : PN_SEO_DEFAULT_SUFFIX,
        'description' => pn_seo_collapse(pn_seo_text($seo['defaultDescription'] ?? '')) ?: PN_SEO_DEFAULT_DESCRIPTION,
        'ogImage' => pn_seo_usable_image($seo['defaultOgImage'] ?? '') ?: PN_SEO_DEFAULT_IMAGE,
        'indexSite' => ($seo['indexSite'] ?? true) !== false,
        'siteName' => pn_seo_collapse(pn_seo_text($company['name'] ?? '')) ?: PN_SEO_SITE_NAME,
        'slogan' => pn_seo_collapse(pn_seo_text($company['slogan'] ?? '')),
        'googleVerification' => $verification($seo['googleSiteVerification'] ?? ''),
        'bingVerification' => $verification($seo['bingSiteVerification'] ?? ''),
        'googleHtmlFile' => $validFile ? ['name' => $file['name'], 'content' => $file['content']] : null,
    ];
}

function pn_seo_meta(string $title, string $description, string $keywords, string $robots, string $image, string $ogType, string $path): array
{
    return compact('title', 'description', 'keywords', 'robots', 'image', 'ogType', 'path');
}

function pn_seo_home_meta(array $site): array
{
    $title = $site['slogan'] !== '' ? $site['siteName'] . ' — ' . $site['slogan'] : $site['siteName'];
    return pn_seo_meta($title, $site['description'], '', $site['indexSite'] ? PN_SEO_ROBOTS_INDEX : PN_SEO_ROBOTS_NOINDEX, $site['ogImage'], 'website', '/');
}

function pn_seo_static_meta(string $key, string $path, array $site): array
{
    [$title, $description] = PN_SEO_STATIC_PAGES[$key];
    $hidden = $key === 'notFound' || $key === 'admin' || !$site['indexSite'];
    return pn_seo_meta(pn_seo_collapse($title) . $site['titleSuffix'], $description, '', $hidden ? PN_SEO_ROBOTS_NOINDEX : PN_SEO_ROBOTS_INDEX, $site['ogImage'], 'website', $path);
}

/** Title of an item as stored (projects use "name"; legacy consignments too). */
function pn_seo_item_title(string $kind, array $raw): string
{
    $primary = pn_seo_text($kind === 'project' ? ($raw['name'] ?? '') : ($raw['title'] ?? ''));
    return pn_seo_collapse($primary !== '' ? $primary : pn_seo_text($raw['name'] ?? ''));
}

/** $kind: news | project | property | consignment. */
function pn_seo_item_meta(string $kind, array $raw, array $site, string $path): array
{
    $seo = is_array($raw['seo'] ?? null) ? $raw['seo'] : [];
    $short = pn_seo_text($kind === 'news' ? ($raw['excerpt'] ?? '') : ($raw['shortDescription'] ?? ''));
    $full = pn_seo_text($kind === 'news' ? ($raw['content'] ?? '') : ($raw['fullDescription'] ?? ''));
    $images = is_array($raw['images'] ?? null) && array_is_list($raw['images']) ? $raw['images'] : [];
    $image = $site['ogImage'];
    foreach ([$seo['ogImage'] ?? null, $raw['thumbnail'] ?? null, $images[0] ?? null] as $candidate) {
        $usable = pn_seo_usable_image($candidate);
        if ($usable !== '') {
            $image = $usable;
            break;
        }
    }
    $customTitle = pn_seo_collapse(pn_seo_text($seo['title'] ?? ''));
    $customDescription = pn_seo_collapse(pn_seo_text($seo['description'] ?? ''));
    $hidden = !$site['indexSite'] || ($seo['noindex'] ?? false) === true;
    return pn_seo_meta(
        $customTitle !== '' ? $customTitle : pn_seo_item_title($kind, $raw) . $site['titleSuffix'],
        $customDescription !== '' ? $customDescription : (pn_seo_snippet(pn_seo_plain_text($short)) ?: (pn_seo_snippet(pn_seo_plain_text($full)) ?: $site['description'])),
        implode(', ', pn_seo_clean_keywords($seo['keywords'] ?? [])),
        $hidden ? PN_SEO_ROBOTS_NOINDEX : PN_SEO_ROBOTS_INDEX,
        $image,
        $kind === 'news' ? 'article' : 'website',
        $path
    );
}

/** Meta of /tin-tuc/danh-muc/<slug>. $indexableCount = articles of the category that may be indexed. */
function pn_seo_category_meta(array $category, int $indexableCount, array $site, string $path): array
{
    $seo = is_array($category['seo'] ?? null) ? $category['seo'] : [];
    $label = pn_seo_collapse(pn_seo_text($category['label'] ?? ''));
    $customTitle = pn_seo_collapse(pn_seo_text($seo['title'] ?? ''));
    $customDescription = pn_seo_collapse(pn_seo_text($seo['description'] ?? ''));
    $own = pn_seo_snippet(pn_seo_plain_text(pn_seo_text($category['description'] ?? '')));
    $hidden = !$site['indexSite'] || $indexableCount === 0;
    return pn_seo_meta(
        $customTitle !== '' ? $customTitle : $label . $site['titleSuffix'],
        $customDescription !== '' ? $customDescription : ($own !== '' ? $own : 'Tin tức chuyên mục ' . $label . ': cập nhật mới nhất từ ' . $site['siteName'] . '.'),
        '',
        $hidden ? PN_SEO_ROBOTS_NOINDEX : PN_SEO_ROBOTS_INDEX,
        $site['ogImage'],
        'website',
        $path
    );
}

// ---------------------------------------------------------------------------------------------
// Data (read only)
// ---------------------------------------------------------------------------------------------

/** A collection from data/, else from the bundled seed, else empty. Never writes. */
function pn_seo_collection(string $name): array
{
    $kind = pn_collection_kind($name);
    foreach ([pn_data_path($name), dirname(__DIR__) . '/seed/' . $name . '.json'] as $file) {
        $raw = @file_get_contents($file);
        $data = $raw === false ? null : json_decode($raw, true);
        if (!is_array($data)) {
            continue;
        }
        if ($kind === 'list' && array_is_list($data)) {
            return array_values(array_filter($data, 'is_array'));
        }
        if ($kind === 'object' && $data !== [] && !array_is_list($data)) {
            return $data;
        }
    }
    return [];
}

/** Newest modification time of the data the pages are built from (seed file when data is missing). */
function pn_seo_data_mtime(): int
{
    $newest = 0;
    foreach (['news', 'news_categories', 'projects', 'properties', 'consignments', 'company'] as $name) {
        foreach ([pn_data_path($name), dirname(__DIR__) . '/seed/' . $name . '.json'] as $file) {
            $time = @filemtime($file);
            if ($time !== false) {
                $newest = max($newest, $time);
                break;
            }
        }
    }
    return $newest;
}

function pn_seo_load_data(): array
{
    $consignments = [];
    foreach (pn_seo_collection('consignments') as $item) {
        $slug = $item['slug'] ?? null;
        if (is_string($slug) && $slug !== '' && in_array($item['status'] ?? 'published', PN_CONSIGNMENT_PUBLIC_STATUSES, true)) {
            $consignments[] = $item;
        }
    }
    usort($consignments, static function (array $a, array $b): int {
        $rank = static fn(array $i): int => ($i['status'] ?? 'published') === 'sold' ? 1 : 0;
        return $rank($a) <=> $rank($b) ?: strcmp(pn_seo_text($b['publishedAt'] ?? ''), pn_seo_text($a['publishedAt'] ?? ''));
    });
    $slugged = static fn(array $list): array => array_values(array_filter(
        $list,
        static fn(array $i): bool => is_string($i['slug'] ?? null) && $i['slug'] !== ''
    ));
    return [
        'company' => pn_seo_collection('company'),
        'newsCategories' => pn_seo_sorted_categories(pn_seo_collection('news_categories')),
        'news' => $slugged(pn_seo_collection('news')),
        'projects' => $slugged(pn_seo_collection('projects')),
        'properties' => $slugged(pn_seo_collection('properties')),
        'consignments' => $consignments,
    ];
}

/** Valid categories (slug pattern, non-empty label) ordered by "order", then label. */
function pn_seo_sorted_categories(array $list): array
{
    $valid = array_values(array_filter($list, static fn(array $c): bool => is_string($c['slug'] ?? null)
        && preg_match(PN_NEWS_CATEGORY_SLUG_PATTERN, $c['slug']) === 1
        && pn_seo_collapse(pn_seo_text($c['label'] ?? '')) !== ''));
    usort($valid, static fn(array $a, array $b): int => (is_int($a['order'] ?? null) ? $a['order'] : 0) <=> (is_int($b['order'] ?? null) ? $b['order'] : 0)
        ?: strcmp(pn_seo_text($a['label']), pn_seo_text($b['label'])));
    return $valid;
}

function pn_seo_find_category(array $data, string $slug): ?array
{
    foreach ($data['newsCategories'] as $category) {
        if ($category['slug'] === $slug) {
            return $category;
        }
    }
    return null;
}

function pn_seo_category_path(array $category): string
{
    return PN_SEO_NEWS_CATEGORY_BASE . '/' . rawurlencode($category['slug']);
}

/** Catalog entries (news) of a category that crawlers may index, in display order. */
function pn_seo_category_entries(array $catalog, array $category, array $site): array
{
    $entries = [];
    foreach ($catalog as $entry) {
        if ($entry['base'] === PN_SEO_NEWS_BASE && ($entry['raw']['category'] ?? null) === $category['slug'] && !pn_seo_entry_noindex($entry, $site)) {
            $entries[] = $entry;
        }
    }
    return $entries;
}

function pn_seo_section_of(array $consignment): string
{
    $section = $consignment['section'] ?? 'ky-gui';
    return is_string($section) && isset(PN_SEO_SECTION_BASES[$section]) ? $section : 'ky-gui';
}

/**
 * Everything that has its own detail URL, in display order.
 * Each entry: base, slug, kind (news|project|property|consignment), raw, priceVnd, date.
 * Native items win over promoted consignments with the same slug, like the SPA does.
 */
function pn_seo_catalog(array $data): array
{
    $entries = [];
    $add = static function (string $base, string $kind, array $raw, ?float $priceVnd, string $dateKey) use (&$entries): void {
        $entries[] = ['base' => $base, 'slug' => $raw['slug'], 'kind' => $kind, 'raw' => $raw, 'priceVnd' => $priceVnd, 'dateKey' => $dateKey];
    };
    $price = static fn(array $raw, float $factor): ?float => (is_int($raw['price'] ?? null) || is_float($raw['price'] ?? null)) && $raw['price'] > 0 ? (float) $raw['price'] * $factor : null;
    $groups = [
        ['/du-an', 'project', $data['projects'], 'du-an'],
        ['/chuyen-nhuong', 'property', $data['properties'], 'chuyen-nhuong'],
    ];
    foreach ($groups as [$base, $kind, $native, $section]) {
        $taken = [];
        foreach ($native as $raw) {
            $taken[$raw['slug']] = true;
            $add($base, $kind, $raw, $kind === 'property' ? $price($raw, 1.0) : null, 'createdAt');
        }
        foreach ($data['consignments'] as $raw) {
            if (pn_seo_section_of($raw) === $section && !isset($taken[$raw['slug']])) {
                $add($base, 'consignment', $raw, $price($raw, 1.0e9), 'publishedAt');
            }
        }
    }
    foreach ($data['consignments'] as $raw) {
        if (pn_seo_section_of($raw) === 'ky-gui') {
            $add('/ky-gui', 'consignment', $raw, $price($raw, 1.0e9), 'publishedAt');
        }
    }
    foreach ($data['news'] as $raw) {
        $add('/tin-tuc', 'news', $raw, null, 'publishedAt');
    }
    return $entries;
}

function pn_seo_entry_path(array $entry): string
{
    return $entry['base'] . '/' . rawurlencode($entry['slug']);
}

function pn_seo_entry_noindex(array $entry, array $site): bool
{
    return !$site['indexSite'] || (is_array($entry['raw']['seo'] ?? null) && ($entry['raw']['seo']['noindex'] ?? false) === true);
}

/** W3C date (Y-m-d or full ISO) from a stored date string, or null. */
function pn_seo_date(mixed $value): ?string
{
    if (!is_string($value) || trim($value) === '') {
        return null;
    }
    $value = trim($value);
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1) {
        return checkdate((int) substr($value, 5, 2), (int) substr($value, 8, 2), (int) substr($value, 0, 4)) ? $value : null;
    }
    $time = strtotime($value);
    return $time === false ? null : gmdate('c', $time);
}

function pn_seo_entry_date(array $entry): ?string
{
    foreach (['updatedAt', $entry['dateKey'], 'createdAt'] as $key) {
        $date = pn_seo_date($entry['raw'][$key] ?? null);
        if ($date !== null) {
            return $date;
        }
    }
    return null;
}

// ---------------------------------------------------------------------------------------------
// Request handling
// ---------------------------------------------------------------------------------------------

/** Canonical origin: server/config.php "site_url", else https:// + the Host header, else the production host. */
function pn_seo_origin(): string
{
    $configured = pn_config()['site_url'];
    if (preg_match('~^https?://[a-z0-9][a-z0-9.-]*(:\d{1,5})?$~i', $configured) === 1) {
        return strtolower($configured);
    }
    $host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
    if (preg_match('/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d{1,5})?$/', $host) === 1) {
        return 'https://' . $host;
    }
    return 'https://' . PN_SEO_FALLBACK_HOST;
}

/** @return array{0: string, 1: ?string}|null  [page, slug] or null when no route matches */
function pn_seo_match_route(string $path): ?array
{
    if ($path === '' || $path[0] !== '/' || str_contains($path, '//')) {
        return null;
    }
    if ($path !== '/') {
        $path = rtrim($path, '/');
    }
    $segments = $path === '/' ? [] : explode('/', substr($path, 1));
    foreach (PN_SEO_ROUTES as $route) {
        $pattern = $route['path'] === '/' ? [] : explode('/', substr($route['path'], 1));
        if (count($pattern) !== count($segments)) {
            continue;
        }
        $slug = null;
        $matched = true;
        foreach ($pattern as $i => $part) {
            if ($part === ':slug') {
                $decoded = rawurldecode($segments[$i]);
                if ($decoded === '' || preg_match('//u', $decoded) !== 1) {
                    $matched = false;
                    break;
                }
                $slug = $decoded;
            } elseif ($part !== $segments[$i]) {
                $matched = false;
                break;
            }
        }
        if ($matched) {
            return [$route['page'], $slug];
        }
    }
    return null;
}

function pn_seo_find_entry(array $catalog, string $base, string $slug): ?array
{
    foreach ($catalog as $entry) {
        if ($entry['base'] === $base && $entry['slug'] === $slug) {
            return $entry;
        }
    }
    return null;
}

function pn_seo_template(): string
{
    $html = @file_get_contents(pn_config()['webroot'] . '/index.html');
    if ($html === false || stripos($html, '</head>') === false) {
        throw new RuntimeException('SPA template index.html is missing');
    }
    return $html;
}

function pn_seo_esc(string $text): string
{
    return htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function pn_seo_abs(string $origin, string $pathOrUrl): string
{
    return str_starts_with($pathOrUrl, 'https://') ? $pathOrUrl : $origin . $pathOrUrl;
}

function pn_seo_json(array $data): string
{
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_INVALID_UTF8_SUBSTITUTE);
    if ($json === false) {
        throw new RuntimeException('Cannot encode JSON-LD');
    }
    return $json;
}

function pn_seo_breadcrumb(string $origin, array $crumbs): array
{
    $items = [];
    foreach (array_values($crumbs) as $i => [$name, $path]) {
        $items[] = ['@type' => 'ListItem', 'position' => $i + 1, 'name' => $name, 'item' => $origin . $path];
    }
    return ['@context' => 'https://schema.org', '@type' => 'BreadcrumbList', 'itemListElement' => $items];
}

function pn_seo_organization(string $origin, array $company, array $site): array
{
    $org = ['@context' => 'https://schema.org', '@type' => 'RealEstateAgent', 'name' => $site['siteName'], 'url' => $origin . '/', 'logo' => $origin . '/icons/icon-512.png'];
    $logo = pn_seo_usable_image($company['logoImage'] ?? '');
    if ($logo !== '') {
        $org['logo'] = pn_seo_abs($origin, $logo);
    }
    $hotline = pn_seo_collapse(pn_seo_text($company['hotline'] ?? ''));
    if ($hotline !== '') {
        $org['telephone'] = $hotline;
    }
    $email = pn_seo_collapse(pn_seo_text($company['email'] ?? ''));
    if ($email !== '') {
        $org['email'] = $email;
    }
    $address = pn_seo_collapse(pn_seo_text($company['address'] ?? ''));
    if ($address !== '') {
        $org['address'] = ['@type' => 'PostalAddress', 'streetAddress' => $address, 'addressCountry' => 'VN'];
    }
    $same = [];
    foreach (is_array($company['social'] ?? null) ? $company['social'] : [] as $link) {
        if (is_string($link) && preg_match('~^https://[^\s"\'<>\\\\]+$~', $link) === 1) {
            $same[] = $link;
        }
    }
    if ($same !== []) {
        $org['sameAs'] = $same;
    }
    return $org;
}

/** CollectionPage listing the category's articles, plus the breadcrumb. */
function pn_seo_category_jsonld(array $page, string $origin, array $site): array
{
    $meta = $page['meta'];
    $label = $page['heading'];
    $items = [];
    foreach ($page['links'] as $i => [$title, $path]) {
        $items[] = ['@type' => 'ListItem', 'position' => $i + 1, 'url' => $origin . $path, 'name' => $title];
    }
    $collection = [
        '@context' => 'https://schema.org', '@type' => 'CollectionPage',
        'name' => $label, 'description' => $meta['description'], 'url' => $origin . $meta['path'], 'inLanguage' => 'vi-VN',
        'isPartOf' => ['@type' => 'WebSite', 'name' => $site['siteName'], 'url' => $origin . '/'],
    ];
    if ($items !== []) {
        $collection['mainEntity'] = ['@type' => 'ItemList', 'itemListElement' => $items];
    }
    return [$collection, pn_seo_breadcrumb($origin, [['Trang chủ', '/'], [PN_SEO_SECTION_LABELS[PN_SEO_NEWS_BASE], PN_SEO_NEWS_BASE], [$label, $meta['path']]])];
}

/** @return list<array> JSON-LD objects for a page */
function pn_seo_jsonld(array $page, string $origin, array $company, array $site): array
{
    if ($page['type'] === 'home') {
        return [
            pn_seo_organization($origin, $company, $site),
            ['@context' => 'https://schema.org', '@type' => 'WebSite', 'name' => $site['siteName'], 'url' => $origin . '/', 'inLanguage' => 'vi-VN'],
        ];
    }
    if ($page['type'] === 'category') {
        return pn_seo_category_jsonld($page, $origin, $site);
    }
    if ($page['type'] !== 'detail') {
        return [];
    }
    $entry = $page['entry'];
    $meta = $page['meta'];
    $url = $origin . $meta['path'];
    $name = pn_seo_item_title($entry['kind'], $entry['raw']);
    $image = pn_seo_abs($origin, $meta['image']);
    $date = pn_seo_entry_date($entry);
    if ($entry['kind'] === 'news') {
        $author = pn_seo_collapse(pn_seo_text($entry['raw']['author'] ?? ''));
        $main = [
            '@context' => 'https://schema.org', '@type' => 'Article',
            'headline' => mb_substr($name, 0, 110), 'description' => $meta['description'], 'image' => [$image],
            'mainEntityOfPage' => $url, 'inLanguage' => 'vi-VN',
            'author' => ['@type' => $author !== '' ? 'Person' : 'Organization', 'name' => $author !== '' ? $author : $site['siteName']],
            'publisher' => ['@type' => 'Organization', 'name' => $site['siteName'], 'logo' => ['@type' => 'ImageObject', 'url' => $origin . '/icons/icon-512.png']],
        ];
        if ($date !== null) {
            $main['datePublished'] = $date;
        }
    } else {
        $main = ['@context' => 'https://schema.org', '@type' => 'RealEstateListing', 'name' => $name, 'description' => $meta['description'], 'url' => $url, 'image' => [$image], 'inLanguage' => 'vi-VN'];
        if ($date !== null) {
            $main['datePosted'] = $date;
        }
        $location = pn_seo_collapse(pn_seo_text($entry['raw']['location'] ?? ''));
        if ($location !== '') {
            $main['contentLocation'] = ['@type' => 'Place', 'address' => ['@type' => 'PostalAddress', 'streetAddress' => $location, 'addressCountry' => 'VN']];
        }
        if ($entry['priceVnd'] !== null) {
            $main['offers'] = ['@type' => 'Offer', 'price' => (int) round($entry['priceVnd']), 'priceCurrency' => 'VND', 'url' => $url];
        }
    }
    $crumbs = [['Trang chủ', '/'], [PN_SEO_SECTION_LABELS[$entry['base']], $entry['base']], [$name, $meta['path']]];
    return [$main, pn_seo_breadcrumb($origin, $crumbs)];
}

/** The <head> block that replaces the template's own title/meta tags. */
function pn_seo_head_html(array $page, string $origin, array $company, array $site): string
{
    $meta = $page['meta'];
    $e = 'pn_seo_esc';
    $title = $e($meta['title']);
    $description = $e($meta['description']);
    $lines = ['<title>' . $title . '</title>', '<meta name="description" content="' . $description . '" />'];
    if ($meta['keywords'] !== '') {
        $lines[] = '<meta name="keywords" content="' . $e($meta['keywords']) . '" />';
    }
    $lines[] = '<meta name="robots" content="' . $e($meta['robots']) . '" />';
    $indexable = $meta['robots'] === PN_SEO_ROBOTS_INDEX;
    $url = $origin . $meta['path'];
    $image = pn_seo_abs($origin, $meta['image']);
    if ($indexable) {
        $lines[] = '<link rel="canonical" href="' . $e($url) . '" />';
    }
    $lines[] = '<meta property="og:type" content="' . $e($meta['ogType']) . '" />';
    $lines[] = '<meta property="og:site_name" content="' . $e($site['siteName']) . '" />';
    $lines[] = '<meta property="og:locale" content="vi_VN" />';
    $lines[] = '<meta property="og:title" content="' . $title . '" />';
    $lines[] = '<meta property="og:description" content="' . $description . '" />';
    $lines[] = '<meta property="og:url" content="' . $e($url) . '" />';
    $lines[] = '<meta property="og:image" content="' . $e($image) . '" />';
    if ($meta['image'] === PN_SEO_DEFAULT_IMAGE) {
        $lines[] = '<meta property="og:image:width" content="1200" />';
        $lines[] = '<meta property="og:image:height" content="630" />';
    }
    $lines[] = '<meta name="twitter:card" content="summary_large_image" />';
    $lines[] = '<meta name="twitter:title" content="' . $title . '" />';
    $lines[] = '<meta name="twitter:description" content="' . $description . '" />';
    $lines[] = '<meta name="twitter:image" content="' . $e($image) . '" />';
    if ($site['googleVerification'] !== '') {
        $lines[] = '<meta name="google-site-verification" content="' . $e($site['googleVerification']) . '" />';
    }
    if ($site['bingVerification'] !== '') {
        $lines[] = '<meta name="msvalidate.01" content="' . $e($site['bingVerification']) . '" />';
    }
    if ($indexable) {
        foreach (pn_seo_jsonld($page, $origin, $company, $site) as $object) {
            $lines[] = '<script type="application/ld+json">' . pn_seo_json($object) . '</script>';
        }
    }
    return "    " . implode("\n    ", $lines) . "\n";
}

/** One <li><a> per catalog entry of a list page (max PN_SEO_LIST_LINKS_MAX). */
function pn_seo_list_items(array $catalog, string $base, array $site): array
{
    $items = [];
    foreach ($catalog as $entry) {
        if ($entry['base'] === $base && !pn_seo_entry_noindex($entry, $site)) {
            $items[] = [pn_seo_item_title($entry['kind'], $entry['raw']), pn_seo_entry_path($entry)];
            if (count($items) >= PN_SEO_LIST_LINKS_MAX) {
                break;
            }
        }
    }
    return $items;
}

/** Plain-text excerpt of the full description, <= PN_SEO_EXCERPT_MAX characters. */
function pn_seo_excerpt(array $entry, string $description): string
{
    $full = pn_seo_text($entry['kind'] === 'news' ? ($entry['raw']['content'] ?? '') : ($entry['raw']['fullDescription'] ?? ''));
    $text = pn_seo_plain_text($full);
    if ($text === '' || $text === $description) {
        return '';
    }
    return mb_strlen($text) > PN_SEO_EXCERPT_MAX ? rtrim(mb_substr($text, 0, PN_SEO_EXCERPT_MAX)) . '…' : $text;
}

/** Minimal semantic content placed inside <div id="root">; React replaces it when the app starts. */
function pn_seo_fallback_html(array $page, array $site): string
{
    $e = 'pn_seo_esc';
    $parts = [];
    if ($page['type'] === 'admin') {
        return '';
    }
    $meta = $page['meta'];
    $heading = $page['type'] === 'home' ? $site['siteName'] : ($page['heading'] ?? $meta['title']);
    $parts[] = '<h1>' . $e($heading) . '</h1>';
    $parts[] = '<p>' . $e($meta['description']) . '</p>';
    if ($page['type'] === 'detail') {
        $excerpt = pn_seo_excerpt($page['entry'], $meta['description']);
        if ($excerpt !== '') {
            $parts[] = '<p>' . $e($excerpt) . '</p>';
        }
    }
    $linkList = static fn(array $links): string => '<ul>' . implode('', array_map(
        static fn(array $l): string => '<li><a href="' . $e($l[1]) . '">' . $e($l[0]) . '</a></li>',
        $links
    )) . '</ul>';
    if (($page['type'] === 'list' || $page['type'] === 'category') && $page['links'] !== []) {
        $parts[] = $linkList($page['links']);
    }
    if (($page['categoryLinks'] ?? []) !== []) {
        $parts[] = '<nav aria-label="Chuyên mục">' . $linkList($page['categoryLinks']) . '</nav>';
    }
    $nav = [['/', 'Trang chủ']];
    foreach (PN_SEO_SECTION_LABELS as $path => $label) {
        $nav[] = [$path, $label];
    }
    $nav[] = ['/lien-he', 'Liên hệ'];
    $parts[] = '<nav aria-label="Điều hướng">' . implode(' | ', array_map(
        static fn(array $n): string => '<a href="' . $e($n[0]) . '">' . $e($n[1]) . '</a>',
        $nav
    )) . '</nav>';
    return '<main id="seo-fallback" style="max-width:48rem;margin:0 auto;padding:2rem 1rem;font-family:Inter,system-ui,sans-serif;color:#0A192F;line-height:1.6">'
        . implode('', $parts) . '</main>';
}

/** Replaces the template's own SEO tags with $headHtml and fills <div id="root">. */
function pn_seo_apply_template(string $template, string $headHtml, string $bodyHtml): string
{
    $strip = [
        '~<title\b[^>]*>.*?</title>\s*~is',
        '~<meta\s[^>]*?\bname=["\'](?:description|keywords|robots|twitter:[a-z:]+|google-site-verification|msvalidate\.01)["\'][^>]*>\s*~i',
        '~<meta\s[^>]*?\bproperty=["\']og:[a-z:_]+["\'][^>]*>\s*~i',
        '~<link\s[^>]*?\brel=["\']canonical["\'][^>]*>\s*~i',
        '~<script\s[^>]*?\btype=["\']application/ld\+json["\'][^>]*>.*?</script>\s*~is',
    ];
    $html = preg_replace($strip, '', $template) ?? $template;
    $inserted = preg_replace('~(<meta\s[^>]*?\bcharset=[^>]*>\s*)~i', '$1' . "\n" . str_replace(['\\', '$'], ['\\\\', '\\$'], $headHtml), $html, 1, $count);
    if ($inserted === null || $count === 0) {
        $inserted = preg_replace('~</head>~i', str_replace(['\\', '$'], ['\\\\', '\\$'], $headHtml) . '</head>', $html, 1) ?? $html;
    }
    $filled = preg_replace('~<div\s+id=["\']root["\']\s*>\s*</div>~i', str_replace(['\\', '$'], ['\\\\', '\\$'], '<div id="root">' . $bodyHtml . '</div>'), $inserted, 1);
    return $filled ?? $inserted;
}

/**
 * Decides what a URL path is: 'html' page (status, meta, links ...), 'redirect', or a special document.
 * @return array{status:int, page?:array, location?:string}
 */
function pn_seo_resolve(string $path, array $data, array $site): array
{
    $route = pn_seo_match_route($path);
    $notFound = ['status' => 404, 'page' => ['type' => 'notFound', 'heading' => 'Không tìm thấy trang', 'meta' => pn_seo_static_meta('notFound', $path, $site)]];
    if ($route === null) {
        return $notFound;
    }
    [$page, $slug] = $route;
    $catalog = pn_seo_catalog($data);
    $canonicalPath = $path === '/' ? '/' : rtrim($path, '/');
    switch ($page) {
        case 'home':
            return ['status' => 200, 'page' => ['type' => 'home', 'meta' => pn_seo_home_meta($site)]];
        case 'admin':
            return ['status' => 200, 'page' => ['type' => 'admin', 'meta' => pn_seo_static_meta('admin', '/admin', $site)]];
        case 'contact':
            return ['status' => 200, 'page' => ['type' => 'static', 'heading' => PN_SEO_STATIC_PAGES['contact'][0], 'meta' => pn_seo_static_meta('contact', '/lien-he', $site)]];
        case 'projects':
        case 'properties':
        case 'consignments':
        case 'news':
            $base = ['projects' => '/du-an', 'properties' => '/chuyen-nhuong', 'consignments' => '/ky-gui', 'news' => '/tin-tuc'][$page];
            return ['status' => 200, 'page' => [
                'type' => 'list',
                'meta' => pn_seo_static_meta($page, $base, $site),
                'heading' => PN_SEO_STATIC_PAGES[$page][0],
                'links' => pn_seo_list_items($catalog, $base, $site),
                'categoryLinks' => $page === 'news'
                    ? array_map(static fn(array $c): array => [pn_seo_collapse($c['label']), pn_seo_category_path($c)], $data['newsCategories'])
                    : [],
            ]];
        case 'newsCategory':
            $category = pn_seo_find_category($data, (string) $slug);
            if ($category === null) {
                return $notFound;
            }
            $entries = pn_seo_category_entries($catalog, $category, $site);
            return ['status' => 200, 'page' => [
                'type' => 'category',
                'meta' => pn_seo_category_meta($category, count($entries), $site, pn_seo_category_path($category)),
                'heading' => pn_seo_collapse($category['label']),
                'links' => array_map(
                    static fn(array $e): array => [pn_seo_item_title($e['kind'], $e['raw']), pn_seo_entry_path($e)],
                    array_slice($entries, 0, PN_SEO_LIST_LINKS_MAX)
                ),
            ]];
    }
    $base = ['project' => '/du-an', 'property' => '/chuyen-nhuong', 'consignment' => '/ky-gui', 'article' => '/tin-tuc'][$page];
    $entry = pn_seo_find_entry($catalog, $base, (string) $slug);
    if ($entry === null && $page === 'consignment') {
        $moved = pn_seo_consignment_elsewhere($data, (string) $slug);
        if ($moved !== null) {
            return ['status' => 301, 'location' => $moved];
        }
    }
    if ($entry === null) {
        // A slug that is current for another item already matched above and always wins over an old slug.
        $moved = pn_seo_old_slug_target($data, $catalog, $page, $base, (string) $slug);
        return $moved !== null ? ['status' => 301, 'location' => $moved] : $notFound;
    }
    $meta = pn_seo_item_meta($entry['kind'], $entry['raw'], $site, pn_seo_entry_path($entry));
    return ['status' => 200, 'page' => ['type' => 'detail', 'entry' => $entry, 'meta' => $meta, 'heading' => pn_seo_item_title($entry['kind'], $entry['raw'])]];
}

/** /ky-gui/<slug> of a listing that belongs to another section -> that section's URL. */
function pn_seo_consignment_elsewhere(array $data, string $slug): ?string
{
    foreach ($data['consignments'] as $raw) {
        if ($raw['slug'] === $slug) {
            $section = pn_seo_section_of($raw);
            return $section === 'ky-gui' ? null : PN_SEO_SECTION_BASES[$section] . '/' . rawurlencode($slug);
        }
    }
    return null;
}

/** Previous slugs of an item (list of valid slugs), kept in oldSlugs when an admin renames it. */
function pn_seo_old_slugs(array $raw): array
{
    $list = $raw['oldSlugs'] ?? null;
    if (!is_array($list) || !array_is_list($list)) {
        return [];
    }
    return array_values(array_filter($list, static fn($v): bool => is_string($v) && preg_match(PN_SEO_OLD_SLUG_PATTERN, $v) === 1));
}

/** Current URL of the item that used to live at <base>/<slug>, or null (never listed in the sitemap). */
function pn_seo_old_slug_target(array $data, array $catalog, string $page, string $base, string $slug): ?string
{
    if ($page === 'consignment') {
        foreach ($data['consignments'] as $raw) {
            if (in_array($slug, pn_seo_old_slugs($raw), true)) {
                return PN_SEO_SECTION_BASES[pn_seo_section_of($raw)] . '/' . rawurlencode($raw['slug']);
            }
        }
        return null;
    }
    foreach ($catalog as $entry) {
        if ($entry['base'] === $base && in_array($slug, pn_seo_old_slugs($entry['raw']), true)) {
            return pn_seo_entry_path($entry);
        }
    }
    return null;
}

function pn_seo_sitemap_xml(string $origin, array $data, array $site): string
{
    $urls = [];
    if ($site['indexSite']) {
        $catalog = pn_seo_catalog($data);
        $newest = [];
        foreach ($catalog as $entry) {
            if (pn_seo_entry_noindex($entry, $site)) {
                continue;
            }
            $date = pn_seo_entry_date($entry);
            $urls[pn_seo_entry_path($entry)] = $date;
            if ($date !== null && ($newest[$entry['base']] ?? '') < $date) {
                $newest[$entry['base']] = $date;
            }
        }
        $fixed = ['/' => null, '/du-an' => $newest['/du-an'] ?? null, '/chuyen-nhuong' => $newest['/chuyen-nhuong'] ?? null,
            '/ky-gui' => $newest['/ky-gui'] ?? null, '/tin-tuc' => $newest['/tin-tuc'] ?? null, '/lien-he' => null];
        // Categories with at least one indexable article (an empty category page is noindex and stays out).
        foreach ($data['newsCategories'] as $category) {
            $entries = pn_seo_category_entries($catalog, $category, $site);
            if ($entries === []) {
                continue;
            }
            $dates = array_filter(array_map('pn_seo_entry_date', $entries), static fn($d): bool => $d !== null);
            $fixed[pn_seo_category_path($category)] = $dates === [] ? null : max($dates);
        }
        $urls = $fixed + $urls;
    }
    $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
    foreach ($urls as $path => $date) {
        $xml .= '  <url><loc>' . htmlspecialchars($origin . $path, ENT_XML1 | ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</loc>'
            . ($date !== null ? '<lastmod>' . $date . '</lastmod>' : '') . "</url>\n";
    }
    return $xml . "</urlset>\n";
}

function pn_seo_robots_txt(string $origin, array $site): string
{
    // indexSite=false must stay crawlable: Google only sees noindex on pages it may fetch.
    if (!$site['indexSite']) {
        return "User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n";
    }
    return "User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: " . $origin . "/sitemap.xml\n";
}

/**
 * Builds the complete response. Nothing is sent here, so a failure can still fall back to the static shell.
 * @return array{status:int, type:string, body:string, headers:array<string,string>, cache:bool, mtime:int}
 */
function pn_seo_build(string $path): array
{
    $data = pn_seo_load_data();
    $site = pn_seo_site($data['company']);
    $origin = pn_seo_origin();
    $mtime = max(pn_seo_data_mtime(), (int) @filemtime(pn_config()['webroot'] . '/index.html'));
    $response = ['status' => 200, 'type' => 'text/html', 'body' => '', 'headers' => [], 'cache' => true, 'mtime' => $mtime];

    if ($path === '/sitemap.xml') {
        return ['type' => 'application/xml', 'body' => pn_seo_sitemap_xml($origin, $data, $site)] + $response;
    }
    if ($path === '/robots.txt') {
        return ['type' => 'text/plain', 'body' => pn_seo_robots_txt($origin, $site)] + $response;
    }
    $file = $site['googleHtmlFile'];
    if ($file !== null && $path === '/' . $file['name']) {
        return ['body' => $file['content']] + $response;
    }

    $resolved = pn_seo_resolve($path, $data, $site);
    if ($resolved['status'] === 301) {
        return ['status' => 301, 'body' => '', 'headers' => ['Location' => $origin . $resolved['location']]] + $response;
    }
    $page = $resolved['page'];
    $html = pn_seo_apply_template(
        pn_seo_template(),
        pn_seo_head_html($page, $origin, $data['company'], $site),
        pn_seo_fallback_html($page, $site)
    );
    $headers = [];
    if ($page['meta']['robots'] === PN_SEO_ROBOTS_NOINDEX) {
        $headers['X-Robots-Tag'] = 'noindex, nofollow';
    }
    return ['status' => $resolved['status'], 'body' => $html, 'headers' => $headers] + $response;
}

function pn_seo_emit(array $r, string $method): void
{
    http_response_code($r['status']);
    header('Content-Type: ' . $r['type'] . '; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    foreach ($r['headers'] as $name => $value) {
        header($name . ': ' . $value);
    }
    if ($r['cache'] && $r['mtime'] > 0) {
        $etag = 'W/"' . md5($r['mtime'] . '|' . $r['status'] . '|' . strlen($r['body']) . '|' . md5($r['body'])) . '"';
        header('Cache-Control: public, max-age=0, must-revalidate');
        header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $r['mtime']) . ' GMT');
        header('ETag: ' . $etag);
        $ifNoneMatch = trim((string) ($_SERVER['HTTP_IF_NONE_MATCH'] ?? ''));
        $ifModified = strtotime((string) ($_SERVER['HTTP_IF_MODIFIED_SINCE'] ?? ''));
        $fresh = $ifNoneMatch !== ''
            ? in_array($etag, array_map('trim', explode(',', $ifNoneMatch)), true)
            : ($ifModified !== false && $ifModified >= $r['mtime']);
        if ($r['status'] === 200 && $fresh) {
            http_response_code(304);
            return;
        }
    }
    if ($method !== 'HEAD') {
        echo $r['body'];
    }
}

/** Last resort: serve the untouched SPA shell (or 503 for the machine-readable documents). */
function pn_seo_emit_static(string $path, string $method): void
{
    $html = false;
    if ($path !== '/sitemap.xml' && $path !== '/robots.txt') {
        $candidates = [dirname(__DIR__, 2) . '/public_html/index.html'];
        try {
            array_unshift($candidates, pn_config()['webroot'] . '/index.html');
        } catch (Throwable) {
            // config.php unusable: the default layout is all we have
        }
        foreach ($candidates as $file) {
            $html = @file_get_contents($file);
            if ($html !== false) {
                break;
            }
        }
    }
    if ($html === false) {
        http_response_code(503);
        header('Content-Type: text/plain; charset=utf-8');
        header('Retry-After: 120');
        echo $method === 'HEAD' ? '' : 'Service temporarily unavailable';
        return;
    }
    http_response_code(200);
    header('Content-Type: text/html; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-cache');
    if ($method !== 'HEAD') {
        echo $html;
    }
}

function pn_seo_main(): void
{
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if ($method !== 'GET' && $method !== 'HEAD') {
        http_response_code(405);
        header('Allow: GET, HEAD');
        header('Content-Type: text/plain; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
        echo 'Method not allowed';
        return;
    }
    $uri = (string) ($_SERVER['REQUEST_URI'] ?? '/');
    $path = (string) strtok(explode('#', $uri)[0], '?');
    if (strlen($uri) > PN_SEO_MAX_URI || strlen($path) > PN_SEO_MAX_PATH) {
        http_response_code(414);
        header('Content-Type: text/plain; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
        echo 'URI too long';
        return;
    }
    try {
        pn_seo_emit(pn_seo_build($path), $method);
    } catch (Throwable $e) {
        error_log('seo error: ' . get_class($e) . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
        if (!headers_sent()) {
            header_remove('Location');
            pn_seo_emit_static($path, $method);
        }
    }
}
