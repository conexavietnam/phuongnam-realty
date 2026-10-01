import { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { companyService } from '@/services/companyService';
import { Button } from '@/components/common/Button';
import { Logo } from '@/components/common/Logo';

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const companyInfo = companyService.getCompanyInfo();
  const menuConfig = companyService.getMenuConfig();

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
          <nav className="hidden md:flex items-center gap-8">
            {menuConfig.desktop.map((item, index) => (
              <NavLink
                key={index}
                to={item.path}
                className={({ isActive }) =>
                  `text-base transition-colors py-2 ${
                    isActive
                      ? 'text-gold-500 font-semibold border-b-2 border-gold-500'
                      : 'text-navy-800 hover:text-gold-500'
                  }`
                }
                end={item.exact}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right: Hotline & CTA */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 text-navy-900">
              <div className="bg-navy-50 p-2 rounded-full text-gold-500">
                <Phone className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase font-semibold">Hotline</span>
                <span className="font-bold text-lg leading-none">{companyInfo.hotline}</span>
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
