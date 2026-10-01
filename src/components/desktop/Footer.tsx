import { Link } from 'react-router-dom';
import { Building2, MapPin, Phone, Mail, Globe } from 'lucide-react';
import { companyService } from '@/services/companyService';


export function Footer() {
  const companyInfo = companyService.getCompanyInfo();

  return (
    <footer className="bg-navy-900 text-slate-300 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-12">
          
          {/* Col 1: Company Info */}
          <div className="md:col-span-4">
            <Link to="/" className="flex items-center gap-2 mb-6 group">
              <div className="bg-white/10 p-2 rounded text-gold-500 group-hover:bg-gold-500 group-hover:text-white transition-colors">
                <Building2 className="w-8 h-8" />
              </div>
              <span className="font-bold text-2xl tracking-tight text-white uppercase">
                {companyInfo.name}
              </span>
            </Link>
            
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gold-500 shrink-0 mt-0.5" />
                <span>{companyInfo.address}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gold-500 shrink-0" />
                <span>{companyInfo.hotline}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gold-500 shrink-0" />
                <span>{companyInfo.email}</span>
              </li>
              <li className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-gold-500 shrink-0" />
                <span>{companyInfo.website}</span>
              </li>
            </ul>

            <div className="flex gap-4">
              <a href={companyInfo.social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold-500 hover:text-navy-950 transition-colors">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a href={companyInfo.social.youtube} target="_blank" rel="noreferrer" aria-label="YouTube" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold-500 hover:text-navy-950 transition-colors">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
              <a href={companyInfo.social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold-500 hover:text-navy-950 transition-colors">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Col 2: Categories */}
          <div className="md:col-span-5">
            <h3 className="text-white text-lg font-bold mb-6 uppercase tracking-wider relative after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-12 after:h-0.5 after:bg-gold-500">
              Danh Mục
            </h3>
            <div className="grid grid-cols-3 gap-6 mt-8">
              <div>
                <h4 className="text-white font-medium mb-4">Dự án</h4>
                <ul className="space-y-3">
                  <li><Link to="/du-an/palm-river" className="hover:text-gold-500 transition-colors">Palm River</Link></li>
                  <li><Link to="/du-an/sensa-park" className="hover:text-gold-500 transition-colors">Sensa Park</Link></li>
                  <li><Link to="/du-an/genera" className="hover:text-gold-500 transition-colors">Genera</Link></li>
                  <li><Link to="/du-an" className="hover:text-gold-500 transition-colors">Tất cả dự án</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-medium mb-4">Bất động sản</h4>
                <ul className="space-y-3">
                  <li><Link to="/bat-dong-san?type=apartment" className="hover:text-gold-500 transition-colors">Căn hộ</Link></li>
                  <li><Link to="/bat-dong-san?type=house" className="hover:text-gold-500 transition-colors">Nhà phố</Link></li>
                  <li><Link to="/bat-dong-san?type=shophouse" className="hover:text-gold-500 transition-colors">Shophouse</Link></li>
                  <li><Link to="/bat-dong-san" className="hover:text-gold-500 transition-colors">BĐS chuyển nhượng</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-medium mb-4">Khác</h4>
                <ul className="space-y-3">
                  <li><Link to="/tin-tuc" className="hover:text-gold-500 transition-colors">Tin tức</Link></li>
                  <li><Link to="/ky-gui" className="hover:text-gold-500 transition-colors">Ký gửi BĐS</Link></li>
                  <li><Link to="/lien-he" className="hover:text-gold-500 transition-colors">Liên hệ</Link></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Col 3: Map */}
          <div className="md:col-span-3">
            <h3 className="text-white text-lg font-bold mb-6 uppercase tracking-wider relative after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-12 after:h-0.5 after:bg-gold-500">
              Bản Đồ Google Maps
            </h3>
            <div className="mt-8 rounded overflow-hidden h-48 bg-slate-800 mb-4">
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
            <a 
              href={companyInfo.googleMapsLink} 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center text-gold-500 hover:text-white transition-colors"
            >
              Xem chỉ đường &rarr;
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-8 mt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-400">
          <p>&copy; 2025 Phương Nam Realty. All rights reserved.</p>
          <p>{companyInfo.slogan || "Kiến tạo giá trị – Đồng hành cùng bạn!"}</p>
        </div>
      </div>
    </footer>
  );
}
