import { Link } from 'react-router-dom';
import { Search, Send, ChevronDown } from 'lucide-react';
import { companyService } from '@/services/companyService';
import { Button } from '@/components/common/Button';

export function HeroBanner() {
  const companyInfo = companyService.getCompanyInfo();

  const handleScrollDown = () => {
    window.scrollTo({
      top: window.innerHeight * 0.7,
      behavior: 'smooth',
    });
  };

  return (
    <section className="relative w-full min-h-[500px] lg:min-h-[600px] flex items-center bg-navy-900 overflow-hidden">
      {/* Background Image with Gradient Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://placehold.co/1920x800/0A192F/D49B42?text=Hero+Banner')`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-navy-900/90 via-navy-900/80 to-navy-900/60" />

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-3xl text-left">
          <span className="inline-block text-gold-400 font-semibold text-sm sm:text-base tracking-widest uppercase mb-3">
            PHƯƠNG NAM REALTY
          </span>
          <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
            {companyInfo.heroTitle}
          </h1>
          <p className="text-lg lg:text-xl text-white/80 leading-relaxed mb-8">
            {companyInfo.heroSubtitle}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center gap-4 mb-12">
            <Link to="/chuyen-nhuong">
              <Button
                variant="primary"
                size="lg"
                icon={<Search className="w-5 h-5" />}
                className="font-semibold shadow-lg shadow-gold-500/20"
              >
                TÌM BĐS
              </Button>
            </Link>
            <Link to="/ky-gui">
              <Button
                variant="outline"
                size="lg"
                icon={<Send className="w-5 h-5" />}
                className="border-white/80 text-white hover:bg-white hover:text-navy-900 font-semibold"
              >
                KÝ GỬI BĐS
              </Button>
            </Link>
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
