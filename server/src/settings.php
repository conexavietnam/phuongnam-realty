<?php
declare(strict_types=1);

// Admin-changeable login phone and Telegram chat id. The bot token is NOT changeable here:
// it only ever comes from config.php.

function pn_settings_path(): string
{
    return pn_config()['data_dir'] . '/admin_settings.json';
}

function pn_settings_otp_path(): string
{
    return pn_config()['data_dir'] . '/auth/settings_otp.json';
}

/** Effective admin settings: values from admin_settings.json win over config.php. */
function pn_admin_settings(): array
{
    $cfg = pn_config();
    $saved = pn_read_json_file(pn_settings_path()) ?? [];
    $pick = static fn(string $key, string $fallback): string => isset($saved[$key]) && is_string($saved[$key]) && $saved[$key] !== ''
        ? $saved[$key]
        : $fallback;
    return [
        'chat_id' => $pick('chat_id', $cfg['telegram_admin_chat_id']),
        'phone' => $pick('phone', $cfg['admin_phone']),
        'bot_username' => $pick('bot_username', ''),
    ];
}

/** Merges $changes into admin_settings.json (only keys that are set are ever stored). */
function pn_settings_update(array $changes): void
{
    $path = pn_settings_path();
    pn_with_lock($path, static function () use ($path, $changes): void {
        $saved = pn_read_json_file($path) ?? [];
        $next = array_merge($saved, $changes);
        if (is_file($path)) {
            pn_backup_collection('admin_settings', $path);
        }
        pn_atomic_write($path, json_encode($next, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n");
    });
}

function pn_mask_chat_id(string $chatId): string
{
    return str_repeat('*', max(0, strlen($chatId) - 4)) . substr($chatId, -4);
}

function pn_bot_username(): string
{
    $cached = pn_admin_settings()['bot_username'];
    if ($cached !== '') {
        return $cached;
    }
    $me = pn_telegram_call('getMe', []);
    $username = (string) ($me['result']['username'] ?? '');
    if (preg_match('/^[A-Za-z0-9_]{3,64}$/', $username) !== 1) {
        return '';
    }
    pn_settings_update(['bot_username' => $username]);
    return $username;
}

function pn_require_admin_write(): void
{
    pn_check_origin();
    pn_require_admin();
    pn_require_csrf();
}

function pn_handle_settings_get(): never
{
    pn_require_method(['GET']);
    pn_require_admin();
    $settings = pn_admin_settings();
    pn_send(200, [
        'phone' => $settings['phone'],
        'chatIdMasked' => pn_mask_chat_id($settings['chat_id']),
        'botUsername' => pn_bot_username(),
    ]);
}

/** Validates the request body and returns the changes that actually differ from the current values. */
function pn_parse_settings_change(array $body, array $current): array
{
    $chatId = trim((string) ($body['newChatId'] ?? ''));
    $phone = pn_normalize_phone((string) ($body['newPhone'] ?? ''));
    if ($chatId !== '' && preg_match('/^[0-9]{5,15}$/', $chatId) !== 1) {
        pn_fail(422, 'Telegram ID phải gồm 5-15 chữ số.');
    }
    if ($phone !== '' && preg_match('/^0[0-9]{9,10}$/', $phone) !== 1) {
        pn_fail(422, 'Số điện thoại không hợp lệ.');
    }
    $changes = [];
    if ($chatId !== '' && $chatId !== $current['chat_id']) {
        $changes['chat_id'] = $chatId;
    }
    if ($phone !== '' && !hash_equals(pn_normalize_phone($current['phone']), $phone)) {
        $changes['phone'] = $phone;
    }
    if ($changes === []) {
        pn_fail(422, 'Không có thay đổi nào so với thông tin hiện tại.');
    }
    return $changes;
}

function pn_settings_otp_issue(string $otp, array $changes): void
{
    $path = pn_settings_otp_path();
    $record = [
        'hash' => password_hash($otp, PASSWORD_DEFAULT),
        'expires' => time() + PN_OTP_TTL_SECONDS,
        'attempts' => 0,
        'chat_id' => $changes['chat_id'] ?? '',
        'phone' => $changes['phone'] ?? '',
    ];
    pn_with_lock($path, static function () use ($path, $record): void {
        pn_atomic_write($path, json_encode($record));
    });
}

function pn_settings_otp_clear(): void
{
    $path = pn_settings_otp_path();
    pn_with_lock($path, static function () use ($path): void {
        @unlink($path);
    });
}

function pn_handle_settings_request(): never
{
    pn_require_method(['POST']);
    pn_require_admin_write();
    if (!pn_rate_ok('settings_req', pn_client_ip() . '|' . session_id(), 3, 600)) {
        pn_fail(429, 'Bạn yêu cầu quá nhiều lần. Vui lòng thử lại sau ít phút.');
    }
    $current = pn_admin_settings();
    $changes = pn_parse_settings_change(pn_read_json_object(), $current);
    $probe = '🔔 <b>[PHƯƠNG NAM REALTY]</b> Tin nhắn kiểm tra: tài khoản Telegram này đang được đề xuất làm tài khoản quản trị. Chưa có thay đổi nào được áp dụng.';
    if (isset($changes['chat_id']) && !pn_telegram_send($probe, $changes['chat_id'])) {
        pn_fail(422, 'Không gửi được tin nhắn tới Telegram ID mới. Hãy mở bot, bấm Start bằng tài khoản Telegram mới rồi thử lại.');
    }
    $otp = sprintf('%06d', random_int(0, 999999));
    pn_settings_otp_issue($otp, $changes);
    $text = "🔐 <b>[PHƯƠNG NAM REALTY] XÁC NHẬN ĐỔI THÔNG TIN QUẢN TRỊ</b>\n\nMã OTP: <code>" . $otp . "</code>\n\n"
        . '⏳ <i>Mã có hiệu lực 3 phút. Nếu không phải bạn yêu cầu, hãy bỏ qua tin nhắn này.</i>';
    if (!pn_telegram_send($text, $current['chat_id'])) {
        pn_settings_otp_clear();
        pn_fail(502, 'Không gửi được mã OTP tới Telegram hiện tại. Chưa có thay đổi nào được áp dụng.');
    }
    pn_send(200, ['ok' => true, 'expiresIn' => PN_OTP_TTL_SECONDS]);
}

function pn_handle_settings_confirm(): never
{
    pn_require_method(['POST']);
    pn_require_admin_write();
    if (!pn_rate_ok('settings_verify', pn_client_ip() . '|' . session_id(), 30, 600)) {
        pn_fail(429, 'Quá nhiều lần thử. Vui lòng thử lại sau.');
    }
    $code = (string) (pn_read_json_object()['otp'] ?? '');
    if (preg_match('/^[0-9]{6}$/', $code) !== 1) {
        pn_fail(400, 'Mã OTP gồm 6 chữ số.');
    }
    $result = pn_otp_verify($code, pn_settings_otp_path());
    if ($result['status'] === 'locked') {
        pn_fail(429, 'Mã OTP đã bị khóa do nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.');
    }
    if ($result['status'] !== 'ok') {
        pn_fail(401, $result['status'] === 'expired' ? 'Mã OTP đã hết hạn hoặc không tồn tại.' : 'Mã OTP không đúng.');
    }
    pn_apply_settings_change($result['record']);
    $settings = pn_admin_settings();
    pn_send(200, [
        'ok' => true,
        'phone' => $settings['phone'],
        'chatIdMasked' => pn_mask_chat_id($settings['chat_id']),
    ]);
}

function pn_apply_settings_change(array $pending): void
{
    $old = pn_admin_settings();
    $changes = [];
    foreach (['chat_id', 'phone'] as $key) {
        if (is_string($pending[$key] ?? null) && $pending[$key] !== '') {
            $changes[$key] = $pending[$key];
        }
    }
    pn_settings_update($changes);
    $notice = '✅ <b>[PHƯƠNG NAM REALTY]</b> Thông tin quản trị (số điện thoại đăng nhập / Telegram nhận OTP) đã được cập nhật.';
    pn_telegram_send($notice, $old['chat_id']);
    if (isset($changes['chat_id']) && $changes['chat_id'] !== $old['chat_id']) {
        pn_telegram_send($notice, $changes['chat_id']);
    }
}
