import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff, KeyRound, Lock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { ApiError, api } from '@/services/apiClient';
import { formatClock, useCountdown } from '@/components/admin/useCountdown';

interface AdminPasswordLoginProps {
  onLoginSuccess: () => void;
}

const INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl bg-navy-950/70 border border-white/20 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-colors';
const LABEL_CLASS = 'block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2';

export function AdminPasswordLogin({ onLoginSuccess }: AdminPasswordLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [needsCode, setNeedsCode] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useCountdown();

  const locked = lock.seconds > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || locked) return;
    setError(null);
    if (!email.trim() || !password) {
      setError('Vui lòng nhập email và mật khẩu.');
      return;
    }
    if (needsCode && !code.trim()) {
      setError(useRecovery ? 'Vui lòng nhập mã dự phòng.' : 'Vui lòng nhập mã 6 chữ số.');
      return;
    }
    setBusy(true);
    try {
      const result = await api.login(email.trim(), password, needsCode ? code.trim() : undefined);
      if (result.twofa) {
        setNeedsCode(true);
        setCode('');
        return;
      }
      setPassword('');
      onLoginSuccess();
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        lock.start(err.retryAfter ?? 60);
      }
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại.');
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const backToCredentials = () => {
    setNeedsCode(false);
    setUseRecovery(false);
    setCode('');
    setError(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && (
        <div role="alert" className="bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs rounded-xl p-3.5 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>
            {error}
            {locked && <span className="block mt-1 font-semibold text-rose-100">Thử lại sau {formatClock(lock.seconds)}</span>}
          </span>
        </div>
      )}

      {!needsCode ? (
        <>
          <div>
            <label htmlFor="admin-email" className={LABEL_CLASS}>
              Email (*)
            </label>
            <input
              id="admin-email"
              type="email"
              name="username"
              autoComplete="username"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@congty.vn"
              maxLength={120}
              autoFocus
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="admin-password" className={LABEL_CLASS}>
              Mật khẩu (*)
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                maxLength={128}
                className={`${INPUT_CLASS} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 px-3.5 text-slate-400 hover:text-gold-400 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div>
          <label htmlFor="admin-code" className={LABEL_CLASS}>
            {useRecovery ? 'Mã dự phòng (*)' : 'Mã xác thực 6 chữ số (*)'}
          </label>
          <p className="text-xs text-slate-400 mb-3">
            {useRecovery
              ? 'Nhập một trong các mã dự phòng đã lưu khi bật xác thực 2 lớp. Mỗi mã chỉ dùng được một lần.'
              : 'Mở ứng dụng xác thực (Google Authenticator, Authy...) và nhập mã hiện tại.'}
          </p>
          <input
            id="admin-code"
            type="text"
            name="one-time-code"
            autoComplete={useRecovery ? 'off' : 'one-time-code'}
            inputMode={useRecovery ? 'text' : 'numeric'}
            maxLength={useRecovery ? 11 : 6}
            value={code}
            onChange={(e) =>
              setCode(useRecovery ? e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') : e.target.value.replace(/\D/g, ''))
            }
            placeholder={useRecovery ? 'XXXXX-XXXXX' : '• • • • • •'}
            autoFocus
            className="w-full px-4 py-3 text-center tracking-[0.35em] font-mono text-xl font-bold rounded-xl bg-navy-950/70 border border-gold-500/50 text-gold-400 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-colors"
          />
          <div className="flex items-center justify-between mt-3 text-xs">
            <button
              type="button"
              onClick={() => {
                setUseRecovery((value) => !value);
                setCode('');
                setError(null);
              }}
              className="text-gold-400 hover:text-gold-300 underline"
            >
              {useRecovery ? 'Dùng mã từ ứng dụng xác thực' : 'Dùng mã dự phòng'}
            </button>
            <button type="button" onClick={backToCredentials} className="text-slate-400 hover:text-white transition-colors">
              ← Quay lại
            </button>
          </div>
        </div>
      )}

      <Button type="submit" variant="primary" disabled={busy || locked} className="w-full py-3.5 font-semibold text-sm shadow-lg shadow-gold-500/20">
        {busy ? (
          <span className="flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Đang xác thực...
          </span>
        ) : locked ? (
          <span className="flex items-center justify-center gap-2">
            <Lock className="w-4 h-4" />
            ĐÃ KHÓA TẠM THỜI {formatClock(lock.seconds)}
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <KeyRound className="w-4 h-4" />
            {needsCode ? 'XÁC THỰC & VÀO QUẢN TRỊ' : 'ĐĂNG NHẬP'}
          </span>
        )}
      </Button>
    </form>
  );
}
