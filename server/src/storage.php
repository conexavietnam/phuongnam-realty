<?php
declare(strict_types=1);

const PN_PUBLIC_COLLECTIONS = [
    'properties' => 'list',
    'projects' => 'list',
    'news' => 'list',
    'news_categories' => 'list',
    'agents' => 'list',
    'consignments' => 'list',
    'company' => 'object',
    'filters' => 'object',
    'menu' => 'object',
];

const PN_ADMIN_COLLECTIONS = [
    'customer_leads' => 'list',
    'media' => 'list',
];

const PN_BACKUPS_KEPT = 10;
const PN_CONSIGNMENT_STATUSES = ['draft', 'published', 'sold'];
/** Where a listing is shown on the public site; a missing section means 'ky-gui'. */
const PN_CONSIGNMENT_SECTIONS = ['ky-gui', 'chuyen-nhuong', 'du-an'];
const PN_CONSIGNMENT_MAX_HIGHLIGHTS = 20;
const PN_CONSIGNMENT_MAX_HIGHLIGHT_LENGTH = 200;
const PN_CONSIGNMENT_PUBLIC_STATUSES = ['published', 'sold'];
const PN_CONSIGNMENT_PRIVATE_KEYS = ['internalNote', 'leadId', 'ownerName', 'ownerPhone'];
const PN_CONSIGNMENT_MAX_ITEMS = 2000;
const PN_CONSIGNMENT_MAX_KEYS = 40;
const PN_CONSIGNMENT_MAX_IMAGES = 100;
const PN_CONSIGNMENT_TEXT_LIMITS = [
    'id' => 100,
    'slug' => 200,
    'title' => 300,
    'name' => 300,
    'purpose' => 20,
    'propertyType' => 50,
    'category' => 50,
    'region' => 100,
    'location' => 300,
    'district' => 150,
    'priceDisplay' => 100,
    'direction' => 100,
    'legal' => 200,
    'shortDescription' => 3000,
    'fullDescription' => 200000,
    'floor' => 100,
    'view' => 150,
    'investor' => 200,
    'projectStatus' => 100,
    'priceFrom' => 100,
    'categoryLabel' => 100,
    'thumbnail' => 500,
    'createdAt' => 40,
    'publishedAt' => 40,
];
const PN_CONSIGNMENT_NUMBER_KEYS = ['price', 'area', 'bedrooms', 'bathrooms'];

const PN_SEO_TITLE_MAX = 120;
const PN_SEO_DESCRIPTION_MAX = 320;
const PN_SEO_MAX_KEYWORDS = 15;
const PN_SEO_KEYWORD_MAX = 60;
const PN_SEO_URL_MAX = 500;
const PN_SEO_SUFFIX_MAX = 60;
const PN_SEO_ITEM_KEYS = ['title', 'description', 'keywords', 'ogImage', 'noindex'];
const PN_SEO_SITE_KEYS = ['titleSuffix', 'defaultDescription', 'defaultOgImage', 'googleSiteVerification', 'bingSiteVerification', 'googleHtmlFile', 'indexSite'];
const PN_SEO_SLUG_PATTERN = '/^[a-z0-9-]{0,200}$/D';
const PN_SEO_OLD_SLUG_PATTERN = '/^[a-z0-9-]{1,200}$/D';
const PN_SEO_MAX_OLD_SLUGS = 10;
/** A site path under /uploads/ or /images/, or an https URL: nothing that could carry markup. */
const PN_SEO_IMAGE_PATTERN = '~^(?:/(?:uploads|images)/[^\s"\'<>\\\\]*|https://[^\s"\'<>\\\\]+)$~D';
const PN_SEO_VERIFICATION_PATTERN = '/^[A-Za-z0-9_-]{10,100}$/D';
const PN_SEO_HTML_FILE_NAME_PATTERN = '/^google[a-z0-9]{8,64}\.html$/D';
const PN_SEO_HTML_FILE_CONTENT_PATTERN = '/^[A-Za-z0-9 :._-]{1,200}$/D';

