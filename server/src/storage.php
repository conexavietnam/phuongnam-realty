<?php
declare(strict_types=1);

const PN_PUBLIC_COLLECTIONS = [
    'properties' => 'list',
    'projects' => 'list',
    'news' => 'list',
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

function pn_validate_collection(string $name, mixed $data): bool
{
    $kind = pn_collection_kind($name);
    if (!is_array($data)) {
        return false;
    }
    if ($kind === 'object') {
        return $data !== [] && !array_is_list($data);
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
