import type { ReactNode } from 'react';
import { Header } from '@/components/desktop/Header';
import { Footer } from '@/components/desktop/Footer';

interface DesktopLayoutProps {
  children: ReactNode;
}

export function DesktopLayout({ children }: DesktopLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
