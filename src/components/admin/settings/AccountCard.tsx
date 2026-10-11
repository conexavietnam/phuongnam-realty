import { useCallback, useEffect, useState } from 'react';
import { KeyRound, LogOut } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { api } from '@/services/apiClient';
import type { AccountInfo } from '@/services/apiClient';
import { AccountCredentialsForm } from './AccountCredentialsForm';
import { TwofaSection } from './TwofaSection';
import { ERROR_CLASS } from './formStyles';

function formatLastLogin(account: AccountInfo): string {
  if (!account.lastLoginAt) return 'Chưa có lần đăng nhập trước.';
  const when = new Date(account.lastLoginAt * 1000).toLocaleString('vi-VN');
  return `Lần đăng nhập trước: ${when}${account.lastLoginIp ? ` (IP ${account.lastLoginIp})` : ''}.`;
}

export function AccountCard() {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingLogoutAll, setConfirmingLogoutAll] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api
      .getAccount()
      .then(setAccount)
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleLogoutAll = async () => {
    setError(null);
    setBusy(true);
    try {
      await api.logoutAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đăng xuất các thiết bị.');
      setBusy(false);
      setConfirmingLogoutAll(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gold-500/40 p-6 space-y-6">
      <div className="flex items-start gap-3">
        <div className="p-3 bg-gold-500/10 text-gold-600 rounded-xl">
          <KeyRound className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-navy-900">Tài khoản đăng nhập</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            {account?.configured
              ? <>Đăng nhập bằng email <span className="font-mono font-semibold text-navy-900">{account.email}</span>. {formatLastLogin(account)}</>
              : 'Đăng nhập bằng email và mật khẩu thay cho mã OTP Telegram. Telegram vẫn được dùng để nhận cảnh báo bảo mật.'}
          </p>
        </div>
      </div>

      {error && <div role="alert" className={ERROR_CLASS}>{error}</div>}

      {account && !account.configured && (
        <div className="bg-gold-500/10 border border-gold-500/50 rounded-xl p-4 text-xs text-navy-900">
          <p className="font-bold text-sm mb-1">Hãy thiết lập email và mật khẩu ngay</p>
          Hiện bạn đang đăng nhập bằng Telegram OTP. Sau khi tạo tài khoản bên dưới, đăng nhập bằng Telegram OTP sẽ bị tắt và chỉ còn đăng nhập bằng
          email + mật khẩu.
        </div>
      )}

      {account && (
        <AccountCredentialsForm
          configured={account.configured}
          currentEmail={account.email}
          onSaved={load}
        />
      )}

      {account?.configured && (
        <>
          <TwofaSection account={account} onChanged={load} />

          <section aria-labelledby="logout-all-title" className="border-t border-slate-200 pt-6">
            <h4 id="logout-all-title" className="text-sm font-bold text-navy-900">Đăng xuất mọi thiết bị</h4>
            <p className="text-xs text-slate-500 mt-0.5 mb-3">
              Hủy mọi phiên đăng nhập, kể cả phiên này. Dùng khi nghi ngờ bị lộ mật khẩu hoặc quên đăng xuất ở máy lạ.
            </p>
            {confirmingLogoutAll ? (
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void handleLogoutAll()} className="text-xs font-semibold py-2 px-5">
                  <LogOut className="w-3.5 h-3.5 mr-1.5" />
                  {busy ? 'Đang xử lý...' : 'Xác nhận đăng xuất tất cả'}
                </Button>
                <button type="button" onClick={() => setConfirmingLogoutAll(false)} className="text-xs text-slate-500 hover:text-slate-700 underline">
                  Hủy
                </button>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => setConfirmingLogoutAll(true)} className="text-xs font-semibold py-2 px-5">
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Đăng xuất mọi thiết bị
              </Button>
            )}
          </section>
        </>
      )}
    </div>
  );
}
