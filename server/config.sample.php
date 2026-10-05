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

    // Public upload directory (inside the webroot) and its URL prefix.
    'uploads_dir' => dirname(__DIR__) . '/public_html/uploads',
    'uploads_url' => '/uploads/',

    // Keep true in production (HTTPS). Only set false for plain-HTTP local testing.
    'cookie_secure' => true,

    // Override only for local testing against a stub; default is the real Telegram API.
    // 'telegram_api_base' => 'https://api.telegram.org',
];
