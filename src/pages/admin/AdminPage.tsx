import { useState, useEffect } from 'react';
import { AdminLoginPage } from './AdminLoginPage';
import { AdminDashboardPage } from './AdminDashboardPage';

export function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const session = sessionStorage.getItem('pn_admin_session');
      return !!session;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const checkSession = () => {
      try {
        const session = sessionStorage.getItem('pn_admin_session');
        setIsAuthenticated(!!session);
      } catch {
        setIsAuthenticated(false);
      }
    };
    window.addEventListener('storage', checkSession);
    return () => window.removeEventListener('storage', checkSession);
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem('pn_admin_session');
    } catch (e) {
      console.error(e);
    }
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <AdminLoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return <AdminDashboardPage onLogout={handleLogout} />;
}
