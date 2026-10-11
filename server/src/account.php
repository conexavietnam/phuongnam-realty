<?php
declare(strict_types=1);

// Admin account store (email + password hash + optional TOTP), password policy, login throttling
// and security alerts. HTTP handlers live in account_handlers.php.

const PN_ARGON_OPTIONS = ['memory_cost' => 65536, 'time_cost' => 3, 'threads' => 1];
const PN_BCRYPT_COST = 12;
const PN_RECOVERY_CODE_COUNT = 10;
const PN_TOTP_PENDING_SECONDS = 900;
const PN_LOGIN_GENERIC_ERROR = 'Email hoặc mật khẩu không đúng';
const PN_LOGIN_LOCKED_ERROR = 'Quá nhiều lần thử. Vui lòng thử lại sau.';

/** Very common passwords of 12+ characters (shorter ones already fail the length rule). */
const PN_COMMON_PASSWORDS = [
    '123456789012', '1234567890123', '12345678901234', '123456789012345', '1234567890123456', '111111111111',
    '000000000000', '012345678901', '098765432109', '987654321098', '112233445566', '123123123123',
    '123456123456', '147258369147', '147258369000', '159753159753', '789456123789', '123456789abc',
    '1q2w3e4r5t6y', '1q2w3e4r5t6y7u', '1qaz2wsx3edc', '1qaz2wsx3edc4rfv', 'qwertyuiop12', 'qwertyuiopas',
    'qwertyuiopasdf', 'qwertyuiopasdfghjkl', 'qwertyuiop123', 'qwertyuiop1234', 'qwerty123456', 'qwerty1234567',
    'asdfghjkl123', 'asdfghjkl1234', 'asdfghjklqwer', 'zxcvbnm12345', 'zxcvbnm123456', 'abcdefghijkl',
    'abcdefghijklm', 'abcdefghijklmn', 'abcd12345678', 'abcdefg12345', 'abc123456789', 'qazwsxedcrfv',
    'qazwsxedc123', 'zaq12wsxcde3', '1234qwer1234', 'qwer1234qwer', '12345678abcd', 'a1b2c3d4e5f6',
    '1a2b3c4d5e6f', '0123456789ab', '0123456789012', '9876543210123', 'password1234', 'password12345',
    'password123456', 'password1234567', 'passw0rd1234', 'p@ssw0rd1234', 'p@ssword1234', 'p@ssw0rd12345',
    'iloveyou1234', 'iloveyou12345', 'iloveyou123456', 'letmein12345', 'letmein123456', 'welcome12345',
    'welcome123456', 'administrator', 'administrator1', 'administrator123', 'admin12345678', 'admin123456789',
    'admin@123456', 'adminadmin12', 'adminadmin123', 'changeme1234', 'changeme12345', 'changemenow1',
    'trustno1trust', 'superman1234', 'football1234', 'baseball1234', 'monkey123456', 'dragon123456',
    'master123456', 'shadow123456', 'sunshine1234', 'princess1234', 'whatever1234', 'michael123456',
    'charlie12345', 'jordan123456', 'hunter123456', 'freedom12345', 'computer1234', 'internet1234',
    'starwars1234', 'matkhau123456', 'matkhau1234567', 'matkhau12345', 'matkhaumoi123', 'matkhaucuatoi',
    'matkhaumatkhau', 'matkhau@12345', 'taikhoan1234', 'taikhoan12345', 'quantri12345', 'quantri123456',
    'quantriviencms', 'quantrivien123', 'admin@phuongnam', 'phuongnam1234', 'phuongnam12345', 'phuongnam123456',
    'phuongnam@123', 'phuongnamrealty', 'phuongnamrealty1', 'phuongnamrealty123', 'phuongnam2024', 'phuongnam2025',
    'phuongnam2026', 'phuongnamadmin', 'phuongnam@2025', 'phuongnam@2026', 'phuongnamrealty@123', 'realty123456',
    'batdongsan123', 'batdongsan1234', 'nhadat123456', 'saigon123456', 'hochiminh1234', 'vietnam123456',
    'vietnam@12345', 'xinchao123456', 'yeuem123456', 'anhyeuem1234', 'emyeuanh1234', 'toiyeuvietnam',
    'vietnamvodich', 'conmeo123456', 'chucmungnamnoi',
];