const PN_NEWS_CATEGORIES_MAX = 40;
const PN_NEWS_CATEGORY_LABEL_MAX = 60;
const PN_NEWS_CATEGORY_DESCRIPTION_MAX = 300;
const PN_NEWS_CATEGORY_ID_MAX = 100;
const PN_NEWS_CATEGORY_SLUG_PATTERN = '/^[a-z0-9-]{1,80}$/D';
const PN_NEWS_CATEGORY_KEYS = ['id', 'slug', 'label', 'description', 'order', 'seo'];
const PN_NEWS_CATEGORY_SEO_KEYS = ['title', 'description'];
/** News slugs that would collide with a fixed URL: /tin-tuc/danh-muc/<category>. Keep in step with RESERVED_NEWS_SLUGS in src/utils/newsMeta.ts. */
const PN_NEWS_RESERVED_SLUGS = ['danh-muc'];

const PN_MENU_MAX_ITEMS = 10;
const PN_MENU_MAX_CHILDREN = 12;
const PN_MENU_MAX_BOTTOM_ITEMS = 5;
const PN_MENU_LABEL_MAX = 40;
const PN_MENU_URL_MAX = 500;
const PN_MENU_ID_PATTERN = '/^[A-Za-z0-9_-]{1,60}$/D';
/** Lucide icons the bottom bar can show. Keep in step with MENU_ICON_NAMES in src/components/common/menuIcons.ts. */
const PN_MENU_ICONS = ['Home', 'Building2', 'Send', 'Newspaper', 'Phone', 'Mail', 'MapPin', 'Search', 'Heart', 'User', 'Info', 'Handshake', 'Key', 'Landmark'];
const PN_MENU_DESKTOP_KEYS = ['id', 'label', 'path', 'exact', 'visible', 'newTab', 'children'];
const PN_MENU_CHILD_KEYS = ['id', 'label', 'path', 'exact', 'visible', 'newTab'];
const PN_MENU_BOTTOM_KEYS = ['id', 'label', 'path', 'icon', 'exact', 'visible'];
/** No whitespace, quotes, angle brackets or backslash in a link. */
const PN_MENU_URL_FORBIDDEN = '/[\s"\'<>\\\\]/';

function pn_collection_kind(string $name): ?string
{
    return PN_PUBLIC_COLLECTIONS[$name] ?? PN_ADMIN_COLLECTIONS[$name] ?? null;
}

function pn_is_public_collection(string $name): bool
{
    return isset(PN_PUBLIC_COLLECTIONS[$name]);
}

function pn_data_path(string $name): string
{
    return pn_config()['data_dir'] . '/' . $name . '.json';
}

function pn_load_or_seed(string $name, string $path): string
{
    $raw = @file_get_contents($path);
    if ($raw !== false) {
        return $raw;
    }
    $seed = @file_get_contents(dirname(__DIR__) . '/seed/' . $name . '.json');
    if ($seed === false) {
        throw new RuntimeException('Seed file missing for ' . $name);
    }
    pn_atomic_write($path, $seed);
    return $seed;
}

function pn_read_collection(string $name): string
{
    $path = pn_data_path($name);
    $raw = @file_get_contents($path);
    if ($raw !== false) {
        return $raw;
    }
    return (string) pn_with_lock($path, static fn(): string => pn_load_or_seed($name, $path));
}

/**
 * Read-modify-write under an exclusive lock.
 * $fn receives the current raw JSON and returns [newRawJsonOrNull, result].
 */
function pn_mutate_collection(string $name, callable $fn, bool $backup = true): mixed
{
    $path = pn_data_path($name);
    return pn_with_lock($path, function () use ($name, $path, $fn, $backup): mixed {
        $current = pn_load_or_seed($name, $path);
        [$next, $result] = $fn($current);
        if ($next !== null) {
            if ($backup) {
                pn_backup_collection($name, $path);
            }
            pn_atomic_write($path, $next);
        }
        return $result;
    });
}

