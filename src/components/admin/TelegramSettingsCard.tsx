import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { api } from '@/services/apiClient';
import type { AdminSettings } from '@/services/apiClient';

type Step = 'form' | 'otp' | 'done';

const INPUT_CLASS = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono';

export function TelegramSettingsCard() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [step, setStep] = useState<Step>('form');
  const [newPhone, setNewPhone] = useState('');
  const [newChatId, setNewChatId] = useState('');
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    api.getAdminSettings().then(setSettings).catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const sendRequest = async () => {
    setError(null);
    setSuccess(null);
    const chatId = newChatId.trim();
    if (!newPhone.trim() && !chatId) {
      setError('Vui lòng nhập số điện thoại mới hoặc Telegram ID mới.');
      return;
    }
    if (chatId && !/^[0-9]{5,15}$/.test(chatId)) {
      setError('Telegram ID phải gồm 5-15 chữ số.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.requestTelegramChange({ newPhone: newPhone.trim(), newChatId: chatId });
      setOtp('');
      setCountdown(res.expiresIn);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể gửi yêu cầu.');
    } finally {
      setBusy(false);
    }
  };

  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault();
    void sendRequest();
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.confirmTelegramChange(otp.trim());
      setSettings((prev) => ({ phone: res.phone, chatIdMasked: res.chatIdMasked, botUsername: prev?.botUsername ?? '' }));
      setNewPhone('');
      setNewChatId('');
      setStep('done');
      setSuccess('Đã cập nhật thông tin quản trị. Lần đăng nhập sau dùng thông tin mới.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xác thực thất bại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gold-500/40 p-6 relative overflow-hidden">
      <div className="flex items-start gap-3 mb-6">
        <div className="p-3 bg-gold-500/10 text-gold-600 rounded-xl">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-navy-900">Cài đặt bảo mật / Telegram & số điện thoại</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Hiện tại: SĐT đăng nhập{' '}
            <span className="font-mono text-navy-900 font-semibold">{settings?.phone ?? '...'}</span>, Telegram ID{' '}
            <span className="font-mono text-navy-900 font-semibold">{settings?.chatIdMasked ?? '...'}</span>. Mã OTP xác nhận
            luôn được gửi về Telegram ID hiện tại (cũ). Bot token chỉ cấu hình trên máy chủ.
          </p>
        </div>
      </div>

      {error && <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-3">{error}</div>}
      {success && <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl p-3">{success}</div>}

      {step !== 'otp' && (
        <form onSubmit={handleRequest} className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">
            {settings?.botUsername ? (
              <>
                Để đổi Telegram ID: mở bot{' '}
                <a
                  href={`https://t.me/${settings.botUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-gold-600 font-semibold underline"
                >
                  @{settings.botUsername}
                </a>
                , bấm Start/chat với bot bằng tài khoản Telegram mới, rồi nhập ID mới bên dưới.
              </>
            ) : (
              'Để đổi Telegram ID: mở bot, bấm Start/chat với bot bằng tài khoản Telegram mới, rồi nhập ID mới bên dưới.'
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại đăng nhập mới</label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Để trống nếu không đổi"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Telegram Chat ID mới</label>
              <input
                type="text"
                inputMode="numeric"
                value={newChatId}
                onChange={(e) => setNewChatId(e.target.value.replace(/\D/g, ''))}
                maxLength={15}
                placeholder="Để trống nếu không đổi"
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <Button type="submit" variant="primary" size="sm" disabled={busy} className="text-xs font-semibold py-2.5 px-6">
            {busy ? 'Đang gửi...' : 'Yêu cầu mã OTP (gửi về Telegram hiện tại)'}
          </Button>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleConfirm} className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700">Nhập mã OTP 6 số gửi về Telegram hiện tại</label>
            {countdown > 0 ? (
              <span className="text-xs font-medium text-gold-600">
                Hết hạn sau {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
              </span>
            ) : (
              <button type="button" onClick={() => void sendRequest()} disabled={busy} className="text-xs text-gold-600 underline">
                Gửi lại mã OTP
              </button>
            )}
          </div>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="• • • • • •"
            autoFocus
            className="w-full max-w-xs px-4 py-3 text-center tracking-[0.5em] font-mono text-lg font-bold rounded-xl border border-gold-500/50"
          />
          <div className="flex items-center gap-3">
            <Button type="submit" variant="primary" size="sm" disabled={busy || otp.length < 6} className="text-xs font-semibold py-2.5 px-6">
              {busy ? 'Đang xác thực...' : 'Xác nhận thay đổi'}
            </Button>
            <button
              type="button"
              onClick={() => {
                setStep('form');
                setError(null);
              }}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              Hủy thao tác
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
