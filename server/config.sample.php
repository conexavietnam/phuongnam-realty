<?php
// Copy to server/config.php (gitignored) and fill in real values on the server only.
// Never commit config.php. File mode should be 640, owner deploy user, group php-fpm user.
return [
    // Telegram bot used ONLY by PHP to send OTP codes and lead notifications.
    'telegram_bot_token' => 'CHANGE_ME_BOT_TOKEN',
    'telegram_admin_chat_id' => 'CHANGE_ME_CHAT_ID',

    // Phone number allowed to request an admin OTP (spaces and +84 are normalized).
    'admin_phone' => 'CHANGE_ME_ADMIN_PHONE',

    // Private writable directories (must be OUTSIDE the nginx webroot).
    'data_dir' => dirname(__DIR__) . '/data',
    'session_dir' => dirname(__DIR__) . '/data/sessions',

    // Upload directory (OUTSIDE the webroot; nginx serves it at /uploads/) and its URL prefix.
    'uploads_dir' => dirname(__DIR__) . '/uploads',
    'uploads_url' => '/uploads/',

    // 32-byte key (base64) that encrypts the 2FA (TOTP) secret at rest. Generate once, keep it secret:
    //   php -r 'echo base64_encode(random_bytes(32)), PHP_EOL;'
    // Without it the 2FA endpoints answer 503. Losing it means 2FA can no longer be verified
    // (recover with php server/bin/reset-admin.php).
    'auth_key' => 'CHANGE_ME_BASE64_32_BYTES',

    // SEO shell (server/seo/index.php). Canonical origin of the site; without it the Host header is used.
    // 'site_url' => 'https://example.com',
    // Directory holding the built index.html (default: <app root>/public_html).
    // 'webroot' => dirname(__DIR__) . '/public_html',

    // Keep true in production (HTTPS). Only set false for plain-HTTP local testing.
    'cookie_secure' => true,

    // Override only for local testing against a stub; default is the real Telegram API.
    // 'telegram_api_base' => 'https://api.telegram.org',
];
