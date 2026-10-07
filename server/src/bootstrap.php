<?php
declare(strict_types=1);

const PN_MAX_JSON_BYTES = 2097152;
const PN_MAX_UPLOAD_BYTES = 5242880;
const PN_SESSION_LIFETIME = 28800;
const PN_SESSION_COOKIE = 'pn_sid';

function pn_config(): array
{
    static $cfg = null;
    if ($cfg !== null) {
        return $cfg;
    }
    $file = __DIR__ . '/../config.php';
    $loaded = is_file($file) ? require $file : null;
    if (!is_array($loaded)) {
        throw new RuntimeException('server/config.php is missing or invalid');
    }
    $dataDir = rtrim((string) ($loaded['data_dir'] ?? dirname(__DIR__, 2) . '/data'), '/\\');
    $scriptDir = dirname((string) ($_SERVER['SCRIPT_FILENAME'] ?? __FILE__));
    $cfg = [
        'telegram_bot_token' => (string) ($loaded['telegram_bot_token'] ?? ''),
        'telegram_admin_chat_id' => (string) ($loaded['telegram_admin_chat_id'] ?? ''),
        'telegram_api_base' => rtrim((string) ($loaded['telegram_api_base'] ?? 'https://api.telegram.org'), '/'),
        'admin_phone' => (string) ($loaded['admin_phone'] ?? ''),
        'data_dir' => $dataDir,
        'session_dir' => rtrim((string) ($loaded['session_dir'] ?? $dataDir . '/sessions'), '/\\'),
        'uploads_dir' => rtrim((string) ($loaded['uploads_dir'] ?? dirname($scriptDir) . '/uploads'), '/\\'),
        'uploads_url' => '/' . trim((string) ($loaded['uploads_url'] ?? '/uploads/'), '/') . '/',
        'cookie_secure' => (bool) ($loaded['cookie_secure'] ?? true),
    ];
    return $cfg;
}

function pn_send(int $status, array $payload, bool $noStore = true): never
{
    pn_send_raw($status, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE), $noStore);
}

function pn_send_raw(int $status, string $json, bool $noStore): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: no-referrer');
    header('X-Frame-Options: DENY');
    header($noStore ? 'Cache-Control: no-store' : 'Cache-Control: no-cache');
    echo $json;
    exit;
}

function pn_fail(int $status, string $message): never
{
    pn_send($status, ['error' => $message]);
}

function pn_method(): string
{
    return strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
}

function pn_require_method(array $allowed): void
{
    if (!in_array(pn_method(), $allowed, true)) {
        header('Allow: ' . implode(', ', $allowed));
        pn_fail(405, 'Method not allowed');
    }
}

function pn_client_ip(): string
{
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
    return filter_var($ip, FILTER_VALIDATE_IP) !== false ? $ip : '0.0.0.0';
}

function pn_ensure_dir(string $dir, int $mode = 0750): void
{
    if (!is_dir($dir) && !mkdir($dir, $mode, true) && !is_dir($dir)) {
        throw new RuntimeException('Cannot create directory: ' . $dir);
    }
}

function pn_check_origin(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '' || $origin === 'null') {
        return;
    }
    $parts = parse_url((string) $origin);
    if ($parts === false || !isset($parts['host'])) {
        pn_fail(403, 'Forbidden origin');
    }
    $originHost = strtolower($parts['host'] . (isset($parts['port']) ? ':' . $parts['port'] : ''));
    $host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
    if ($originHost !== $host) {
        pn_fail(403, 'Forbidden origin');
    }
}

function pn_read_json_body(int $maxBytes = PN_MAX_JSON_BYTES): array
{
    $declared = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($declared > $maxBytes) {
        pn_fail(413, 'Payload too large');
    }
    $raw = (string) file_get_contents('php://input', false, null, 0, $maxBytes + 1);
    if (strlen($raw) > $maxBytes) {
        pn_fail(413, 'Payload too large');
    }
    return ['raw' => trim($raw), 'data' => pn_decode_json($raw)];
}

function pn_decode_json(string $raw): mixed
{
    try {
        return json_decode($raw, true, 64, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        pn_fail(400, 'Invalid JSON body');
    }
}

function pn_read_json_object(int $maxBytes = 65536): array
{
    $body = pn_read_json_body($maxBytes);
    $data = $body['data'];
    if (!is_array($data) || ($data !== [] && array_is_list($data))) {
        pn_fail(400, 'JSON object expected');
    }
    return $data;
}

function pn_read_json_file(string $path): ?array
{
    $raw = @file_get_contents($path);
    if ($raw === false) {
        return null;
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : null;
}

function pn_with_lock(string $path, callable $fn): mixed
{
    pn_ensure_dir(dirname($path));
    $lock = fopen($path . '.lock', 'c');
    if ($lock === false) {
        throw new RuntimeException('Cannot open lock file');
    }
    try {
        if (!flock($lock, LOCK_EX)) {
            throw new RuntimeException('Cannot acquire lock');
        }
        return $fn();
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

function pn_atomic_write(string $path, string $contents): void
{
    $tmp = $path . '.' . bin2hex(random_bytes(6)) . '.tmp';
    if (file_put_contents($tmp, $contents) === false) {
        throw new RuntimeException('Cannot write temp file');
    }
    chmod($tmp, 0640);
    if (!rename($tmp, $path)) {
        @unlink($tmp);
        throw new RuntimeException('Cannot replace file');
    }
}

function pn_normalize_phone(string $phone): string
{
    $digits = preg_replace('/[^0-9+]/', '', $phone) ?? '';
    if (str_starts_with($digits, '+84')) {
        return '0' . substr($digits, 3);
    }
    if (str_starts_with($digits, '84') && strlen($digits) === 11) {
        return '0' . substr($digits, 2);
    }
    return $digits;
}

function pn_rate_ok(string $bucket, string $id, int $max, int $windowSeconds): bool
{
    $dir = pn_config()['data_dir'] . '/ratelimit';
    pn_ensure_dir($dir);
    if (random_int(1, 100) === 1) {
        pn_prune_dir($dir, 86400);
    }
    $path = $dir . '/' . $bucket . '-' . hash('sha256', $id) . '.json';
    return (bool) pn_with_lock($path, function () use ($path, $max, $windowSeconds): bool {
        $cutoff = time() - $windowSeconds;
        $hits = array_values(array_filter(
            pn_read_json_file($path) ?? [],
            static fn($t): bool => is_int($t) && $t > $cutoff
        ));
        if (count($hits) >= $max) {
            return false;
        }
        $hits[] = time();
        pn_atomic_write($path, json_encode($hits));
        return true;
    });
}

function pn_prune_dir(string $dir, int $maxAgeSeconds): void
{
    $cutoff = time() - $maxAgeSeconds;
    foreach (glob($dir . '/*') ?: [] as $file) {
        if (is_file($file) && filemtime($file) < $cutoff) {
            @unlink($file);
        }
    }
}
