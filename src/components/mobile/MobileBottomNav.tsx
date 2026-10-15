import React from 'react';
import { useLocation } from 'react-router-dom';
import { companyService } from '@/services/companyService';
import { SiteLink } from '@/components/common/SiteLink';
import { MENU_ICONS } from '@/components/common/menuIcons';
import { useDataListener } from '@/hooks';
import { isLinkActive } from '@/utils/menuConfig';

export const MobileBottomNav: React.FC = () => {
  useDataListener();
  const { pathname } = useLocation();
  const items = companyService.getNavigation().bottom;
  if (items.length === 0) return null;

  return (
    <nav aria-label="Thanh menu dưới" className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)] z-40 pb-safe">
      <div className="flex justify-around items-center h-16 px-2">
        {items.map((item) => {
          const Icon = MENU_ICONS[item.icon];
          const active = isLinkActive(pathname, item);
          return (
            <SiteLink
              key={item.id}
              item={item}
              active={active}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                active ? 'text-gold-500' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className={`w-6 h-6 ${active ? 'fill-current' : ''}`} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </SiteLink>
          );
        })}
      </div>
    </nav>
  );
};
