import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { X, Phone, Mail, Share2, Video, Camera } from 'lucide-react';
import { companyService } from '@/services/companyService';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose }) => {
  const companyInfo = companyService.getCompanyInfo();
  const menuConfig = companyService.getMenuConfig();

  // Prevent background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className={`fixed top-0 left-0 bottom-0 w-4/5 max-w-sm bg-white z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="font-bold text-navy-900 text-lg">PN REALTY</div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-slate-500 hover:text-navy-900 focus:outline-none"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-2">
          {menuConfig.desktop.map((item, idx) => (
            <NavLink
              key={idx}
              to={item.path}
              end={item.exact}
              onClick={onClose}
              className={({ isActive }) =>
                `block px-4 py-4 border-b border-slate-50 text-base font-medium transition-colors ${
                  isActive ? 'text-gold-500 bg-gold-50/30' : 'text-navy-800'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 mt-auto">
          <div className="space-y-3 mb-4">
            <a href={`tel:${companyInfo.hotline.replace(/\s/g, '')}`} className="flex items-center text-navy-800">
              <Phone className="w-5 h-5 mr-3 text-gold-500" />
              <span className="font-semibold">{companyInfo.hotline}</span>
            </a>
            <a href={`mailto:${companyInfo.email}`} className="flex items-center text-slate-600 text-sm">
              <Mail className="w-5 h-5 mr-3 text-slate-400" />
              {companyInfo.email}
            </a>
          </div>
          
          <div className="flex space-x-4 pt-3 border-t border-slate-200">
            {companyInfo.social.facebook && (
              <a href={companyInfo.social.facebook} className="text-slate-400 hover:text-blue-600">
                <Share2 className="w-5 h-5" />
              </a>
            )}
            {companyInfo.social.youtube && (
              <a href={companyInfo.social.youtube} className="text-slate-400 hover:text-red-600">
                <Video className="w-5 h-5" />
              </a>
            )}
            {companyInfo.social.instagram && (
              <a href={companyInfo.social.instagram} className="text-slate-400 hover:text-pink-600">
                <Camera className="w-5 h-5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
