import React, { useEffect } from 'react';
import { Phone, MessageCircle, MessageSquare, X } from 'lucide-react';
import { companyService } from '@/services/companyService';

interface MobileContactSheetProps {
  isOpen: boolean;
  onClose: () => void;
  agentName?: string;
  agentPhone?: string;
}

export const MobileContactSheet: React.FC<MobileContactSheetProps> = ({
  isOpen,
  onClose,
  agentName,
  agentPhone
}) => {
  const companyInfo = companyService.getCompanyInfo();
  
  const displayPhone = agentPhone || companyInfo.hotline;
  const displayName = agentName || companyInfo.name;
  
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

  const handleCall = () => {
    window.location.href = `tel:${displayPhone.replace(/\s/g, '')}`;
    onClose();
  };

  const handleZalo = () => {
    window.open(`https://zalo.me/${displayPhone.replace(/\s/g, '')}`, '_blank');
    onClose();
  };

  const handleSMS = () => {
    window.location.href = `sms:${displayPhone.replace(/\s/g, '')}`;
    onClose();
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <div 
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-[70] transform transition-transform duration-300 ease-out pb-safe ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="w-full flex justify-center pt-3 pb-2" onClick={onClose}>
          <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
        </div>

        <div className="p-4 flex flex-col items-center border-b border-slate-100 relative">
          <button 
            onClick={onClose}
            className="absolute top-2 right-4 p-1 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="w-16 h-16 bg-navy-100 rounded-full flex items-center justify-center mb-3">
            <span className="text-navy-900 font-bold text-xl">
              {displayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <h3 className="text-lg font-bold text-navy-900">{displayName}</h3>
          <p className="text-slate-500 text-sm mt-1">Chuyên viên tư vấn</p>
          <div className="text-gold-500 font-bold text-lg mt-1">{displayPhone}</div>
        </div>

        <div className="p-4 grid grid-cols-3 gap-4">
          <button 
            onClick={handleCall}
            className="flex flex-col items-center justify-center space-y-2 focus:outline-none"
          >
            <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center text-white shadow-sm active:bg-green-600 transition-colors">
              <Phone className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-slate-600">Gọi điện</span>
          </button>

          <button 
            onClick={handleZalo}
            className="flex flex-col items-center justify-center space-y-2 focus:outline-none"
          >
            <div className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-sm active:bg-blue-600 transition-colors">
              <MessageCircle className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-slate-600">Zalo</span>
          </button>

          <button 
            onClick={handleSMS}
            className="flex flex-col items-center justify-center space-y-2 focus:outline-none"
          >
            <div className="w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-sm active:bg-orange-600 transition-colors">
              <MessageSquare className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-slate-600">Nhắn tin</span>
          </button>
        </div>
      </div>
    </>
  );
};
