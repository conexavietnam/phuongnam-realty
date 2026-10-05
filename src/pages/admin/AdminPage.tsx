import { useState, useEffect } from 'react';
import { AdminLoginPage } from './AdminLoginPage';
import { AdminDashboardPage } from './AdminDashboardPage';
import { api, AUTH_EXPIRED_EVENT } from '@/services/apiClient';

type AuthState = 'checking' | 'anonymous' | 'authenticated';

export function AdminPage() {
  const [authState, setAuthState] = useState<AuthState>('checking');

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((ok) => {
        if (!cancelled) setAuthState(ok ? 'authenticated' : 'anonymous');
      })
      .catch(() => {
        if (!cancelled) setAuthState('anonymous');
      });

    const handleExpired = () => setAuthState('anonymous');
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    };
  }, []);

  const handleLogout = () => {
    api.logout().finally(() => setAuthState('anonymous'));
  };

  if (authState === 'checking') {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center text-slate-400 text-sm">
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }

  if (authState === 'anonymous') {
    return <AdminLoginPage onLoginSuccess={() => setAuthState('authenticated')} />;
  }

  return <AdminDashboardPage onLogout={handleLogout} />;
}
