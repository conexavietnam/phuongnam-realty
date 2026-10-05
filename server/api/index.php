<?php
declare(strict_types=1);

// Single entry point: /api/index.php?r=<route>
// Layout: this file lives in <webroot>/api/, shared code in <app root>/server/src/.
$serverDir = dirname(__DIR__, 2) . '/server';

ini_set('display_errors', '0');
ini_set('log_errors', '1');

require $serverDir . '/src/bootstrap.php';
require $serverDir . '/src/storage.php';
require $serverDir . '/src/auth.php';
require $serverDir . '/src/settings.php';
require $serverDir . '/src/handlers.php';

set_exception_handler(static function (Throwable $e): void {
    error_log('api error: ' . get_class($e) . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    if (!headers_sent()) {
        pn_send(500, ['error' => 'Internal server error']);
    }
});

$route = isset($_GET['r']) && is_string($_GET['r'])
    ? $_GET['r']
    : (string) ($_SERVER['PATH_INFO'] ?? '');

switch (trim($route, '/')) {
    case 'data':
        pn_handle_data();
    case 'lead':
        pn_handle_lead();
    case 'upload':
        pn_handle_upload();
    case 'auth/otp':
        pn_handle_otp_send();
    case 'auth/verify':
        pn_handle_otp_verify();
    case 'auth/logout':
        pn_handle_logout();
    case 'auth/me':
        pn_handle_me();
    case 'settings/admin':
        pn_handle_settings_get();
    case 'settings/telegram/request':
        pn_handle_settings_request();
    case 'settings/telegram/confirm':
        pn_handle_settings_confirm();
    default:
        pn_fail(404, 'Not found');
}
