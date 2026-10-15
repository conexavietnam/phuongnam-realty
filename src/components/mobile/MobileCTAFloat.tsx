import React from 'react';
import { Phone, MessageCircle } from 'lucide-react';
import { companyService } from '@/services/companyService';
import { companyContact } from '@/utils/contact';

export const MobileCTAFloat: React.FC = () => {
  const contact = companyContact(companyService.getCompanyInfo());

  const handleZaloClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open(contact.zalo, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col space-y-3">
      <button 
        onClick={handleZaloClick}
        className="w-12 h-12 bg-blue-500 rounded-full shadow-lg flex items-center justify-center text-white focus:outline-none hover:bg-blue-600 transition-colors"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      <div className="relative">
        <a 
          href={contact.tel}
          className="w-12 h-12 bg-green-500 rounded-full shadow-lg flex items-center justify-center text-white focus:outline-none hover:bg-green-600 transition-colors relative z-10"
        >
          <Phone className="w-6 h-6" />
        </a>
        <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75 z-0" />
      </div>
    </div>
  );
};