function pn_backup_collection(string $name, string $path): void
{
    $dir = pn_config()['data_dir'] . '/backups';
    pn_ensure_dir($dir);
    $target = $dir . '/' . $name . '.' . sprintf('%017.6f', microtime(true)) . '.json';
    if (!copy($path, $target)) {
        throw new RuntimeException('Cannot write backup');
    }
    chmod($target, 0640);
    $files = glob($dir . '/' . $name . '.*.json') ?: [];
    sort($files, SORT_STRING);
    foreach (array_slice($files, 0, max(0, count($files) - PN_BACKUPS_KEPT)) as $old) {
        @unlink($old);
    }
}

function pn_valid_media_item(mixed $item): bool
{
    if (!is_array($item)) {
        return false;
    }
    foreach (['id', 'name', 'url'] as $key) {
        if (!isset($item[$key]) || !is_string($item[$key])) {
            return false;
        }
    }
    return preg_match('~^(https?://|/)[^\s"\'<>]*$~i', $item['url']) === 1;
}

/** Items saved before the approval workflow have no status; they count as published. */
function pn_valid_consignment_item(mixed $item): bool
{
    if (!is_array($item) || array_is_list($item) || count($item) > PN_CONSIGNMENT_MAX_KEYS) {
        return false;
    }
    if (!isset($item['id']) || !is_string($item['id']) || $item['id'] === '') {
        return false;
    }
    if (isset($item['status']) && !in_array($item['status'], PN_CONSIGNMENT_STATUSES, true)) {
        return false;
    }
    foreach (PN_CONSIGNMENT_TEXT_LIMITS as $key => $limit) {
        if (isset($item[$key]) && (!is_string($item[$key]) || mb_strlen($item[$key]) > $limit)) {
            return false;
        }
    }
    if (isset($item['section']) && !in_array($item['section'], PN_CONSIGNMENT_SECTIONS, true)) {
        return false;
    }
    if (isset($item['highlights']) && !pn_valid_string_list($item['highlights'], PN_CONSIGNMENT_MAX_HIGHLIGHTS, PN_CONSIGNMENT_MAX_HIGHLIGHT_LENGTH)) {
        return false;
    }
    foreach (PN_CONSIGNMENT_NUMBER_KEYS as $key) {
        if (isset($item[$key]) && !is_int($item[$key]) && !is_float($item[$key])) {
            return false;
        }
    }
    if (isset($item['featured']) && !is_bool($item['featured'])) {
        return false;
    }
    if (!pn_valid_seo_fields($item)) {
        return false;
    }
    if (isset($item['images'])) {
        if (!is_array($item['images']) || !array_is_list($item['images']) || count($item['images']) > PN_CONSIGNMENT_MAX_IMAGES) {
            return false;
        }
        foreach ($item['images'] as $image) {
            if (!is_string($image) || strlen($image) > 500) {
                return false;
            }
        }
    }
    return true;
}

function pn_valid_string_list(mixed $list, int $maxItems, int $maxLength): bool
{
    if (!is_array($list) || !array_is_list($list) || count($list) > $maxItems) {
        return false;
    }
    foreach ($list as $entry) {
        if (!is_string($entry) || mb_strlen($entry) > $maxLength) {
            return false;
        }
    }
    return true;
}

function pn_valid_seo_string(mixed $value, int $maxLength): bool
{
    return $value === null || (is_string($value) && mb_strlen($value) <= $maxLength);
}

function pn_valid_seo_image(mixed $value): bool
{
    return $value === null || $value === ''
        || (is_string($value) && strlen($value) <= PN_SEO_URL_MAX && preg_match(PN_SEO_IMAGE_PATTERN, $value) === 1);
}

function pn_is_object_array(mixed $value): bool
{
    return is_array($value) && ($value === [] || !array_is_list($value));
}