/** Letters-only bases: a password that is one of these plus digits/symbols is rejected. */
const PN_COMMON_BASES = [
    'password', 'passw', 'passwd', 'pass', 'matkhau', 'matkhaumoi', 'mk', 'admin', 'administrator', 'quantri',
    'quantrivien', 'taikhoan', 'phuongnam', 'phuongnamrealty', 'realty', 'batdongsan', 'nhadat', 'saigon',
    'hochiminh', 'hanoi', 'vietnam', 'xinchao', 'iloveyou', 'yeuem', 'anhyeuem', 'emyeuanh', 'loveyou',
    'letmein', 'welcome', 'qwerty', 'qwertyuiop', 'asdfgh', 'asdfghjkl', 'zxcvbn', 'zxcvbnm', 'abc',
    'abcdef', 'abcdefgh', 'abcxyz', 'secret', 'changeme', 'default', 'login', 'master', 'monkey', 'dragon',
    'shadow', 'sunshine', 'princess', 'football', 'baseball', 'superman', 'batman', 'trustno', 'hello',
    'freedom', 'whatever', 'michael', 'jordan', 'hunter', 'charlie', 'computer', 'internet', 'starwars',
    'google', 'facebook', 'zalo', 'test', 'testing', 'guest', 'user', 'root', 'toor', 'system', 'server',
    'unknown', 'demo', 'windows', 'linux', 'killer', 'soccer', 'hockey', 'ranger', 'buster', 'thomas',
    'tigger', 'robert', 'jennifer', 'jessica', 'daniel', 'andrew', 'joshua', 'matthew', 'cms', 'website',
    'conmeo', 'toiyeu', 'yeu', 'anhyeu', 'chucmung', 'nhapmatkhau',
];

// ---------------------------------------------------------------------------------------------
// Account file
// ---------------------------------------------------------------------------------------------

function pn_account_path(): string
{
    return pn_config()['data_dir'] . '/admin_account.json';
}

/** 'password' once admin_account.json exists (even if damaged: fail closed), otherwise 'bootstrap'. */
function pn_auth_mode(): string
{
    return is_file(pn_account_path()) ? 'password' : 'bootstrap';
}

/** The normalized account, or null when absent or damaged. */
function pn_account_load(): ?array
{
    $acct = pn_read_json_file(pn_account_path());
    if ($acct === null
        || !is_string($acct['email'] ?? null)
        || !is_string($acct['password_hash'] ?? null)
        || $acct['password_hash'] === ''
        || !is_int($acct['session_epoch'] ?? null)) {
        return null;
    }
    $totp = is_array($acct['totp'] ?? null) ? $acct['totp'] : [];
    $hashes = is_array($totp['recovery_hashes'] ?? null) ? $totp['recovery_hashes'] : [];
    $acct['totp'] = [
        'enabled' => ($totp['enabled'] ?? false) === true,
        'secret_enc' => is_string($totp['secret_enc'] ?? null) ? $totp['secret_enc'] : '',
        'pending_enc' => is_string($totp['pending_enc'] ?? null) ? $totp['pending_enc'] : '',
        'pending_at' => (int) ($totp['pending_at'] ?? 0),
        'last_step' => (int) ($totp['last_step'] ?? 0),
        'recovery_hashes' => array_values(array_filter($hashes, 'is_string')),
    ];
    return $acct;
}

/**
 * Read-modify-write under an exclusive lock. $fn receives the current account (null if none) and
 * returns ['account' => array|null (null = write nothing), 'result' => mixed].
 * $backup keeps a copy of the previous file (credential changes only, not on every login).
 */
