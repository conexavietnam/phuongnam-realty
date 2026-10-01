import { Building2, MapPin, Phone, Mail, Globe, Clock, MessageSquare } from 'lucide-react';
import { companyService } from '@/services/companyService';

export function CompanyInfo() {
  const info = companyService.getCompanyInfo();

  return (
    <div className="bg-navy-900 text-white rounded-2xl p-8 shadow-xl border border-navy-800 flex flex-col justify-between h-full">
      <div>
        {/* Top: Logo & Company Name */}
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-gold-500 text-navy-950 p-2.5 rounded-xl shadow-md">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide uppercase">
              {info.name}
            </h2>
            <p className="text-xs text-gold-400 font-medium tracking-wider">
              {info.slogan}
            </p>
          </div>
        </div>

        <div className="h-px bg-white/10 my-6" />

        {/* Contact Information List */}
        <div className="space-y-4 text-sm text-slate-300">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/5 rounded-lg text-gold-400 shrink-0 mt-0.5">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block uppercase font-medium">Địa chỉ trụ sở</span>
              <span className="text-white leading-relaxed">{info.address}</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/5 rounded-lg text-gold-400 shrink-0 mt-0.5">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block uppercase font-medium">Hotline tư vấn</span>
              <a href={`tel:${info.hotline.replace(/\s+/g, '')}`} className="text-white font-semibold hover:text-gold-400 transition-colors">
                {info.hotline}
              </a>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/5 rounded-lg text-gold-400 shrink-0 mt-0.5">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block uppercase font-medium">Email liên hệ</span>
              <a href={`mailto:${info.email}`} className="text-white hover:text-gold-400 transition-colors">
                {info.email}
              </a>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/5 rounded-lg text-gold-400 shrink-0 mt-0.5">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block uppercase font-medium">Website chính thức</span>
              <a href={`https://${info.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer" className="text-white hover:text-gold-400 transition-colors">
                {info.website}
              </a>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/5 rounded-lg text-gold-400 shrink-0 mt-0.5">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block uppercase font-medium">Thời gian làm việc</span>
              <span className="text-white leading-relaxed">{info.workingHours}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Social media & Slogan */}
      <div className="mt-8 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs text-slate-400">Kết nối cùng chúng tôi:</span>
          <div className="flex items-center gap-2">
            <a href={info.social.facebook} aria-label="Facebook" className="p-2 rounded-lg bg-white/5 hover:bg-gold-500 hover:text-navy-950 transition-colors text-slate-300">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            <a href={info.social.zalo} aria-label="Zalo" className="p-2 rounded-lg bg-white/5 hover:bg-gold-500 hover:text-navy-950 transition-colors text-slate-300">
              <MessageSquare className="w-4 h-4" />
            </a>
            <a href={info.social.youtube} aria-label="YouTube" className="p-2 rounded-lg bg-white/5 hover:bg-gold-500 hover:text-navy-950 transition-colors text-slate-300">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>
            <a href={info.social.instagram} aria-label="Instagram" className="p-2 rounded-lg bg-white/5 hover:bg-gold-500 hover:text-navy-950 transition-colors text-slate-300">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
          </div>
        </div>

        <p className="text-gold-500 italic text-sm font-medium tracking-wide">
          &ldquo;Vì một cộng đồng phát triển thịnh vượng&rdquo;
        </p>
      </div>
    </div>
  );
}
