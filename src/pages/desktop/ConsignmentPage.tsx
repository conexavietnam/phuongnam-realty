import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, Sparkles, Handshake } from 'lucide-react';
import { DesktopLayout } from '@/layouts/DesktopLayout';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { SectionTitle } from '@/components/common/SectionTitle';
import { ConsignmentForm } from '@/components/desktop/ConsignmentForm';
import { Button } from '@/components/common/Button';
import { SearchFilter } from '@/components/desktop/SearchFilter';
import { ConsignmentCard } from '@/components/desktop/ConsignmentCard';
import { companyService } from '@/services/companyService';
import { consignmentService } from '@/services/consignmentService';
import { filtersFromSearchParams, searchParamsFromFilters } from '@/utils/filterQuery';
import type { PropertyFilter } from '@/types';
import { useDataListener } from '@/hooks';

const PAGE_SIZE = 9;

export function ConsignmentPage() {
  const dataVersion = useDataListener();
  const [searchParams, setSearchParams] = useSearchParams();
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);

  const filters = useMemo(
    () => (dataVersion < 0 ? {} : filtersFromSearchParams(searchParams, companyService.getFilterConfig())),
    [searchParams, dataVersion],
  );
  const filtered = useMemo(
    () => (dataVersion < 0 ? [] : consignmentService.filter(filters)),
    [filters, dataVersion],
  );
  const hasFilters = Object.values(filters).some(Boolean);

  const applyFilters = (next: PropertyFilter) => {
    setSearchParams(searchParamsFromFilters(next));
    setDisplayLimit(PAGE_SIZE);
  };

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
        <Breadcrumb items={[{ label: 'Ký gửi' }]} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">
            KÝ GỬI BẤT ĐỘNG SẢN
          </h1>
          <p className="text-slate-300 text-base max-w-3xl">
            Dịch vụ ký gửi mua bán, cho thuê bất động sản nhanh chóng, bảo mật thông tin và tối ưu hóa lợi nhuận cho quý khách hàng.
          </p>
        </div>
      </section>

      {/* Floating Filter Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-7 relative z-20">
        <SearchFilter key={searchParams.toString()} initialFilters={filters} onFilter={applyFilters} />
      </div>

      {/* Published consignment listings */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle
            subtitle="TIN KÝ GỬI"
            title="BẤT ĐỘNG SẢN KÝ GỬI"
            description={`Hiển thị ${filtered.length} tin ký gửi đã được Phương Nam Realty thẩm định và đăng tải.`}
            centered
          />

          {filtered.length === 0 ? (
            <div className="py-16 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-slate-500 text-base mb-4">
                {hasFilters ? 'Không có tin ký gửi nào phù hợp với bộ lọc hiện tại.' : 'Hiện chưa có tin ký gửi nào được đăng.'}
              </p>
              {hasFilters && (
                <Button variant="outline" size="sm" onClick={() => applyFilters({})}>
                  Đặt lại bộ lọc
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filtered.slice(0, displayLimit).map((item) => (
                  <ConsignmentCard key={item.id} item={item} />
                ))}
              </div>
              {displayLimit < filtered.length && (
                <div className="mt-12 text-center">
                  <Button variant="outline" size="md" className="font-semibold px-8" onClick={() => setDisplayLimit((prev) => prev + PAGE_SIZE)}>
                    Xem thêm ({filtered.length - displayLimit}) →
                  </Button>
                </div>
              )}
            </>
          )}
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
