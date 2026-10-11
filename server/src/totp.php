<?php
declare(strict_types=1);

// RFC 4226 / RFC 6238 time based one-time passwords (HMAC-SHA1, 30 s step, 6 digits).
// Pure functions without any dependency so that tests can load this file on its own.

const PN_TOTP_PERIOD = 30;
const PN_BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function pn_base32_encode(string $binary): string
{
    $bits = '';
    foreach (str_split($binary) as $char) {
        $bits .= str_pad(decbin(ord($char)), 8, '0', STR_PAD_LEFT);
    }
    $out = '';
    foreach (str_split($bits, 5) as $chunk) {
        $out .= PN_BASE32_ALPHABET[bindec(str_pad($chunk, 5, '0'))];
    }
    return $out;
}

function pn_base32_decode(string $text): ?string
{
    $text = strtoupper(str_replace([' ', '-', '='], '', $text));
    if ($text === '' || preg_match('/^[A-Z2-7]+$/', $text) !== 1) {
        return null;
    }
    $bits = '';
    foreach (str_split($text) as $char) {
        $bits .= str_pad(decbin((int) strpos(PN_BASE32_ALPHABET, $char)), 5, '0', STR_PAD_LEFT);
    }
    $out = '';
    foreach (str_split($bits, 8) as $byte) {
        if (strlen($byte) === 8) {
            $out .= chr(bindec($byte));
        }
    }
    return $out;
}

/** Six digit code for one 30 second step counter. */
function pn_totp_code(string $secret, int $step): string
{
    $hmac = hash_hmac('sha1', pack('J', $step), $secret, true);
    $offset = ord($hmac[19]) & 0x0f;
    $value = ((ord($hmac[$offset]) & 0x7f) << 24)
        | (ord($hmac[$offset + 1]) << 16)
        | (ord($hmac[$offset + 2]) << 8)
        | ord($hmac[$offset + 3]);
    return str_pad((string) ($value % 1000000), 6, '0', STR_PAD_LEFT);
}

/**
 * Checks $code against the steps current-1..current+1. Returns the matching step, or null when
 * nothing matches or the step is not newer than $lastStep (replay protection).
 */
function pn_totp_verify(string $secret, string $code, int $lastStep, ?int $now = null): ?int
{
    $current = intdiv($now ?? time(), PN_TOTP_PERIOD);
    $matched = null;
    for ($step = $current - 1; $step <= $current + 1; $step++) {
        if (hash_equals(pn_totp_code($secret, $step), $code) && $step > $lastStep) {
            $matched = $step;
        }
    }
    return $matched;
}
