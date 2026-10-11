import { useCallback, useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { ACCOUNT_CHANGED_EVENT, api } from '@/services/apiClient';

interface AccountSetupBannerProps {
  onSetup: () => void;
}

/** Shown on every admin tab until an email + password account exists. It cannot be dismissed. */
export function AccountSetupBanner({ onSetup }: AccountSetupBannerProps) {
  const [needsAccount, setNeedsAccount] = useState(false);

  const check = useCallback(() => {
    api
      .getAccount()
      .then((account) => setNeedsAccount(!account.configured))
      .catch(() => setNeedsAccount(false));
  }, []);

  useEffect(() => {
    check();
    window.addEventListener(ACCOUNT_CHANGED_EVENT, check);
    return () => window.removeEventListener(ACCOUNT_CHANGED_EVENT, check);
  }, [check]);

  if (!needsAccount) return null;

  return (
    <div role="alert" className="bg-gold-500/15 border-b border-gold-500/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-navy-900">
        <ShieldAlert className="w-5 h-5 text-gold-600 shrink-0" />
        <p className="flex-1">
          <strong>Chưa thiết lập email và mật khẩu.</strong> Bạn đang đăng nhập bằng Telegram OTP. Hãy tạo tài khoản để bảo mật hơn.
        </p>
        <button
          type="button"
          onClick={onSetup}
          className="self-start sm:self-auto px-4 py-2 rounded bg-navy-900 text-white text-xs font-semibold hover:bg-navy-800 transition-colors"
        >
          Thiết lập ngay
        </button>
      </div>
    </div>
  );
}