function pn_account_mutate(callable $fn, bool $backup = false): mixed
{
    $path = pn_account_path();
    return pn_with_lock($path, static function () use ($fn, $backup, $path): mixed {
        $out = $fn(pn_account_load());
        if ($out['account'] !== null) {
            if ($backup && is_file($path)) {
                pn_backup_collection('admin_account', $path);
            }
            pn_atomic_write($path, json_encode($out['account'], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n");
        }
        return $out['result'];
    });
}

function pn_new_epoch(int $previous = 0): int
{
    do {
        $epoch = random_int(1, 2147483647);
    } while ($epoch === $previous);
    return $epoch;
}

function pn_empty_totp(): array
{
    return [
        'enabled' => false,
        'secret_enc' => '',
        'pending_enc' => '',
        'pending_at' => 0,
        'last_step' => 0,
        'recovery_hashes' => [],
    ];
}

function pn_new_account(string $email, string $passwordHash): array
{
    return [
        'email' => $email,
        'password_hash' => $passwordHash,
        'password_changed_at' => time(),
        'session_epoch' => pn_new_epoch(),
        'created_at' => time(),
        'totp' => pn_empty_totp(),
        'last_login_at' => null,
        'last_login_ip' => '',
        'prev_login_at' => null,
        'prev_login_ip' => '',
    ];
}

// ---------------------------------------------------------------------------------------------
// Email, password hashing and policy
// ---------------------------------------------------------------------------------------------

function pn_normalize_email(string $email): string
{
    return strtolower(trim($email));
}

function pn_email_valid(string $email): bool
{
    return $email !== '' && strlen($email) <= 120 && filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

function pn_mask_email(string $email): string
{
    $at = strrpos($email, '@');
    if ($at === false || $at < 1) {
        return '***';
    }
    return substr($email, 0, 1) . '***' . substr($email, $at);
}

function pn_mask_ip(string $ip): string
{
    if (str_contains($ip, ':')) {
        return implode(':', array_slice(explode(':', $ip), 0, 2)) . ':*';
    }
    $parts = explode('.', $ip);
    return count($parts) === 4 ? $parts[0] . '.' . $parts[1] . '.*.*' : '*';
}

function pn_argon_available(): bool
{
    return defined('PASSWORD_ARGON2ID') && in_array(PASSWORD_ARGON2ID, password_algos(), true);
}

/** bcrypt truncates at 72 bytes and chokes on NUL: feed it a fixed-length digest instead. */
function pn_bcrypt_input(string $password): string
{
    return base64_encode(hash('sha256', $password, true));
}

function pn_password_hash(string $password): string
{
    $hash = pn_argon_available()
        ? password_hash($password, PASSWORD_ARGON2ID, PN_ARGON_OPTIONS)
        : password_hash(pn_bcrypt_input($password), PASSWORD_BCRYPT, ['cost' => PN_BCRYPT_COST]);
    if (!is_string($hash) || $hash === '') {
        throw new RuntimeException('Cannot hash password');
    }
    return $hash;
}

function pn_password_check(string $password, string $hash): bool
{
    $algo = password_get_info($hash)['algoName'] ?? 'unknown';
    return password_verify($algo === 'bcrypt' ? pn_bcrypt_input($password) : $password, $hash);
}

function pn_password_needs_rehash(string $hash): bool
{
    return pn_argon_available()
        ? password_needs_rehash($hash, PASSWORD_ARGON2ID, PN_ARGON_OPTIONS)
        : password_needs_rehash($hash, PASSWORD_BCRYPT, ['cost' => PN_BCRYPT_COST]);
}

/**
 * Hash that is verified for unknown emails so both paths cost the same. It is created once and kept
 * in data/auth/dummy.hash (it protects nothing: it hashes a random value nobody knows).
 */
function pn_dummy_hash(): string
{
    static $cached = null;
    if ($cached !== null) {
        return $cached;
    }
    $path = pn_config()['data_dir'] . '/auth/dummy.hash';
    $usable = static function () use ($path): ?string {
        $hash = trim((string) @file_get_contents($path));
        return $hash !== '' && password_get_info($hash)['algo'] !== null && !pn_password_needs_rehash($hash) ? $hash : null;
    };
    $cached = $usable() ?? pn_with_lock($path, static function () use ($path, $usable): string {
        $existing = $usable();
        if ($existing !== null) {
            return $existing;
        }
        $hash = pn_password_hash(bin2hex(random_bytes(24)));
        pn_atomic_write($path, $hash . "\n");
        return $hash;
    });
    return $cached;
}

/** Vietnamese reason why $password is not acceptable, or null when it passes. */
function pn_password_policy_error(string $password, string $email): ?string
{
    if (!mb_check_encoding($password, 'UTF-8') || preg_match('/[\x00-\x1f\x7f]/', $password) === 1) {
        return 'Mật khẩu chứa ký tự không hợp lệ.';
    }
    $length = mb_strlen($password);
    if ($length < 12 || $length > 128) {
        return 'Mật khẩu phải dài từ 12 đến 128 ký tự.';
    }
    if (preg_match('/^[0-9]+$/', $password) === 1) {
        return 'Mật khẩu không được chỉ gồm chữ số.';
    }
    if (preg_match('/^(.)\1*$/su', $password) === 1) {
        return 'Mật khẩu không được lặp một ký tự.';
    }
    $lower = mb_strtolower($password);
    $local = strstr($email, '@', true);
    $local = $local === false ? $email : $local;
    if ($lower === strtolower($email) || (strlen($local) >= 3 && str_contains($lower, strtolower($local)))) {
        return 'Mật khẩu không được trùng hoặc chứa phần tên của email.';
    }
    $letters = preg_replace('/[^a-z]+/', '', $lower) ?? '';
    if (in_array($lower, PN_COMMON_PASSWORDS, true) || in_array($letters, PN_COMMON_BASES, true)) {
        return 'Mật khẩu quá phổ biến, dễ bị đoán. Hãy chọn mật khẩu khác.';
    }
    return null;
}

/** Re-confirmation of the current password for sensitive actions (global limit: single admin). */
function pn_require_current_password(array $account, mixed $password): void
{
    if (pn_rate_check('reauth', 'global', 8, 900) > 0) {
        pn_fail(429, 'Quá nhiều lần xác nhận mật khẩu. Vui lòng thử lại sau ít phút.');
    }
    if (!is_string($password) || $password === '' || strlen($password) > 512
        || !pn_password_check($password, (string) $account['password_hash'])) {
        pn_fail(403, 'Mật khẩu hiện tại không đúng');
    }
}

// ---------------------------------------------------------------------------------------------
// TOTP secrets at rest, recovery codes
// ---------------------------------------------------------------------------------------------

/** 32-byte key from config.php 'auth_key' (base64), or null when missing/invalid. */
function pn_auth_key(): ?string
{
    $raw = pn_config()['auth_key'];
    if ($raw === '' || !function_exists('sodium_crypto_secretbox')) {
        return null;
    }
    $key = base64_decode($raw, true);
    return $key !== false && strlen($key) === SODIUM_CRYPTO_SECRETBOX_KEYBYTES ? $key : null;
}

function pn_secret_encrypt(string $plain, string $key): string
{
    $nonce = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
    return base64_encode($nonce . sodium_crypto_secretbox($plain, $nonce, $key));
}

function pn_secret_decrypt(string $blob): ?string
{
    $key = pn_auth_key();
    $raw = base64_decode($blob, true);
    if ($key === null || $raw === false || strlen($raw) <= SODIUM_CRYPTO_SECRETBOX_NONCEBYTES) {
        return null;
    }
    $plain = sodium_crypto_secretbox_open(
        substr($raw, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES),
        substr($raw, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES),
        $key
    );
    return $plain === false ? null : $plain;
}

/** @return list<string> plain recovery codes like ABCDE-FGHIJ (shown once, stored only hashed) */
function pn_recovery_codes_generate(): array
{
    $codes = [];
    for ($i = 0; $i < PN_RECOVERY_CODE_COUNT; $i++) {
        $raw = '';
        for ($j = 0; $j < 10; $j++) {
            $raw .= PN_BASE32_ALPHABET[random_int(0, 31)];
        }
        $codes[] = substr($raw, 0, 5) . '-' . substr($raw, 5);
    }
    return $codes;
}

function pn_recovery_code_normalize(string $code): ?string
{
    $norm = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $code) ?? '');
    return preg_match('/^[A-Z2-7]{10}$/', $norm) === 1 ? $norm : null;
}

function pn_recovery_code_hash(string $code): string
{
    $hash = password_hash((string) pn_recovery_code_normalize($code), PASSWORD_BCRYPT, ['cost' => 10]);
    if (!is_string($hash)) {
        throw new RuntimeException('Cannot hash recovery code');
    }
    return $hash;
}

/**
 * Checks a TOTP code or a recovery code and, on success, records the use in $account (last_step or
 * the consumed recovery hash). The caller must persist $account. Returns 'totp', 'recovery' or null.
 */
function pn_second_factor_consume(array &$account, string $code): ?string
{
    if (preg_match('/^[0-9]{6}$/', $code) === 1) {
        $secret = pn_secret_decrypt($account['totp']['secret_enc']);
        $step = $secret === null ? null : pn_totp_verify($secret, $code, $account['totp']['last_step']);
        if ($step === null) {
            return null;
        }
        $account['totp']['last_step'] = $step;
        return 'totp';
    }
    $norm = pn_recovery_code_normalize($code);
    if ($norm === null) {
        return null;
    }
    foreach ($account['totp']['recovery_hashes'] as $index => $hash) {
        if (password_verify($norm, $hash)) {
            unset($account['totp']['recovery_hashes'][$index]);
            $account['totp']['recovery_hashes'] = array_values($account['totp']['recovery_hashes']);
            return 'recovery';
        }
    }
    return null;
}

// ---------------------------------------------------------------------------------------------
// Login throttling (per IP, global, per account key) and alerts
// ---------------------------------------------------------------------------------------------

/** Seconds to wait before another login attempt, 0 when allowed. Every call counts as an attempt. */
function pn_login_throttle(string $ip, string $accountKey): int
{
    $wait = pn_rate_check('login_ip', $ip, 10, 900);
    if ($wait === 0) {
        $wait = pn_rate_check('login_all', 'global', 120, 600);
    }
    return $wait > 0 ? $wait : pn_login_lock_remaining($accountKey);
}

function pn_login_lock_path(string $accountKey): string
{
    return pn_config()['data_dir'] . '/auth_locks/' . $accountKey . '.json';
}

function pn_login_lock_remaining(string $accountKey): int
{
    $record = pn_read_json_file(pn_login_lock_path($accountKey)) ?? [];
    return max(0, (int) ($record['locked_until'] ?? 0) - time());
}

/** Counts a failure for this key (known or not) and returns ['failures' => int, 'lock' => seconds]. */
function pn_login_record_failure(string $accountKey): array
{
    $path = pn_login_lock_path($accountKey);
    pn_ensure_dir(dirname($path));
    if (random_int(1, 100) === 1) {
        pn_prune_dir(dirname($path), 86400);
    }
    return pn_with_lock($path, static function () use ($path): array {
        $record = pn_read_json_file($path) ?? [];
        if (time() - (int) ($record['last'] ?? 0) > 86400) {
            $record = [];
        }
        $failures = (int) ($record['failures'] ?? 0) + 1;
        $lock = $failures >= 10 ? 1800 : ($failures >= 8 ? 300 : ($failures >= 5 ? 60 : 0));
        pn_atomic_write($path, json_encode([
            'failures' => $failures,
            'locked_until' => $lock > 0 ? time() + $lock : 0,
            'last' => time(),
        ]));
        return ['failures' => $failures, 'lock' => $lock];
    });
}

function pn_login_clear_failures(string $accountKey): void
{
    $path = pn_login_lock_path($accountKey);
    if (!is_file($path)) {
        return;
    }
    pn_with_lock($path, static function () use ($path): void {
        @unlink($path);
    });
}

function pn_login_too_many(int $seconds): never
{
    header('Retry-After: ' . max(1, $seconds));
    pn_fail(429, PN_LOGIN_LOCKED_ERROR);
}

function pn_login_failed(string $ip, string $accountKey): never
{
    $record = pn_login_record_failure($accountKey);
    if ($record['lock'] > 0 && pn_rate_ok('auth_alert', 'global', 3, 600)) {
        pn_security_alert('Đăng nhập sai nhiều lần, tài khoản bị khóa tạm thời', [
            'Số lần sai liên tiếp' => (string) $record['failures'],
            'Khóa trong' => (string) $record['lock'] . ' giây',
            'IP' => $ip,
            'Trình duyệt' => pn_short_user_agent(),
        ]);
    }
    pn_fail(401, PN_LOGIN_GENERIC_ERROR);
}

function pn_short_user_agent(): string
{
    $agent = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
    return mb_substr(preg_replace('/[\x00-\x1f\x7f]+/', ' ', $agent) ?? '', 0, 80);
}

function pn_login_alert_fields(string $ip): array
{
    return ['IP' => $ip, 'Trình duyệt' => pn_short_user_agent()];
}

/** Best-effort Telegram notice. All fields are HTML-escaped; failures never reach the caller. */
function pn_security_alert(string $title, array $fields = []): void
{
    try {
        $escape = static fn(string $value): string => htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $time = (new DateTimeImmutable('now', new DateTimeZone('Asia/Ho_Chi_Minh')))->format('d/m/Y H:i:s') . ' (GMT+7)';
        $lines = ['🔔 <b>[PHƯƠNG NAM REALTY] ' . $escape($title) . '</b>', ''];
        foreach (['Thời gian' => $time] + $fields as $label => $value) {
            $clean = preg_replace('/[\x00-\x1f\x7f]+/u', ' ', (string) $value) ?? '';
            $lines[] = $escape((string) $label) . ': ' . $escape(mb_substr($clean, 0, 120));
        }
        pn_telegram_send(implode("\n", $lines));
    } catch (Throwable $e) {
        error_log('security alert failed: ' . get_class($e));
    }
}