/** Optional per-item SEO object: bounded text, a short keyword list, a safe image URL and a noindex flag. */
function pn_valid_seo(mixed $seo): bool
{
    if ($seo === null) {
        return true;
    }
    if (!pn_is_object_array($seo) || array_diff(array_keys($seo), PN_SEO_ITEM_KEYS) !== []) {
        return false;
    }
    return pn_valid_seo_string($seo['title'] ?? null, PN_SEO_TITLE_MAX)
        && pn_valid_seo_string($seo['description'] ?? null, PN_SEO_DESCRIPTION_MAX)
        && (!isset($seo['keywords']) || pn_valid_string_list($seo['keywords'], PN_SEO_MAX_KEYWORDS, PN_SEO_KEYWORD_MAX))
        && pn_valid_seo_image($seo['ogImage'] ?? null)
        && (!isset($seo['noindex']) || is_bool($seo['noindex']));
}

/** slug (lowercase letters, digits, dashes) and seo of a project, property, news or consignment item. */
function pn_valid_seo_fields(array $item): bool
{
    if (isset($item['slug']) && (!is_string($item['slug']) || preg_match(PN_SEO_SLUG_PATTERN, $item['slug']) !== 1)) {
        return false;
    }
    return pn_valid_old_slugs($item) && pn_valid_seo($item['seo'] ?? null);
}

/** oldSlugs: at most 10 distinct valid slugs, none equal to the current slug. */
function pn_valid_old_slugs(array $item): bool
{
    if (!isset($item['oldSlugs'])) {
        return true;
    }
    $list = $item['oldSlugs'];
    if (!is_array($list) || !array_is_list($list) || count($list) > PN_SEO_MAX_OLD_SLUGS) {
        return false;
    }
    foreach ($list as $old) {
        if (!is_string($old) || preg_match(PN_SEO_OLD_SLUG_PATTERN, $old) !== 1 || $old === ($item['slug'] ?? null)) {
            return false;
        }
    }
    return count(array_unique($list)) === count($list);
}

function pn_valid_news_category(mixed $item): bool
{
    if (!pn_is_object_array($item) || $item === [] || array_diff(array_keys($item), PN_NEWS_CATEGORY_KEYS) !== []) {
        return false;
    }
    if (!is_string($item['id'] ?? null) || $item['id'] === '' || mb_strlen($item['id']) > PN_NEWS_CATEGORY_ID_MAX) {
        return false;
    }
    if (!is_string($item['slug'] ?? null) || preg_match(PN_NEWS_CATEGORY_SLUG_PATTERN, $item['slug']) !== 1) {
        return false;
    }
    if (!is_string($item['label'] ?? null) || trim($item['label']) === '' || mb_strlen($item['label']) > PN_NEWS_CATEGORY_LABEL_MAX) {
        return false;
    }
    if (isset($item['description']) && (!is_string($item['description']) || mb_strlen($item['description']) > PN_NEWS_CATEGORY_DESCRIPTION_MAX)) {
        return false;
    }
    if (!is_int($item['order'] ?? null)) {
        return false;
    }
    $seo = $item['seo'] ?? null;
    if ($seo === null) {
        return true;
    }
    return pn_is_object_array($seo) && array_diff(array_keys($seo), PN_NEWS_CATEGORY_SEO_KEYS) === []
        && pn_valid_seo_string($seo['title'] ?? null, PN_SEO_TITLE_MAX)
        && pn_valid_seo_string($seo['description'] ?? null, PN_SEO_DESCRIPTION_MAX);
}

/** news_categories: at most 40 entries with unique slugs. */
function pn_valid_news_categories(array $list): bool
{
    if (count($list) > PN_NEWS_CATEGORIES_MAX) {
        return false;
    }
    $slugs = [];
    foreach ($list as $item) {
        if (!pn_valid_news_category($item) || isset($slugs[$item['slug']])) {
            return false;
        }
        $slugs[$item['slug']] = true;
    }
    return true;
}

/** A news article may not use a reserved slug, now or as a redirecting old slug. */
function pn_valid_news_item(array $item): bool
{
    if (in_array($item['slug'] ?? null, PN_NEWS_RESERVED_SLUGS, true)) {
        return false;
    }
    foreach (is_array($item['oldSlugs'] ?? null) ? $item['oldSlugs'] : [] as $old) {
        if (in_array($old, PN_NEWS_RESERVED_SLUGS, true)) {
            return false;
        }
    }
    return true;
}

