import React, { useState } from 'react';
import { Menu, Phone } from 'lucide-react';
import { companyService } from '@/services/companyService';
import { Logo } from '@/components/common/Logo';
import { MobileDrawer } from './MobileDrawer';

export const MobileHeader: React.FC = () => {
  const companyInfo = companyService.getCompanyInfo();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-14 bg-white shadow-sm z-40 flex items-center justify-between px-4">
        <button 
          onClick={() => setIsDrawerOpen(true)}
          className="p-2 -ml-2 text-navy-900 focus:outline-none"
          aria-label="Mở menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <Logo variant="dark" size="sm" />

        <a 
          href={`tel:${companyInfo.hotline.replace(/\s/g, '')}`}
          className="p-2 -mr-2 text-gold-500 focus:outline-none"
          aria-label="Gọi hotline"
        >
          <Phone className="w-6 h-6" />
        </a>
      </header>

      <MobileDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
      />
    </>
  );
};
