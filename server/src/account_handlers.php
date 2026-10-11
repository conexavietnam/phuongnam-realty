<?php
declare(strict_types=1);

// HTTP handlers for email + password login, account management and TOTP 2FA.

function pn_handle_auth_mode(): never
{
    pn_require_method(['GET']);
    pn_send(200, ['mode' => pn_auth_mode(), 'twofa' => false]);
}

function pn_handle_login(): never
{
    pn_require_method(['POST']);
    pn_check_origin();
    if (pn_auth_mode() !== 'password') {
        pn_fail(403, 'Không khả dụng');
    }
    $body = pn_read_json_object(4096);
    $email = pn_normalize_email(is_string($body['email'] ?? null) ? $body['email'] : '');
    $password = is_string($body['password'] ?? null) ? $body['password'] : '';
    $code = is_string($body['code'] ?? null) ? trim($body['code']) : '';
    $ip = pn_client_ip();
    $accountKey = hash('sha256', $email);

    $wait = pn_login_throttle($ip, $accountKey);
    if ($wait > 0) {
        pn_login_too_many($wait);
    }

    // Exactly one password verification on every path, so unknown emails cost the same time.
    $account = pn_account_load();
    $known = $account !== null && hash_equals($account['email'], $email);
    $verified = pn_password_check(substr($password, 0, 512), $known ? $account['password_hash'] : pn_dummy_hash());
    if (!$known || !$verified) {
        pn_login_failed($ip, $accountKey);
    }
    if ($account['totp']['enabled'] && $code === '') {
        pn_send(401, ['twofa' => true]);
    }
    $result = pn_login_commit($password, $code, $ip);
    if ($result === null) {
        pn_login_failed($ip, $accountKey);
    }

    pn_login_clear_failures($accountKey);
    pn_session_begin($result['epoch']);
    pn_security_alert('Đăng nhập quản trị thành công', pn_login_alert_fields($ip));
    if ($result['via'] === 'recovery') {
        pn_security_alert('Một mã dự phòng 2FA đã được sử dụng', [
            'Mã dự phòng còn lại' => (string) $result['recoveryLeft'],
            'IP' => $ip,
        ]);
    }
    pn_send(200, ['ok' => true, 'csrf' => $_SESSION['csrf']]);
}

/**
 * Second factor, rehash and last-login bookkeeping in one locked write, so a TOTP step or a
 * recovery code can never be used twice by concurrent requests. Null when the second factor fails.
 */
function pn_login_commit(string $password, string $code, string $ip): ?array
{
    return pn_account_mutate(static function (?array $account) use ($password, $code, $ip): array {
        if ($account === null) {
            return ['account' => null, 'result' => null];
        }
        $via = 'password';
        if ($account['totp']['enabled']) {
            $via = pn_second_factor_consume($account, $code);
            if ($via === null) {
                return ['account' => null, 'result' => null];
            }
        }
        if (pn_password_needs_rehash($account['password_hash'])) {
            $account['password_hash'] = pn_password_hash($password);
        }
        $account['prev_login_at'] = $account['last_login_at'] ?? null;
        $account['prev_login_ip'] = (string) ($account['last_login_ip'] ?? '');
        $account['last_login_at'] = time();
        $account['last_login_ip'] = $ip;
        return [
            'account' => $account,
            'result' => [
                'epoch' => (int) $account['session_epoch'],
                'via' => $via,
                'recoveryLeft' => count($account['totp']['recovery_hashes']),
            ],
        ];
    });
}

function pn_handle_account_get(): never
{
    pn_require_method(['GET']);
    pn_require_admin();
    $account = pn_account_load();
    pn_send(200, [
        'configured' => $account !== null,
        'email' => $account['email'] ?? '',
        'twofaEnabled' => $account !== null && $account['totp']['enabled'],
        'twofaAvailable' => pn_auth_key() !== null,
        'lastLoginAt' => $account['prev_login_at'] ?? null,
        'lastLoginIp' => pn_mask_ip((string) ($account['prev_login_ip'] ?? '')),
        'recoveryCodesLeft' => $account === null ? 0 : count($account['totp']['recovery_hashes']),
    ]);
}

