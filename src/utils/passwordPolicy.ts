// Mirrors the server rules (server/src/account.php pn_password_policy_error) so the admin sees them live.
// The server stays the authority and also rejects very common passwords, which is not checked here.

export interface PolicyRule {
  id: string;
  label: string;
  ok: boolean;
}

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

export function passwordRules(password: string, email: string): PolicyRule[] {
  const chars = [...password];
  const local = email.split('@')[0]?.trim().toLowerCase() ?? '';
  const lower = password.toLowerCase();
  return [
    { id: 'length', label: `Dài từ ${PASSWORD_MIN} đến ${PASSWORD_MAX} ký tự`, ok: chars.length >= PASSWORD_MIN && chars.length <= PASSWORD_MAX },
    { id: 'digits', label: 'Không chỉ gồm chữ số', ok: password !== '' && !/^[0-9]+$/.test(password) },
    { id: 'repeat', label: 'Không lặp lại một ký tự', ok: password !== '' && new Set(chars).size > 1 },
    {
      id: 'email',
      label: 'Không trùng hoặc chứa phần tên của email',
      ok: password !== '' && lower !== email.trim().toLowerCase() && !(local.length >= 3 && lower.includes(local)),
    },
  ];
}

export function passwordAcceptable(password: string, email: string): boolean {
  return passwordRules(password, email).every((rule) => rule.ok);
}
