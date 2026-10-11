import React, { useState } from 'react';
import { AlertTriangle, Copy, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { api } from '@/services/apiClient';
import type { AccountInfo, TwofaSetup } from '@/services/apiClient';
import { ERROR_CLASS, INPUT_CLASS, LABEL_CLASS } from './formStyles';
import { QrCode } from './QrCode';

type Step = 'idle' | 'password' | 'scan' | 'codes' | 'disable';

interface TwofaSectionProps {
  account: AccountInfo;
  onChanged: () => void;
}

export function TwofaSection({ account, onChanged }: TwofaSectionProps) {
  const [step, setStep] = useState<Step>('idle');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [setup, setSetup] = useState<TwofaSetup | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep('idle');
    setPassword('');
    setCode('');
    setSetup(null);
    setError(null);
  };

  const run = async (action: () => Promise<void>, fallback: string) => {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
    } finally {
      setBusy(false);
    }
  };

  const handleBegin = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      setSetup(await api.twofaBegin(password));
      setPassword('');
      setCode('');
      setStep('scan');
    }, 'Không thể bắt đầu thiết lập.');
  };

  const handleEnable = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      setRecoveryCodes(await api.twofaEnable(code.trim()));
      setSetup(null);
      setCode('');
      setSaved(false);
      setCopied(false);
      setStep('codes');
      onChanged();
    }, 'Không thể bật xác thực 2 lớp.');
  };

  const handleDisable = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await api.twofaDisable(password, code.trim());
      reset();
      onChanged();
    }, 'Không thể tắt xác thực 2 lớp.');
  };

  const copyCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      setCopied(true);
    } catch {
      setError('Không thể sao chép tự động. Hãy chọn và chép các mã thủ công.');
    }
  };

  const downloadCodes = () => {
    const text = `Phương Nam Realty - mã dự phòng đăng nhập quản trị\nMỗi mã chỉ dùng được một lần. Cất ở nơi an toàn.\n\n${recoveryCodes.join('\n')}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'phuongnam-ma-du-phong.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const finishCodes = () => {
    setRecoveryCodes([]);
    reset();
  };

  return (
    <section aria-labelledby="twofa-title" className="border-t border-slate-200 pt-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2.5 bg-navy-50 text-navy-700 rounded-xl">
          <Smartphone className="w-5 h-5" />
        </div>
        <div>
          <h4 id="twofa-title" className="text-sm font-bold text-navy-900">Xác thực 2 lớp (ứng dụng xác thực)</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Tùy chọn. Khi bật, ngoài mật khẩu bạn cần mã 6 số từ Google Authenticator, Authy... hoặc một mã dự phòng.
          </p>
        </div>
      </div>

      {error && <div role="alert" className={`${ERROR_CLASS} mb-4`}>{error}</div>}

      {!account.twofaAvailable && !account.twofaEnabled && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl p-3">
          Máy chủ chưa cấu hình khóa mã hóa 2FA (<span className="font-mono">auth_key</span> trong config.php), nên chưa thể bật tính năng này.
        </div>
      )}

      {account.twofaAvailable && !account.twofaEnabled && step === 'idle' && (
        <Button type="button" variant="secondary" size="sm" onClick={() => setStep('password')} className="text-xs font-semibold py-2.5 px-6">
          Bật xác thực 2 lớp
        </Button>
      )}

      {step === 'password' && (
        <form onSubmit={handleBegin} className="space-y-3 max-w-sm">
          <div>
            <label htmlFor="twofa-begin-password" className={LABEL_CLASS}>Nhập mật khẩu hiện tại để tiếp tục</label>
            <input
              id="twofa-begin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={128}
              autoFocus
              className={INPUT_CLASS}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" variant="primary" size="sm" disabled={busy || password === ''} className="text-xs font-semibold py-2.5 px-6">
              {busy ? 'Đang tạo...' : 'Tiếp tục'}
            </Button>
            <button type="button" onClick={reset} className="text-xs text-slate-500 hover:text-slate-700 underline">Hủy</button>
          </div>
        </form>
      )}

      {step === 'scan' && setup && (
        <form onSubmit={handleEnable} className="space-y-4">
          <p className="text-xs text-slate-600">
            1. Mở ứng dụng xác thực và quét mã QR bên dưới (mã QR được tạo ngay trên trình duyệt này, không gửi đi đâu).
          </p>
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <QrCode value={setup.otpauth} label="Mã QR thiết lập xác thực 2 lớp" />
            <div className="text-xs text-slate-600 space-y-2 min-w-0">
              <p>Không quét được? Nhập khóa này thủ công (loại: theo thời gian):</p>
              <p className="font-mono text-sm font-semibold text-navy-900 break-all select-all bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                {setup.secret.match(/.{1,4}/g)?.join(' ')}
              </p>
            </div>
          </div>
          <div className="max-w-xs">
            <label htmlFor="twofa-enable-code" className={LABEL_CLASS}>2. Nhập mã 6 số hiện trong ứng dụng</label>
            <input
              id="twofa-enable-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="• • • • • •"
              autoFocus
              className="w-full px-4 py-3 text-center tracking-[0.5em] font-mono text-lg font-bold rounded-xl border border-gold-500/50 focus:outline-none focus:ring-2 focus:ring-gold-500/40"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" variant="primary" size="sm" disabled={busy || code.length < 6} className="text-xs font-semibold py-2.5 px-6">
              {busy ? 'Đang xác minh...' : 'Xác minh & bật'}
            </Button>
            <button type="button" onClick={reset} className="text-xs text-slate-500 hover:text-slate-700 underline">Hủy</button>
          </div>
        </form>
      )}

      {step === 'codes' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded-xl p-3 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Xác thực 2 lớp đã bật. Đây là <strong>lần duy nhất</strong> các mã dự phòng được hiển thị. Hãy lưu lại ngay: mất điện thoại mà
              không có mã dự phòng thì chỉ quản trị máy chủ mới khôi phục được.
            </span>
          </div>
          <ul className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-sm font-semibold text-navy-900" aria-label="Mã dự phòng">
            {recoveryCodes.map((item) => (
              <li key={item} className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center select-all">{item}</li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" size="sm" onClick={() => void copyCodes()} className="text-xs font-semibold py-2 px-4">
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              {copied ? 'Đã sao chép' : 'Sao chép'}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={downloadCodes} className="text-xs font-semibold py-2 px-4">
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Tải về (.txt)
            </Button>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="rounded border-slate-300" />
            Tôi đã lưu các mã dự phòng ở nơi an toàn
          </label>
          <Button type="button" variant="primary" size="sm" disabled={!saved} onClick={finishCodes} className="text-xs font-semibold py-2.5 px-6">
            Hoàn tất
          </Button>
        </div>
      )}

      {account.twofaEnabled && step === 'idle' && (
        <div className="space-y-3">
          <p className="text-xs text-emerald-700 font-semibold">
            Đang bật. Còn <span className="font-mono">{account.recoveryCodesLeft}</span> mã dự phòng.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => setStep('disable')} className="text-xs font-semibold py-2 px-5">
            Tắt xác thực 2 lớp
          </Button>
        </div>
      )}

      {step === 'disable' && (
        <form onSubmit={handleDisable} className="space-y-3 max-w-sm">
          <div>
            <label htmlFor="twofa-disable-password" className={LABEL_CLASS}>Mật khẩu hiện tại</label>
            <input
              id="twofa-disable-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={128}
              autoFocus
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="twofa-disable-code" className={LABEL_CLASS}>Mã 6 số từ ứng dụng hoặc một mã dự phòng</label>
            <input
              id="twofa-disable-code"
              type="text"
              autoComplete="off"
              maxLength={11}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
              className={`${INPUT_CLASS} font-mono`}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" variant="primary" size="sm" disabled={busy || password === '' || code === ''} className="text-xs font-semibold py-2.5 px-6">
              {busy ? 'Đang tắt...' : 'Xác nhận tắt'}
            </Button>
            <button type="button" onClick={reset} className="text-xs text-slate-500 hover:text-slate-700 underline">Hủy</button>
          </div>
        </form>
      )}
    </section>
  );
}