/**
 * Link of a menu entry: a site path ("/x", never "//x"), an https URL, mailto: or tel:.
 * Twin of classifyMenuUrl() in src/utils/menuConfig.ts (classifyFooterUrl plus "no backslash").
 */
function pn_valid_menu_link(mixed $url): bool
{
    if (!is_string($url) || $url === '' || strlen($url) > PN_MENU_URL_MAX || preg_match(PN_MENU_URL_FORBIDDEN, $url) !== 0) {
        return false;
    }
    return preg_match('~^/(?!/)~', $url) === 1
        || preg_match('~^https://[^/?#]+~i', $url) === 1
        || preg_match('~^mailto:[^\s@]+@[^\s@]+$~i', $url) === 1
        || preg_match('~^tel:\+?[0-9][0-9.\-()]*$~i', $url) === 1;
}

/** One menu entry: allowed keys only, label 1..40 chars, valid link, optional id, flags and icon. */
function pn_valid_menu_entry(mixed $entry, array $allowedKeys): bool
{
    if (!pn_is_object_array($entry) || $entry === [] || array_diff(array_keys($entry), $allowedKeys) !== []) {
        return false;
    }
    if (!is_string($entry['label'] ?? null) || trim($entry['label']) === '' || mb_strlen($entry['label']) > PN_MENU_LABEL_MAX) {
        return false;
    }
    if (!pn_valid_menu_link($entry['path'] ?? null)) {
        return false;
    }
    if (isset($entry['id']) && (!is_string($entry['id']) || preg_match(PN_MENU_ID_PATTERN, $entry['id']) !== 1)) {
        return false;
    }
    foreach (['exact', 'visible', 'newTab'] as $flag) {
        if (isset($entry[$flag]) && !is_bool($entry[$flag])) {
            return false;
        }
    }
    return !isset($entry['icon']) || (is_string($entry['icon']) && in_array($entry['icon'], PN_MENU_ICONS, true));
}

function pn_valid_menu_list(mixed $list, int $maxItems, array $keys, bool $withChildren): bool
{
    if (!is_array($list) || !array_is_list($list) || count($list) > $maxItems) {
        return false;
    }
    foreach ($list as $entry) {
        if (!pn_valid_menu_entry($entry, $keys)) {
            return false;
        }
        if ($withChildren && isset($entry['children']) && !pn_valid_menu_list($entry['children'], PN_MENU_MAX_CHILDREN, PN_MENU_CHILD_KEYS, false)) {
            return false;
        }
    }
    return true;
}

/**
 * menu.desktop (<= 10 entries, each with <= 12 children, one level) and menu.mobileBottomNav (<= 5 entries).
 * Legacy entries {label, path[, exact][, icon]} stay valid. menu.footer is not checked here.
 */
function pn_valid_menu(array $menu): bool
{
    if (array_key_exists('desktop', $menu) && !pn_valid_menu_list($menu['desktop'], PN_MENU_MAX_ITEMS, PN_MENU_DESKTOP_KEYS, true)) {
        return false;
    }
    return !array_key_exists('mobileBottomNav', $menu)
        || pn_valid_menu_list($menu['mobileBottomNav'], PN_MENU_MAX_BOTTOM_ITEMS, PN_MENU_BOTTOM_KEYS, false);
}

function pn_valid_google_html_file(mixed $file): bool
{
    return $file === null || (
        pn_is_object_array($file) && array_diff(array_keys($file), ['name', 'content']) === []
        && is_string($file['name'] ?? null) && preg_match(PN_SEO_HTML_FILE_NAME_PATTERN, $file['name']) === 1
        && is_string($file['content'] ?? null) && preg_match(PN_SEO_HTML_FILE_CONTENT_PATTERN, $file['content']) === 1
    );
}