function pn_handle_account_set(): never
{
    pn_require_method(['POST']);
    pn_require_admin_write();
    $body = pn_read_json_object(4096);
    $existing = pn_account_load();
    $exists = $existing !== null;
    if ($existing === null && is_file(pn_account_path())) {
        pn_fail(503, 'Tệp tài khoản bị hỏng. Hãy dùng reset-admin.php trên máy chủ.');
    }
    if ($exists) {
        pn_require_current_password($existing, $body['currentPassword'] ?? null);
    }

    $emailInput = is_string($body['email'] ?? null) ? trim($body['email']) : '';
    $password = is_string($body['password'] ?? null) ? $body['password'] : '';
    $email = $emailInput === '' && $exists ? $existing['email'] : pn_normalize_email($emailInput);
    if (!pn_email_valid($email)) {
        pn_fail(422, 'Email không hợp lệ (tối đa 120 ký tự).');
    }
    if (!$exists && $password === '') {
        pn_fail(422, 'Vui lòng nhập mật khẩu.');
    }
    if ($password !== '') {
        $reason = pn_password_policy_error($password, $email);
        if ($reason !== null) {
            pn_fail(422, $reason);
        }
        if ($exists && hash_equals((string) $body['currentPassword'], $password)) {
            pn_fail(422, 'Mật khẩu mới phải khác mật khẩu hiện tại.');
        }
    }
    $emailChanged = !$exists || $email !== $existing['email'];
    if ($exists && $password === '' && !$emailChanged) {
        pn_fail(422, 'Không có thay đổi nào.');
    }

    $newHash = $password !== '' ? pn_password_hash($password) : null;
    $outcome = pn_account_mutate(static function (?array $current) use ($exists, $email, $newHash): array {
        if ($exists !== ($current !== null)) {
            return ['account' => null, 'result' => null];
        }
        if ($current === null) {
            $next = pn_new_account($email, (string) $newHash);
        } else {
            $next = $current;
            $next['email'] = $email;
            if ($newHash !== null) {
                $next['password_hash'] = $newHash;
                $next['password_changed_at'] = time();
            }
            $next['session_epoch'] = pn_new_epoch((int) $current['session_epoch']);
        }
        return ['account' => $next, 'result' => (int) $next['session_epoch']];
    }, true);
    if ($outcome === null) {
        pn_fail(409, 'Tài khoản vừa được thay đổi ở nơi khác. Vui lòng tải lại trang.');
    }

    pn_session_rebind((int) $outcome);
    pn_dummy_hash();
    $ip = pn_client_ip();
    if (!$exists) {
        pn_security_alert('Đã thiết lập tài khoản đăng nhập bằng email và mật khẩu', ['Email' => pn_mask_email($email), 'IP' => $ip]);
    } else {
        if ($password !== '') {
            pn_security_alert('Mật khẩu quản trị đã được đổi', ['IP' => $ip]);
        }
        if ($emailChanged) {
            pn_security_alert('Email đăng nhập quản trị đã được đổi', ['Email mới' => pn_mask_email($email), 'IP' => $ip]);
        }
    }
    pn_send(200, ['ok' => true, 'email' => $email]);
}

/** Keeps the current browser signed in under a new epoch; every other session dies. */
function pn_session_rebind(int $epoch): void
{
    $_SESSION['epoch'] = $epoch;
    $_SESSION['last_seen'] = time();
}

function pn_handle_logout_all(): never
{
    pn_require_method(['POST']);
    pn_require_admin_write();
    $changed = pn_account_mutate(static function (?array $account): array {
        if ($account === null) {
            return ['account' => null, 'result' => false];
        }
        $account['session_epoch'] = pn_new_epoch((int) $account['session_epoch']);
        return ['account' => $account, 'result' => true];
    });
    if ($changed !== true) {
        pn_fail(409, 'Chưa có tài khoản email và mật khẩu.');
    }
    pn_session_destroy();
    pn_security_alert('Đã đăng xuất mọi thiết bị', ['IP' => pn_client_ip()]);
    pn_send(200, ['ok' => true]);
}

/** Shared checks of the 2FA endpoints; returns the account. */
function pn_twofa_context(): array
{
    pn_require_method(['POST']);
    pn_require_admin_write();
    if (pn_auth_key() === null) {
        pn_fail(503, 'Chưa cấu hình khóa mã hóa 2FA');
    }
    $account = pn_account_load();
    if ($account === null) {
        pn_fail(409, 'Hãy thiết lập email và mật khẩu trước.');
    }
    return $account;
}

function pn_totp_code_input(array $body): string
{
    $code = is_string($body['code'] ?? null) ? trim($body['code']) : '';
    return preg_match('/^[0-9]{6}$/', $code) === 1 ? $code : '';
}

