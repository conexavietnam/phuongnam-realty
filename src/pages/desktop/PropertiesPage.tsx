import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDataListener } from '@/hooks';
import { DesktopLayout } from '@/layouts/DesktopLayout';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { SearchFilter } from '@/components/desktop/SearchFilter';
import { SectionTitle } from '@/components/common/SectionTitle';
import { PropertyCard } from '@/components/desktop/PropertyCard';
import { ConsignmentForm } from '@/components/desktop/ConsignmentForm';
import { Button } from '@/components/common/Button';
import { propertyService } from '@/services/propertyService';
import { companyService } from '@/services/companyService';
import { filtersFromSearchParams, searchParamsFromFilters } from '@/utils/filterQuery';
import type { PropertyFilter } from '@/types';

export function PropertiesPage() {
  const dataVersion = useDataListener();
  const [searchParams, setSearchParams] = useSearchParams();
  const [displayLimit, setDisplayLimit] = useState(8);

  const filters = useMemo(
    () => (dataVersion < 0 ? {} : filtersFromSearchParams(searchParams, companyService.getFilterConfig())),
    [searchParams, dataVersion],
  );

  const applyFilters = (next: PropertyFilter) => {
    setSearchParams(searchParamsFromFilters(next));
    setDisplayLimit(8);
  };

  const filteredProperties = useMemo(() => {
    if (dataVersion < 0) return [];
    return propertyService.filter(filters);
  }, [filters, dataVersion]);

  const featuredList = useMemo(() => {
    return filteredProperties.slice(0, displayLimit);
  }, [filteredProperties, displayLimit]);

  const similarList = useMemo(() => {
    if (dataVersion < 0) return [];
    return propertyService.getAll().slice(0, 4);
  }, [dataVersion]);

  return (
    <DesktopLayout>
      {/* Sub-banner Hero */}
      <section className="bg-navy-900 text-white min-h-[200px] flex flex-col justify-center border-b border-navy-800">
        <Breadcrumb items={[{ label: 'BĐS Chuyển nhượng' }]} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">
            BẤT ĐỘNG SẢN CHUYỂN NHƯỢNG
          </h1>
          <p className="text-slate-300 text-base max-w-3xl">
            Tìm kiếm cơ hội an cư và đầu tư sinh lời từ giỏ hàng chuyển nhượng và cho thuê được tuyển chọn kỹ lưỡng, pháp lý rõ ràng.
          </p>
        </div>
      </section>

      {/* Floating Filter Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-7 relative z-20">
        <SearchFilter key={searchParams.toString()} initialFilters={filters} onFilter={applyFilters} />
      </div>

      {/* Filtered Properties Grid */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <SectionTitle
              subtitle="GIỎ HÀNG CHỌN LỌC"
              title="BẤT ĐỘNG SẢN NỔI BẬT"
              description={`Hiển thị ${filteredProperties.length} bất động sản phù hợp với tiêu chí của bạn.`}
            />
          </div>

          {filteredProperties.length === 0 ? (
            <div className="py-16 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-slate-500 text-base mb-4">
                Không tìm thấy bất động sản nào phù hợp với bộ lọc hiện tại.
              </p>
              <Button variant="outline" size="sm" onClick={() => applyFilters({})}>
                Đặt lại bộ lọc
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredList.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>

              {displayLimit < filteredProperties.length && (
                <div className="mt-12 text-center">
                  <Button
                    variant="outline"
                    size="md"
                    className="font-semibold px-8"
                    onClick={() => setDisplayLimit((prev) => prev + 8)}
                  >
                    Xem tất cả BĐS ({filteredProperties.length}) →
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Similar Properties Section */}
      <section className="py-16 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle
            subtitle="GỢI Ý TƯƠNG TỰ"
            title="BẤT ĐỘNG SẢN TƯƠNG TỰ"
            description="Các lựa chọn được nhiều khách hàng quan tâm nhất trong tuần."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {similarList.map((prop) => (
              <PropertyCard key={prop.id} property={prop} />
            ))}
          </div>
        </div>
      </section>

      {/* Consignment CTA & Inline Form */}
      <section className="py-16 bg-navy-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5 space-y-4">
              <span className="text-gold-400 font-semibold text-sm uppercase tracking-wider">
                DỊCH VỤ KÝ GỬI
              </span>
              <h2 className="text-3xl font-bold text-white leading-tight">
                Bạn có BĐS cần bán hoặc cho thuê?
              </h2>
              <p className="text-slate-300 text-base leading-relaxed">
                Phương Nam Realty tiếp cận hàng ngàn khách hàng tiềm năng mỗi tháng, cam kết bảo mật thông tin và hỗ trợ pháp lý trọn gói từ khâu xem nhà đến lúc công chứng sang tên.
              </p>
              <ul className="space-y-3 pt-2 text-sm text-slate-200">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gold-400" />
                  Định giá thị trường chuẩn xác & miễn phí
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gold-400" />
                  Hỗ trợ chụp hình ảnh, flycam chuyên nghiệp
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gold-400" />
                  Giao dịch an toàn, pháp lý minh bạch
                </li>
              </ul>
            </div>
            <div className="lg:col-span-7">
              <ConsignmentForm />
            </div>
          </div>
        </div>
      </section>
    </DesktopLayout>
  );
}
