<?php
declare(strict_types=1);

// Operator recovery: removes the admin email/password (and 2FA) so the site returns to bootstrap mode,
// where the Telegram OTP login works once and a new account can be set up. CLI only.
//
//   php server/bin/reset-admin.php          (asks for confirmation)
//   php server/bin/reset-admin.php --yes    (no prompt)
//
// Run it as the site user, not as root (files created as root would not be writable by PHP-FPM).

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit(1);
}

$src = dirname(__DIR__) . '/src';
require $src . '/bootstrap.php';
require $src . '/storage.php';
require $src . '/totp.php';
require $src . '/auth.php';
require $src . '/account.php';
require $src . '/settings.php';

if (function_exists('posix_geteuid') && posix_geteuid() === 0 && !in_array('--allow-root', $argv, true)) {
    fwrite(STDERR, "Refusing to run as root: run as the site user (or pass --allow-root).\n");
    exit(1);
}

$path = pn_account_path();
if (!is_file($path)) {
    echo "No admin account exists: the site is already in bootstrap mode.\n";
    exit(0);
}

if (!in_array('--yes', $argv, true)) {
    echo "This removes the admin email, password and 2FA and signs everyone out.\n"
        . "The Telegram OTP login (bootstrap mode) is then used to set a new account.\n"
        . "Type RESET to continue: ";
    if (trim((string) fgets(STDIN)) !== 'RESET') {
        echo "Cancelled.\n";
        exit(1);
    }
}

pn_with_lock($path, static function () use ($path): void {
    pn_backup_collection('admin_account', $path);
    if (!unlink($path)) {
        throw new RuntimeException('Cannot remove ' . $path);
    }
});

$cfg = pn_config();
$removed = 0;
foreach ([$cfg['session_dir'] . '/sess_*', $cfg['data_dir'] . '/auth_locks/*'] as $pattern) {
    foreach (glob($pattern) ?: [] as $file) {
        if (is_file($file) && @unlink($file)) {
            $removed++;
        }
    }
}

pn_security_alert('Quản trị viên đã chạy reset-admin.php: tài khoản email và mật khẩu đã bị xóa', [
    'Máy chủ' => (string) gethostname(),
]);

echo "Admin account removed (a backup copy is in data/backups). {$removed} session/lock files deleted.\n"
    . "Bootstrap mode is active: sign in with the Telegram OTP, then set a new email and password.\n";
exit(0);
