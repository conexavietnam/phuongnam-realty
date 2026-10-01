import { MapPin, Phone, Mail, Share2, Video, Camera } from 'lucide-react';
import { MobileLayout } from '@/layouts/MobileLayout';
import { FormInput } from '@/components/common/FormInput';
import { FormTextarea } from '@/components/common/FormTextarea';
import { Button } from '@/components/common/Button';
import { companyService } from '@/services/companyService';

export function MobileContactPage() {
  const companyInfo = companyService.getCompanyInfo();

  return (
    <MobileLayout>
      {/* Company Info */}
      <div className="px-4 py-6">
        <div className="bg-navy-900 rounded-xl p-5 text-white">
          <h1 className="text-xl font-bold uppercase mb-1">{companyInfo.name}</h1>
          <p className="text-gold-500 text-sm mb-6">{companyInfo.slogan}</p>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gold-500 shrink-0 mt-0.5" />
              <span className="text-sm text-slate-300">{companyInfo.address}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gold-500 shrink-0" />
              <span className="text-sm font-bold">{companyInfo.hotline}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gold-500 shrink-0" />
              <span className="text-sm text-slate-300">{companyInfo.email}</span>
            </div>
          </div>

          <div className="flex gap-4 border-t border-white/10 pt-4">
            <a href={companyInfo.social.facebook} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold-500 transition-colors">
              <Share2 className="w-5 h-5" />
            </a>
            <a href={companyInfo.social.youtube} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold-500 transition-colors">
              <Video className="w-5 h-5" />
            </a>
            <a href={companyInfo.social.instagram} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold-500 transition-colors">
              <Camera className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>

      {/* Contact Form */}
      <div className="px-4 pb-8">
        <h2 className="font-bold text-navy-900 mb-4 border-l-4 border-gold-500 pl-2">Gửi tin nhắn cho chúng tôi</h2>
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <FormInput label="Họ và tên" placeholder="Nhập họ và tên" />
          <FormInput label="Số điện thoại" placeholder="Nhập số điện thoại" type="tel" />
          <FormInput label="Email" placeholder="Nhập địa chỉ email" type="email" />
          <FormTextarea label="Nội dung" placeholder="Nhập nội dung cần tư vấn..." />
          <Button variant="primary" className="w-full py-4 text-base">GỬI TIN NHẮN</Button>
        </form>
      </div>

      {/* Maps */}
      <div className="w-full h-48 bg-slate-200">
        <iframe 
          src={companyInfo.googleMapsEmbed}
          width="100%" 
          height="100%" 
          style={{ border: 0 }} 
          allowFullScreen 
          loading="lazy" 
          referrerPolicy="no-referrer-when-downgrade"
          title="Google Maps"
        ></iframe>
      </div>
    </MobileLayout>
  );
}
