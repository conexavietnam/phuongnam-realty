# Security model

- **No secrets in the client.** The bot token, admin chat id and admin phone live only in
  `server/config.php` (gitignored, mode 640). Telegram messages are sent by PHP only.
- **Admin login** is a Telegram OTP verified on the server: `random_int` code, only `password_hash`
  stored, 3 minute expiry, 5 attempts then locked (429), per-IP and global send limits. If Telegram
  fails, no session is created and the OTP is never returned to the browser.
- **Session**: HttpOnly, Secure, SameSite=Strict cookie, strict mode, ID regenerated on login, 8 hour
  absolute lifetime. State-changing admin calls (PUT data, upload, logout) require the
  `X-CSRF-Token` header and a same-origin `Origin`.
- **Changing phone / Telegram ID** (admin only, session + CSRF): the server probes the new chat id first
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
delete the file from `uploads/`; the admin is a single phone/Telegram identity.
