import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { companyService } from '@/services/companyService';
import { Button } from '@/components/common/Button';
import { Logo } from '@/components/common/Logo';
import { DesktopNav } from '@/components/desktop/DesktopNav';
import { useDataListener } from '@/hooks';
import { telHref } from '@/utils/contact';

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  useDataListener();
  const companyInfo = companyService.getCompanyInfo();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 bg-white ${
        isScrolled ? 'shadow-md py-2.5' : 'shadow-sm py-3.5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Left: Logo */}
          <Logo variant="dark" size={isScrolled ? 'sm' : 'md'} showTagline={!isScrolled} />

          {/* Center: Navigation */}
          <DesktopNav />

          {/* Right: Hotline & CTA */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 text-navy-900">
              <div className="bg-navy-50 p-2 rounded-full text-gold-500">
                <Phone className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase font-semibold">Hotline</span>
                <a href={telHref(companyInfo.hotline)} className="font-bold text-lg leading-none hover:text-gold-500 transition-colors">{companyInfo.hotline}</a>
              </div>
            </div>
            <Link to="/ky-gui">
              <Button variant="primary" size="md">
                KÝ GỬI BĐS
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
