# Security model

- **No secrets in the client.** The bot token, admin chat id and admin phone live only in
  `server/config.php` (gitignored, mode 640). Telegram messages are sent by PHP only.
- **Admin login** is email + password (one admin account). Passwords are Argon2id hashed (bcrypt fallback),
  12-128 characters, not common, not containing the email name. Optional TOTP 2FA (RFC 6238) with
  one-time recovery codes; the TOTP secret is encrypted at rest with libsodium using `auth_key` from
  `config.php`. The Telegram OTP login only exists in bootstrap mode (no account yet).
- **Threat model, per control**
  - Brute force / credential stuffing: 10 attempts per 15 min per IP, 120 per 10 min global, per-account
    progressive lock (1 / 5 / 30 min) keyed by a hash of the email, so unknown emails lock identically.
  - Account enumeration: identical 401 body and status for unknown email, wrong password and wrong code;
    a password hash is always verified (dummy hash for unknown emails); `auth/mode` reveals nothing more.
  - Replay of a stolen code: a TOTP step is accepted once (`last_step`); recovery codes are consumed.
  - Session theft / fixation: id regenerated at login; HttpOnly, SameSite=Strict cookie; 2 h idle and 8 h
    absolute lifetime; a session epoch kills all other sessions on password/email/2FA change and on
    "log out everywhere"; sensitive changes need the current password.
  - Silent takeover: Telegram alerts for login, locks, password/email/2FA changes, recovery-code use, reset.
  - No web recovery path: recovery is the operator CLI `server/bin/reset-admin.php` (SSH only).
- **Session**: HttpOnly, Secure, SameSite=Strict cookie, strict mode, ID regenerated on login, 8 hour
  absolute and 2 hour idle lifetime. State-changing admin calls (PUT data, upload, logout) require the
  `X-CSRF-Token` header and a same-origin `Origin`.
- **Changing phone / Telegram ID** (admin only, session + CSRF, plus the current password in password mode): the server probes the new chat id first
  (422 if the user never started the bot, nothing changes), then sends a 6-digit OTP to the OLD
  chat id only (never to the new one, never in the HTTP response). Only `password_hash(otp)` and the
  pending values are stored (3 minute expiry, 5 attempts then locked and cleared). On success the values
  are written to `data/admin_settings.json` and both chats get a confirmation. The bot token cannot be
  changed from the UI; it stays in `server/config.php`.
- **Recovery**: if the old Telegram is unreachable the change cannot be completed (no bypass). Recovery
  is by SSH: edit `server/config.php` and delete `data/admin_settings.json`.
- **Data**: collections are whitelisted (no path is built from user input), validated by shape,
  limited to 2MB, written atomically with rotating backups. Leads and media lists are admin-only.
- **Uploads**: images only (MIME sniffed with finfo and `getimagesize`), 5MB, random file names;
  nginx must deny PHP execution under `/uploads/` (see `server/README.md`).
- **Public forms**: field validation, honeypot, 5 submissions per 10 minutes per IP.
- **XSS**: rich text rendered with `dangerouslySetInnerHTML` is passed through DOMPurify.

Known limits: rate limits are per-IP files (adequate for one small host, not for a distributed
attack); uploaded files are not re-encoded or stripped of metadata; deleting a media entry does not
delete the file from `uploads/`; there is a single admin account. Accepted trade-offs: someone who knows the email can lock the admin out for up to 30 min (per-account lock), and exhausting the global limit blocks logins for 10 min; a lost `auth_key` or 2FA device needs the operator reset.
