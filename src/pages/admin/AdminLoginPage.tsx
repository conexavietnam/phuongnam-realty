import React, { useState, useEffect } from 'react';
import { ShieldCheck, Send, KeyRound, AlertCircle, ArrowLeft, MessageSquare, CheckCircle2, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/common/Logo';
import { Button } from '@/components/common/Button';
import { api } from '@/services/apiClient';

interface AdminLoginPageProps {
  onLoginSuccess: () => void;
}

export function AdminLoginPage({ onLoginSuccess }: AdminLoginPageProps) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOTP = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!phone.trim()) {
      setErrorMessage('Vui lòng nhập số điện thoại quản trị');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await api.requestOtp(phone.trim());
      setOtpSent(true);
      setOtp('');
      setCountdown(res.expiresIn);
      setSuccessMessage('Mã xác thực OTP đã được gửi về Telegram quản trị.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Không thể gửi mã OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!otp.trim()) {
      setErrorMessage('Vui lòng nhập mã OTP 6 chữ số');
      return;
    }

    setIsVerifying(true);
    try {
      await api.verifyOtp(otp.trim());
      onLoginSuccess();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Xác thực thất bại.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glow Accents */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-navy-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-block p-4 rounded-2xl bg-white/5 border border-white/10 shadow-2xl backdrop-blur-md mb-4">
            <Logo variant="light" size="lg" showTagline={false} />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-500/20 border border-gold-500/30 text-gold-400 font-semibold text-xs tracking-wider uppercase mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            HỆ THỐNG QUẢN TRỊ CMS
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Đăng Nhập Quản Trị Viên
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Xác thực bảo mật 2 lớp qua Telegram
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-xl py-8 px-6 sm:px-8 shadow-2xl rounded-2xl border border-white/15">
          <div className="bg-navy-900/80 rounded-xl p-3.5 border border-gold-500/30 mb-6 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gold-500/20 text-gold-400 shrink-0 mt-0.5">
              <MessageSquare className="w-4 h-4" />
            </div>
            <p className="text-xs text-slate-400">
              Mã OTP sẽ được gửi đến Telegram của quản trị viên và có hiệu lực trong 3 phút.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-5 bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs rounded-xl p-3.5 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs rounded-xl p-3.5 flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-5">
            {/* Phone Number Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Số Điện Thoại Quản Trị (*)
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Số điện thoại quản trị"
                  disabled={otpSent}
                  className="w-full px-4 py-3 rounded-xl bg-navy-950/70 border border-white/20 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-colors disabled:opacity-60"
                />
              </div>
            </div>

            {/* OTP Request Button */}
            {!otpSent ? (
              <Button
                type="button"
                variant="primary"
                onClick={handleSendOTP}
                disabled={isSendingOtp}
                className="w-full py-3.5 font-semibold text-sm shadow-lg shadow-gold-500/20"
              >
                {isSendingOtp ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Đang gửi OTP qua Telegram...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" />
                    GỬI MÃ OTP QUA TELEGRAM
                  </span>
                )}
              </Button>
            ) : (
              <>
                {/* OTP Input Field */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Mã OTP (6 chữ số) (*)
                    </label>
                    {countdown > 0 ? (
                      <span className="text-xs font-medium text-gold-400">
                        Hết hạn sau {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOTP}
                        className="text-xs text-gold-400 hover:text-gold-300 underline"
                      >
                        Gửi lại mã OTP
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="• • • • • •"
                      autoFocus
                      className="w-full px-4 py-3 text-center tracking-[0.5em] font-mono text-xl font-bold rounded-xl bg-navy-950/70 border border-gold-500/50 text-gold-400 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Login Button */}
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isVerifying || otp.length < 6}
                  className="w-full py-3.5 font-semibold text-sm shadow-lg shadow-gold-500/20"
                >
                  {isVerifying ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Đang xác thực...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <KeyRound className="w-4 h-4" />
                      XÁC THỰC & VÀO QUẢN TRỊ
                    </span>
                  )}
                </Button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp('');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    ← Đổi số điện thoại khác
                  </button>
                </div>
              </>
            )}
          </form>

          {/* Back to Public Web Link */}
          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-gold-400 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Quay lại trang chủ Phương Nam Realty
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
