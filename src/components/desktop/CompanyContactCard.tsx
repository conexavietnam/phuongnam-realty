import { Phone, Mail, MessageCircle } from 'lucide-react';
import { companyService } from '@/services/companyService';

// Contact block for listings that have no agent of their own: the company hotline and email.
export function CompanyContactCard() {
  const company = companyService.getCompanyInfo();
  const digits = company.hotline.replace(/\D/g, '');

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-100 p-6 text-center">
      <h3 className="font-semibold text-lg text-navy-900 mb-0.5">{company.name}</h3>
      <p className="text-slate-500 text-sm mb-4">Liên hệ chuyên viên tư vấn</p>
      <a
        href={`tel:${digits}`}
        className="inline-flex items-center gap-2 text-navy-900 font-bold text-base hover:text-gold-500 transition-colors mb-3"
      >
        <Phone className="w-4 h-4 text-gold-500" />
        {company.hotline}
      </a>
      <div className="flex flex-col gap-2">
        <a
          href={`https://zalo.me/${digits}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm py-2.5 rounded-lg transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Chat Zalo
        </a>
        {company.email && (
          <a
            href={`mailto:${company.email}`}
            className="flex items-center justify-center gap-2 border border-slate-200 text-navy-900 font-medium text-sm py-2.5 rounded-lg hover:border-gold-500 transition-colors"
          >
            <Mail className="w-4 h-4" />
            {company.email}
          </a>
        )}
      </div>
    </div>
  );
}
