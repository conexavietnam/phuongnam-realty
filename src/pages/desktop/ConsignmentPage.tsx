import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Handshake } from 'lucide-react';
import { DesktopLayout } from '@/layouts/DesktopLayout';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { SectionTitle } from '@/components/common/SectionTitle';
import { ConsignmentForm } from '@/components/desktop/ConsignmentForm';
import { Badge } from '@/components/common/Badge';
import { companyService } from '@/services/companyService';

export function ConsignmentPage() {
  const consignments = companyService.getConsignments();

  const benefits = [
    {
      icon: <Sparkles className="w-6 h-6 text-gold-500" />,
      title: 'Đăng Tin Miễn Phí',
      desc: 'Hỗ trợ chụp ảnh, quay video clip thực tế và đăng tải tiếp thị hoàn toàn miễn phí trên toàn bộ hệ sinh thái của Phương Nam Realty.',
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-gold-500" />,
      title: 'Tư Vấn Chuyên Nghiệp',
      desc: 'Định giá sát với thực tế thị trường, hỗ trợ hoàn tất đầy đủ mọi thủ tục pháp lý, kiểm tra quy hoạch và soạn thảo hợp đồng.',
    },
    {
      icon: <Handshake className="w-6 h-6 text-gold-500" />,
      title: 'Kết Nối Hiệu Quả',
      desc: 'Tiếp cận ngay mạng lưới hơn 10.000 khách hàng và nhà đầu tư tiềm năng đang có nhu cầu thực tế, chốt giao dịch nhanh gọn.',
    },
  ];

  return (
    <DesktopLayout>
      {/* Sub-banner Hero */}
      <section className="bg-navy-900 text-white min-h-[200px] flex flex-col justify-center border-b border-navy-800">
        <Breadcrumb items={[{ label: 'Ký gửi bất động sản' }]} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">
            DỰ ÁN KÝ GỬI
          </h1>
          <p className="text-slate-300 text-base max-w-3xl">
            Dịch vụ ký gửi mua bán, cho thuê bất động sản nhanh chóng, bảo mật thông tin và tối ưu hóa lợi nhuận cho quý khách hàng.
          </p>
        </div>
      </section>

      {/* Consignment Projects Grid */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle
            subtitle="DANH SÁCH DỰ ÁN"
            title="DỰ ÁN KÝ GỬI TIÊU BIỂU"
            description="Các dự án trọng điểm đang được Phương Nam Realty hỗ trợ ký gửi và chuyển nhượng sôi động."
            centered
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {consignments.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-100 flex flex-col group"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                  <img
                    src={item.thumbnail}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <Badge variant="navy">
                    {item.category === 'can-ho' ? 'Căn hộ' : item.category === 'biet-thu' ? 'Biệt thự' : 'Đất nền'}
                  </Badge>
                </div>

                <div className="p-6 flex flex-col flex-1 justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-navy-900 group-hover:text-gold-500 transition-colors mb-2 line-clamp-1">
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                      <MapPin className="w-4 h-4 text-gold-500 shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>
                    <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed mb-6">
                      {item.shortDescription}
                    </p>
                  </div>

                  <Link
                    to="/chuyen-nhuong"
                    className="inline-flex items-center justify-between text-sm font-semibold text-gold-500 hover:text-gold-600 pt-3 border-t border-slate-100 transition-colors"
                  >
                    <span>Xem sản phẩm chuyển nhượng</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Consignment Registration Section */}
      <section className="py-16 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left Column: Benefits */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="text-gold-500 text-sm font-semibold uppercase tracking-wider block mb-2">
                  HỢP TÁC CÙNG PHƯƠNG NAM REALTY
                </span>
                <h2 className="text-3xl font-bold text-navy-900 leading-tight mb-4">
                  Đăng Ký Ký Gửi Dự Án
                </h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Chúng tôi cam kết hỗ trợ tối đa quý chủ nhà thẩm định giá, hoàn thiện hồ sơ và kết nối đúng đối tượng khách hàng trong thời gian ngắn nhất.
                </p>
              </div>

              <div className="space-y-4 pt-4">
                {benefits.map((b, idx) => (
                  <div key={idx} className="flex gap-4 p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                    <div className="p-2.5 bg-gold-50 rounded-lg shrink-0 h-fit">
                      {b.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-navy-900 text-base mb-1">{b.title}</h4>
                      <p className="text-slate-500 text-xs leading-relaxed">{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-navy-900 text-white rounded-xl flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-gold-400 shrink-0" />
                <span className="text-xs text-slate-200">
                  Cam kết bảo mật danh tính & thông tin sản phẩm của quý khách hàng tuyệt đối.
                </span>
              </div>
            </div>

            {/* Right Column: ConsignmentForm */}
            <div className="lg:col-span-7">
              <ConsignmentForm />
            </div>
          </div>
        </div>
      </section>
    </DesktopLayout>
  );
}
