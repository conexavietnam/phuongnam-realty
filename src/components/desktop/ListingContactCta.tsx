import { Phone, MessageCircle } from 'lucide-react';
import { companyService } from '@/services/companyService';

// Public contact block for a consignment listing: the consignor's own details are never shown.
export function ListingContactCta() {
  const company = companyService.getCompanyInfo();
  const digits = company.hotline.replace(/\D/g, '');

  return (
    <div className="bg-navy-900 text-white rounded-2xl p-6">
      <span className="text-xs uppercase tracking-wider text-gold-400 block mb-1">Liên hệ tư vấn tin này</span>
      <p className="text-sm text-slate-300 mb-4">
        Thông tin chủ sở hữu được bảo mật. Phương Nam Realty làm đầu mối kết nối và hỗ trợ giao dịch.
      </p>
      <a
        href={`tel:${digits}`}
        className="flex items-center justify-center gap-2 w-full bg-gold-500 hover:bg-gold-600 text-white font-bold py-3 rounded-lg transition-colors"
      >
        <Phone className="w-4 h-4" />
        Hotline {company.hotline}
      </a>
      <a
        href={`https://zalo.me/${digits}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-2 w-full mt-3 border border-white/30 hover:bg-white/10 text-white font-semibold py-3 rounded-lg transition-colors"
      >
        <MessageCircle className="w-4 h-4" />
        Chat Zalo
      </a>
    </div>
  );
}
