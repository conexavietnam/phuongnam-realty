import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Phone, Mail, Share2, Video, Camera, ChevronDown } from 'lucide-react';
import { companyService } from '@/services/companyService';
import { Logo } from '@/components/common/Logo';
import { SiteLink } from '@/components/common/SiteLink';
import { useDataListener } from '@/hooks';
import { isLinkActive, isNavItemActive } from '@/utils/menuConfig';
import { telHref } from '@/utils/contact';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose }) => {
  useDataListener();
  const { pathname } = useLocation();
  const companyInfo = companyService.getCompanyInfo();
  const items = companyService.getNavigation().desktop;
  // Accordion: undefined = default (the item holding the current page is open), '' = everything closed.
  const [expandedId, setExpandedId] = useState<string | undefined>(undefined);
  const openId = expandedId ?? items.find((item) => item.children.length > 0 && isNavItemActive(pathname, item))?.id;

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
          <Logo variant="dark" size="sm" showTagline={false} />
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-slate-500 hover:text-navy-900 focus:outline-none"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-2">
          {items.map((item) => {
            const active = isNavItemActive(pathname, item);
            const rowClass = `block flex-1 px-4 py-4 text-base font-medium transition-colors ${active ? 'text-gold-500 bg-gold-50/30' : 'text-navy-800'}`;
            if (item.children.length === 0) {
              return (
                <div key={item.id} className="border-b border-slate-50">
                  <SiteLink item={item} active={isLinkActive(pathname, item)} onClick={onClose} className={rowClass}>
                    {item.label}
                  </SiteLink>
                </div>
              );
            }
            const expanded = openId === item.id;
            const panelId = `drawer-submenu-${item.id}`;
            return (
              <div key={item.id} className="border-b border-slate-50">
                <div className={`flex items-stretch ${active ? 'bg-gold-50/30' : ''}`}>
                  <SiteLink item={item} active={isLinkActive(pathname, item)} onClick={onClose} className={rowClass}>
                    {item.label}
                  </SiteLink>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    aria-label={`${expanded ? 'Thu gọn' : 'Mở'} menu con của ${item.label}`}
                    onClick={() => setExpandedId(expanded ? '' : item.id)}
                    className="px-4 text-slate-500 hover:text-navy-900 focus:outline-none"
                  >
                    <ChevronDown className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                {expanded && (
                  <ul id={panelId} className="bg-slate-50/70 pb-1">
                    {item.children.map((child) => (
                      <li key={child.id}>
                        <SiteLink
                          item={child}
                          active={isLinkActive(pathname, child)}
                          onClick={onClose}
                          className={`block pl-8 pr-4 py-3 text-sm transition-colors ${
                            isLinkActive(pathname, child) ? 'text-gold-500 font-semibold' : 'text-navy-700'
                          }`}
                        >
                          {child.label}
                        </SiteLink>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 mt-auto">
          <div className="space-y-3 mb-4">
            <a href={telHref(companyInfo.hotline)} className="flex items-center text-navy-800">
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
