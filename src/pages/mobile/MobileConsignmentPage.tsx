import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sliders } from 'lucide-react';
import { MobileLayout } from '@/layouts/MobileLayout';
import { ConsignmentForm } from '@/components/desktop/ConsignmentForm';
import { MobileConsignmentCard } from '@/components/mobile/MobileConsignmentCard';
import { MobileSearchFilter } from '@/components/mobile/MobileSearchFilter';
import { Button } from '@/components/common/Button';
import { companyService } from '@/services/companyService';
import { consignmentService } from '@/services/consignmentService';
import { filtersFromSearchParams, searchParamsFromFilters } from '@/utils/filterQuery';
import type { PropertyFilter } from '@/types';
import { useDataListener } from '@/hooks';

const PAGE_SIZE = 8;

export function MobileConsignmentPage() {
  const dataVersion = useDataListener();
  const [showFilter, setShowFilter] = useState(false);
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

  return (
    <MobileLayout>
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy-900 border-l-4 border-gold-500 pl-2">Ký gửi BĐS</h1>
        <button
          type="button"
          aria-label="Bộ lọc"
          onClick={() => setShowFilter(true)}
          className="p-2 text-navy-900 hover:bg-slate-100 rounded-full"
        >
          <Sliders className="w-5 h-5" />
        </button>
      </div>
      <p className="px-4 text-slate-600 text-sm mb-2">
        Các tin ký gửi đã được Phương Nam Realty thẩm định. Muốn ký gửi bất động sản của bạn? Điền form ở cuối trang.
      </p>

      {filtered.length === 0 ? (
        <div className="mx-4 my-4 py-12 px-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p className="text-slate-500 text-sm mb-4">
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
          <div className="px-4 py-4">
            {filtered.slice(0, displayLimit).map((item) => (
              <MobileConsignmentCard key={item.id} item={item} />
            ))}
          </div>
          {displayLimit < filtered.length && (
            <div className="px-4 pb-6 flex justify-center">
              <Button variant="outline" className="w-full" onClick={() => setDisplayLimit((prev) => prev + PAGE_SIZE)}>
                Xem thêm ({filtered.length - displayLimit})
              </Button>
            </div>
          )}
        </>
      )}

      <div className="px-4 pb-8 pt-2">
        <ConsignmentForm />
      </div>

      <MobileSearchFilter
        key={searchParams.toString()}
        initialFilters={filters}
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        onFilter={applyFilters}
      />
    </MobileLayout>
  );
}
