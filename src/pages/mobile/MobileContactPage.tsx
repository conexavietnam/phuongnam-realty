import { MapPin, Phone, Mail, Share2, Video, Camera } from 'lucide-react';
import { MobileLayout } from '@/layouts/MobileLayout';
import { ContactForm } from '@/components/desktop/ContactForm';
import { companyService } from '@/services/companyService';
import { useDataListener } from '@/hooks';

export function MobileContactPage() {
  useDataListener();
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
        <ContactForm />
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
