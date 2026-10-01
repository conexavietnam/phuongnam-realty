import { Link } from 'react-router-dom';
import { Home, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/common/Button';

export function CTABanner() {
  const benefits = [
    'Tiếp cận khách hàng phù hợp',
    'Hỗ trợ tư vấn chuyên nghiệp',
    'Đồng hành trong quá trình giao dịch',
  ];

  return (
    <section className="w-full bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 text-white py-10 px-4 sm:px-6 lg:px-8 shadow-xl">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Left Side */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gold-500/10 text-gold-400 rounded-xl border border-gold-500/20">
              <Home className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                Bạn đang cần bán hoặc cho thuê bất động sản?
              </h2>
              <p className="text-slate-300 text-sm lg:text-base mt-1">
                Phương Nam Realty đồng hành cùng quý khách hàng kết nối người mua và người thuê nhanh chóng, an toàn.
              </p>
            </div>
          </div>

          {/* 3 Benefit Points */}
          <div className="flex flex-wrap items-center gap-y-2 gap-x-6 pt-2">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-gold-400 shrink-0" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: CTA Button */}
        <div className="shrink-0">
          <Link to="/ky-gui">
            <Button
              variant="primary"
              size="lg"
              className="font-bold tracking-wide shadow-lg shadow-gold-500/25 px-8 py-4 text-base group"
            >
              <span className="flex items-center gap-2">
                KÝ GỬI BẤT ĐỘNG SẢN
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