/** company.seo: site-wide SEO settings. */
function pn_valid_company_seo(mixed $seo): bool
{
    if ($seo === null) {
        return true;
    }
    if (!pn_is_object_array($seo) || array_diff(array_keys($seo), PN_SEO_SITE_KEYS) !== []) {
        return false;
    }
    foreach (['googleSiteVerification', 'bingSiteVerification'] as $key) {
        $code = $seo[$key] ?? null;
        if ($code !== null && $code !== '' && (!is_string($code) || preg_match(PN_SEO_VERIFICATION_PATTERN, $code) !== 1)) {
            return false;
        }
    }
    return pn_valid_seo_string($seo['titleSuffix'] ?? null, PN_SEO_SUFFIX_MAX)
        && pn_valid_seo_string($seo['defaultDescription'] ?? null, PN_SEO_DESCRIPTION_MAX)
        && pn_valid_seo_image($seo['defaultOgImage'] ?? null)
        && pn_valid_google_html_file($seo['googleHtmlFile'] ?? null)
        && (!isset($seo['indexSite']) || is_bool($seo['indexSite']));
}

function pn_valid_consignments(array $list): bool
{
    if (count($list) > PN_CONSIGNMENT_MAX_ITEMS) {
        return false;
    }
    foreach ($list as $item) {
        if (!pn_valid_consignment_item($item)) {
            return false;
        }
    }
    return true;
}

/**
 * Public view of the consignments collection: drafts are dropped, and internal keys
 * (anything starting with "_" plus PN_CONSIGNMENT_PRIVATE_KEYS) are removed from every item.
 */
function pn_public_consignments_json(string $raw): string
{
    $list = json_decode($raw, true);
    if (!is_array($list) || !array_is_list($list)) {
        throw new RuntimeException('Collection is corrupted: list expected');
    }
    $visible = [];
    foreach ($list as $item) {
        if (!is_array($item) || !in_array($item['status'] ?? 'published', PN_CONSIGNMENT_PUBLIC_STATUSES, true)) {
            continue;
        }
        $visible[] = array_filter(
            $item,
            static fn($key): bool => !(is_string($key) && (str_starts_with($key, '_') || in_array($key, PN_CONSIGNMENT_PRIVATE_KEYS, true))),
            ARRAY_FILTER_USE_KEY
        );
    }
    $json = json_encode($visible, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        throw new RuntimeException('Cannot encode collection');
    }
    return $json;
}

function pn_validate_collection(string $name, mixed $data): bool
{
    $kind = pn_collection_kind($name);
    if (!is_array($data)) {
        return false;
    }
    if ($kind === 'object') {
        if ($data === [] || array_is_list($data)) {
            return false;
        }
        if ($name === 'menu') {
            return pn_valid_menu($data);
        }
        return $name !== 'company' || pn_valid_company_seo($data['seo'] ?? null);
    }
    if (!array_is_list($data)) {
        return false;
    }
    foreach ($data as $item) {
        if (!is_array($item)) {
            return false;
        }
    }
    if ($name === 'media') {
        foreach ($data as $item) {
            if (!pn_valid_media_item($item)) {
                return false;
            }
        }
    }
    if ($name === 'consignments') {
        return pn_valid_consignments($data);
    }
    if ($name === 'news_categories') {
        return pn_valid_news_categories($data);
    }
    if (in_array($name, ['projects', 'properties', 'news'], true)) {
        foreach ($data as $item) {
            if (!pn_valid_seo_fields($item) || ($name === 'news' && !pn_valid_news_item($item))) {
                return false;
            }
        }
    }
    return true;
}

function pn_append_to_list(string $name, array $record, int $maxItems, bool $backup): void
{
    pn_mutate_collection($name, static function (string $current) use ($record, $maxItems): array {
        $list = json_decode($current, true);
        if (!is_array($list) || !array_is_list($list)) {
            throw new RuntimeException('Collection is corrupted: list expected');
        }
        array_unshift($list, $record);
        $list = array_slice($list, 0, $maxItems);
        $json = json_encode($list, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        if ($json === false) {
            throw new RuntimeException('Cannot encode collection');
        }
        return [$json . "\n", null];
    }, $backup);
}