function pn_handle_twofa_begin(): never
{
    $account = pn_twofa_context();
    $body = pn_read_json_object(4096);
    pn_require_current_password($account, $body['password'] ?? null);
    if ($account['totp']['enabled']) {
        pn_fail(409, 'Xác thực 2 lớp đã được bật.');
    }
    $secret = random_bytes(20);
    $encrypted = pn_secret_encrypt($secret, (string) pn_auth_key());
    pn_account_mutate(static function (?array $current) use ($encrypted): array {
        if ($current === null) {
            return ['account' => null, 'result' => null];
        }
        $current['totp']['pending_enc'] = $encrypted;
        $current['totp']['pending_at'] = time();
        return ['account' => $current, 'result' => null];
    });
    $base32 = pn_base32_encode($secret);
    $issuer = 'Phuong Nam Realty';
    pn_send(200, [
        'secret' => $base32,
        'otpauth' => 'otpauth://totp/' . rawurlencode($issuer) . ':' . rawurlencode($account['email'])
            . '?secret=' . $base32 . '&issuer=' . rawurlencode($issuer) . '&algorithm=SHA1&digits=6&period=30',
    ]);
}

function pn_handle_twofa_enable(): never
{
    $account = pn_twofa_context();
    $body = pn_read_json_object(4096);
    if (pn_rate_check('twofa_enable', 'global', 10, 900) > 0) {
        pn_fail(429, 'Quá nhiều lần thử. Vui lòng thử lại sau ít phút.');
    }
    $totp = $account['totp'];
    if ($totp['enabled']) {
        pn_fail(409, 'Xác thực 2 lớp đã được bật.');
    }
    $secret = $totp['pending_enc'] !== '' && time() - $totp['pending_at'] < PN_TOTP_PENDING_SECONDS
        ? pn_secret_decrypt($totp['pending_enc'])
        : null;
    if ($secret === null) {
        pn_fail(422, 'Phiên thiết lập đã hết hạn. Hãy bắt đầu lại.');
    }
    $code = pn_totp_code_input($body);
    $step = $code === '' ? null : pn_totp_verify($secret, $code, 0);
    if ($step === null) {
        pn_fail(422, 'Mã xác thực không đúng.');
    }

    $plainCodes = pn_recovery_codes_generate();
    $hashes = array_map('pn_recovery_code_hash', $plainCodes);
    $pending = $totp['pending_enc'];
    $epoch = pn_account_mutate(static function (?array $current) use ($pending, $step, $hashes): array {
        if ($current === null || $current['totp']['enabled'] || $current['totp']['pending_enc'] !== $pending) {
            return ['account' => null, 'result' => null];
        }
        $current['totp'] = [
            'enabled' => true,
            'secret_enc' => $pending,
            'pending_enc' => '',
            'pending_at' => 0,
            'last_step' => $step,
            'recovery_hashes' => $hashes,
        ];
        $current['session_epoch'] = pn_new_epoch((int) $current['session_epoch']);
        return ['account' => $current, 'result' => (int) $current['session_epoch']];
    }, true);
    if ($epoch === null) {
        pn_fail(409, 'Phiên thiết lập đã thay đổi. Hãy bắt đầu lại.');
    }
    pn_session_rebind((int) $epoch);
    pn_security_alert('Xác thực 2 lớp (TOTP) đã được bật', ['IP' => pn_client_ip()]);
    pn_send(200, ['ok' => true, 'recoveryCodes' => $plainCodes]);
}

function pn_handle_twofa_disable(): never
{
    $account = pn_twofa_context();
    $body = pn_read_json_object(4096);
    pn_require_current_password($account, $body['password'] ?? null);
    if (!$account['totp']['enabled']) {
        pn_fail(409, 'Xác thực 2 lớp chưa được bật.');
    }
    $code = is_string($body['code'] ?? null) ? trim($body['code']) : '';
    $epoch = pn_account_mutate(static function (?array $current) use ($code): array {
        if ($current === null || !$current['totp']['enabled'] || pn_second_factor_consume($current, $code) === null) {
            return ['account' => null, 'result' => null];
        }
        $current['totp'] = pn_empty_totp();
        $current['session_epoch'] = pn_new_epoch((int) $current['session_epoch']);
        return ['account' => $current, 'result' => (int) $current['session_epoch']];
    }, true);
    if ($epoch === null) {
        pn_fail(422, 'Mã xác thực không đúng.');
    }
    pn_session_rebind((int) $epoch);
    pn_security_alert('Xác thực 2 lớp (TOTP) đã bị tắt', ['IP' => pn_client_ip()]);
    pn_send(200, ['ok' => true]);
}
