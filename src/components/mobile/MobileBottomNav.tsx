import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Building2, Send, Newspaper, Phone } from 'lucide-react';
import { companyService } from '@/services/companyService';

const Icons: Record<string, React.FC<any>> = {
  Home,
  Building2,
  Send,
  Newspaper,
  Phone
};

export const MobileBottomNav: React.FC = () => {
  const menuConfig = companyService.getMenuConfig();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)] z-40 pb-safe">
      <div className="flex justify-around items-center h-16 px-2">
        {menuConfig.mobileBottomNav.map((item, idx) => {
          const Icon = item.icon ? (Icons[item.icon] || Home) : Home;
          
          return (
            <NavLink
              key={idx}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  isActive ? 'text-gold-500' : 'text-slate-400 hover:text-slate-600'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[10px] font-medium leading-none">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
