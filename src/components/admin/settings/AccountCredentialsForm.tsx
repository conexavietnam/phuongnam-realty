import React, { useState } from 'react';
import { CheckCircle2, Circle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { api } from '@/services/apiClient';
import { passwordAcceptable, passwordRules } from '@/utils/passwordPolicy';
import { ERROR_CLASS, INPUT_CLASS, LABEL_CLASS, SUCCESS_CLASS } from './formStyles';

interface AccountCredentialsFormProps {
  configured: boolean;
  currentEmail: string;
  onSaved: () => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AccountCredentialsForm({ configured, currentEmail, onSaved }: AccountCredentialsFormProps) {
  const [email, setEmail] = useState(currentEmail);
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const trimmedEmail = email.trim();
  const emailChanged = configured && trimmedEmail.toLowerCase() !== currentEmail.toLowerCase();
  const wantsPassword = !configured || password !== '';
  const rules = passwordRules(password, trimmedEmail);
  const emailOk = EMAIL_PATTERN.test(trimmedEmail) && trimmedEmail.length <= 120;
  const passwordOk = !wantsPassword || (passwordAcceptable(password, trimmedEmail) && password === confirm);
  const hasChange = !configured || emailChanged || password !== '';
  const canSubmit = !busy && emailOk && passwordOk && hasChange && (!configured || currentPassword !== '');
  const inputType = showPasswords ? 'text' : 'password';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      await api.setAccount({
        email: trimmedEmail,
        ...(password ? { password } : {}),
        ...(configured ? { currentPassword } : {}),
      });
      setCurrentPassword('');
      setPassword('');
      setConfirm('');
      setSuccess(
        configured
          ? 'Đã cập nhật. Các thiết bị khác đã bị đăng xuất; phiên này vẫn được giữ.'
          : 'Đã thiết lập tài khoản. Từ lần sau hãy đăng nhập bằng email và mật khẩu.',
      );
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu thay đổi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
      {error && <div role="alert" className={ERROR_CLASS}>{error}</div>}
      {success && <div role="status" className={SUCCESS_CLASS}>{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="acct-email" className={LABEL_CLASS}>Email đăng nhập</label>
          <input
            id="acct-email"
            type="email"
            name="username"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={120}
            placeholder="email@congty.vn"
            className={INPUT_CLASS}
          />
        </div>
        {configured && (
          <div>
            <label htmlFor="acct-current" className={LABEL_CLASS}>Mật khẩu hiện tại (bắt buộc để thay đổi)</label>
            <input
              id="acct-current"
              type={inputType}
              name="current-password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              maxLength={128}
              className={INPUT_CLASS}
            />
          </div>
        )}
        <div>
          <label htmlFor="acct-new" className={LABEL_CLASS}>
            {configured ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu'}
          </label>
          <input
            id="acct-new"
            type={inputType}
            name="new-password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={128}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="acct-confirm" className={LABEL_CLASS}>Nhập lại mật khẩu</label>
          <input
            id="acct-confirm"
            type={inputType}
            name="confirm-password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            maxLength={128}
            className={INPUT_CLASS}
          />
          {confirm !== '' && password !== confirm && <p className="text-xs text-rose-600 mt-1">Hai mật khẩu chưa khớp.</p>}
        </div>
      </div>

      {wantsPassword && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs" aria-label="Yêu cầu mật khẩu">
          {rules.map((rule) => (
            <li key={rule.id} className={`flex items-center gap-2 ${rule.ok ? 'text-emerald-700' : 'text-slate-500'}`}>
              {rule.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <Circle className="w-4 h-4 shrink-0" />}
              {rule.label}
            </li>
          ))}
          <li className="flex items-center gap-2 text-slate-500 sm:col-span-2">
            <Circle className="w-4 h-4 shrink-0" />
            Không nằm trong danh sách mật khẩu phổ biến (máy chủ kiểm tra khi lưu)
          </li>
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" size="sm" disabled={!canSubmit} className="text-xs font-semibold py-2.5 px-6">
          {busy ? 'Đang lưu...' : configured ? 'Lưu thay đổi' : 'Thiết lập tài khoản'}
        </Button>
        <button
          type="button"
          onClick={() => setShowPasswords((value) => !value)}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
          aria-pressed={showPasswords}
        >
          {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showPasswords ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        </button>
      </div>
    </form>
  );
}
