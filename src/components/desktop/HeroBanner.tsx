import { Link } from 'react-router-dom';
import { Search, Send, ChevronDown } from 'lucide-react';
import { companyService } from '@/services/companyService';
import { Button } from '@/components/common/Button';

export function HeroBanner() {
  const companyInfo = companyService.getCompanyInfo();
  const heroImage = (companyInfo as any).heroBannerImage || '/images/hero-banner.svg';

  const handleScrollDown = () => {
    window.scrollTo({
      top: window.innerHeight * 0.7,
      behavior: 'smooth',
    });
  };

  return (
    <section className="relative w-full min-h-[500px] lg:min-h-[600px] flex items-center bg-navy-900 overflow-hidden">
      {/* Background Image with Gradient Overlay */}
      <img
        src={heroImage}
        data-fallback="hero"
        alt="Phương Nam Realty Luxury Skyline"
        className="absolute inset-0 w-full h-full object-cover object-center transform scale-105 transition-transform duration-1000 ease-out"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-navy-900/95 via-navy-900/80 to-navy-900/50" />
      <div className="absolute inset-0 bg-radial from-transparent via-transparent to-navy-950/70" />

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="max-w-3xl text-left">
          {/* Brand Kicker with gold shimmer */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-400 font-semibold text-xs sm:text-sm tracking-widest uppercase mb-4">
            <span className="w-2 h-2 rounded-full bg-gold-400 animate-pulse" />
            Phương Nam Realty · Kiến Tạo Giá Trị
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4 tracking-tight">
            {companyInfo.heroTitle}
          </h1>
          <p className="text-lg lg:text-xl text-slate-200/90 leading-relaxed mb-8 max-w-2xl font-normal">
            {companyInfo.heroSubtitle}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center gap-4 mb-12">
            <Link to="/chuyen-nhuong">
              <Button
                variant="primary"
                size="lg"
                icon={<Search className="w-5 h-5" />}
                className="font-semibold shadow-xl shadow-gold-500/25 px-8"
              >
                TÌM BĐS NGAY
              </Button>
            </Link>
            <Link to="/ky-gui">
              <Button
                variant="outline"
                size="lg"
                icon={<Send className="w-5 h-5" />}
                className="border-white/80 text-white hover:bg-white hover:text-navy-900 font-semibold px-8"
              >
                KÝ GỬI BĐS
              </Button>
            </Link>
          </div>

          {/* Social Proof & Metrics Adjacency */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/15 max-w-lg mb-8">
            <div>
              <span className="block text-2xl lg:text-3xl font-bold text-gold-400 font-mono tabular-nums">10+</span>
              <span className="text-xs text-slate-300 font-medium">Năm uy tín</span>
            </div>
            <div>
              <span className="block text-2xl lg:text-3xl font-bold text-gold-400 font-mono tabular-nums">500+</span>
              <span className="text-xs text-slate-300 font-medium">Dự án chọn lọc</span>
            </div>
            <div>
              <span className="block text-2xl lg:text-3xl font-bold text-gold-400 font-mono tabular-nums">99%</span>
              <span className="text-xs text-slate-300 font-medium">Khách hàng tin tưởng</span>
            </div>
          </div>

          {/* Scroll Down Hint */}
          <button
            onClick={handleScrollDown}
            className="inline-flex items-center gap-2 text-white/70 hover:text-gold-400 text-sm transition-colors cursor-pointer group"
          >
            <ChevronDown className="w-4 h-4 animate-bounce group-hover:text-gold-400" />
            <span>Khám phá bất động sản</span>
          </button>
        </div>
      </div>
    </section>
  );
}
