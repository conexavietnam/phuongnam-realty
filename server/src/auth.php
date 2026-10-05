<?php
declare(strict_types=1);

const PN_OTP_TTL_SECONDS = 180;
const PN_OTP_MAX_ATTEMPTS = 5;

function pn_telegram_send(string $htmlText): bool
{
    $cfg = pn_config();
    $token = $cfg['telegram_bot_token'];
    $chatId = $cfg['telegram_admin_chat_id'];
    if (preg_match('/^[0-9]+:[A-Za-z0-9_-]+$/', $token) !== 1 || $chatId === '') {
        error_log('telegram: bot token or admin chat id is not configured');
        return false;
    }
    $ch = curl_init($cfg['telegram_api_base'] . '/bot' . $token . '/sendMessage');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode([
            'chat_id' => $chatId,
            'text' => $htmlText,
            'parse_mode' => 'HTML',
            'disable_web_page_preview' => true,
        ], JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 8,
    ]);
    $response = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $curlError = curl_error($ch);
    $decoded = is_string($response) ? json_decode($response, true) : null;
    if ($status !== 200 || !is_array($decoded) || ($decoded['ok'] ?? false) !== true) {
        error_log('telegram: send failed, http=' . $status . ' curl="' . $curlError . '"');
        return false;
    }
    return true;
}

function pn_session_start(bool $create): bool
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return true;
    }
    if (!$create && !isset($_COOKIE[PN_SESSION_COOKIE])) {
        return false;
    }
    $cfg = pn_config();
    pn_ensure_dir($cfg['session_dir']);
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.use_trans_sid', '0');
    ini_set('session.gc_maxlifetime', (string) PN_SESSION_LIFETIME);
    ini_set('session.gc_probability', '1');
    ini_set('session.gc_divisor', '100');
    session_save_path($cfg['session_dir']);
    session_name(PN_SESSION_COOKIE);
    session_set_cookie_params([
        'lifetime' => PN_SESSION_LIFETIME,
        'path' => '/api/',
        'secure' => $cfg['cookie_secure'],
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    return session_start();
}

function pn_is_admin(): bool
{
    if (!pn_session_start(false)) {
        return false;
    }
    return ($_SESSION['admin'] ?? false) === true
        && time() - (int) ($_SESSION['login_at'] ?? 0) < PN_SESSION_LIFETIME;
}

function pn_require_admin(): void
{
    if (!pn_is_admin()) {
        pn_fail(401, 'Authentication required');
    }
}

function pn_require_csrf(): void
{
    $sent = (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    $expected = (string) ($_SESSION['csrf'] ?? '');
    if ($expected === '' || !hash_equals($expected, $sent)) {
        pn_fail(403, 'Invalid CSRF token');
    }
}

function pn_otp_path(): string
{
    return pn_config()['data_dir'] . '/auth/otp.json';
}

function pn_otp_clear(): void
{
    $path = pn_otp_path();
    pn_with_lock($path, static function () use ($path): void {
        @unlink($path);
    });
}

function pn_otp_issue(string $otp): void
{
    $path = pn_otp_path();
    $record = [
        'hash' => password_hash($otp, PASSWORD_DEFAULT),
        'expires' => time() + PN_OTP_TTL_SECONDS,
        'attempts' => 0,
    ];
    pn_with_lock($path, static function () use ($path, $record): void {
        pn_atomic_write($path, json_encode($record));
    });
}

/** Returns one of: ok, invalid, locked, expired. */
function pn_otp_verify(string $code): string
{
    $path = pn_otp_path();
    return (string) pn_with_lock($path, static function () use ($path, $code): string {
        $record = pn_read_json_file($path);
        if ($record === null || !isset($record['hash'], $record['expires'], $record['attempts'])) {
            return 'expired';
        }
        if ((int) $record['expires'] < time()) {
            @unlink($path);
            return 'expired';
        }
        if ((int) $record['attempts'] >= PN_OTP_MAX_ATTEMPTS) {
            return 'locked';
        }
        if (password_verify($code, (string) $record['hash'])) {
            @unlink($path);
            return 'ok';
        }
        $record['attempts'] = (int) $record['attempts'] + 1;
        pn_atomic_write($path, json_encode($record));
        return 'invalid';
    });
}

function pn_handle_otp_send(): never
{
    pn_require_method(['POST']);
    pn_check_origin();
    if (!pn_rate_ok('otp_send', pn_client_ip(), 3, 600) || !pn_rate_ok('otp_send_all', 'global', 10, 600)) {
        pn_fail(429, 'Bạn yêu cầu mã quá nhiều lần. Vui lòng thử lại sau ít phút.');
    }
    $body = pn_read_json_object();
    $phone = pn_normalize_phone((string) ($body['phone'] ?? ''));
    $adminPhone = pn_normalize_phone(pn_config()['admin_phone']);
    if ($adminPhone === '' || !hash_equals($adminPhone, $phone)) {
        pn_fail(403, 'Số điện thoại không hợp lệ.');
    }
    $otp = sprintf('%06d', random_int(0, 999999));
    pn_otp_issue($otp);
    $text = "🔐 <b>[PHƯƠNG NAM REALTY] MÃ XÁC THỰC OTP</b>\n\nĐăng nhập trang Quản Trị (CMS).\nMã OTP: <code>" . $otp . "</code>\n\n"
        . '⏳ <i>Mã có hiệu lực 3 phút. Không chia sẻ mã này cho bất kỳ ai.</i>';
    if (!pn_telegram_send($text)) {
        pn_otp_clear();
        pn_fail(502, 'Không gửi được mã OTP qua Telegram. Vui lòng thử lại sau.');
    }
    pn_send(200, ['ok' => true, 'expiresIn' => PN_OTP_TTL_SECONDS]);
}

function pn_handle_otp_verify(): never
{
    pn_require_method(['POST']);
    pn_check_origin();
    if (!pn_rate_ok('otp_verify', pn_client_ip(), 30, 600)) {
        pn_fail(429, 'Quá nhiều lần thử. Vui lòng thử lại sau.');
    }
    $body = pn_read_json_object();
    $code = (string) ($body['otp'] ?? '');
    if (preg_match('/^[0-9]{6}$/', $code) !== 1) {
        pn_fail(400, 'Mã OTP gồm 6 chữ số.');
    }
    $result = pn_otp_verify($code);
    if ($result === 'locked') {
        pn_fail(429, 'Mã OTP đã bị khóa do nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.');
    }
    if ($result !== 'ok') {
        pn_fail(401, $result === 'expired' ? 'Mã OTP đã hết hạn hoặc không tồn tại.' : 'Mã OTP không đúng.');
    }
    pn_session_start(true);
    session_regenerate_id(true);
    $_SESSION = [
        'admin' => true,
        'login_at' => time(),
        'csrf' => bin2hex(random_bytes(32)),
    ];
    pn_send(200, ['ok' => true, 'csrf' => $_SESSION['csrf']]);
}

function pn_handle_logout(): never
{
    pn_require_method(['POST']);
    pn_check_origin();
    pn_require_admin();
    pn_require_csrf();
    $_SESSION = [];
    setcookie(PN_SESSION_COOKIE, '', [
        'expires' => time() - 3600,
        'path' => '/api/',
        'secure' => pn_config()['cookie_secure'],
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_destroy();
    pn_send(200, ['ok' => true]);
}

function pn_handle_me(): never
{
    pn_require_method(['GET']);
    if (!pn_is_admin()) {
        pn_send(200, ['authenticated' => false]);
    }
    pn_send(200, ['authenticated' => true, 'csrf' => (string) $_SESSION['csrf']]);
}
