import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sliders } from 'lucide-react';
import { MobileLayout } from '@/layouts/MobileLayout';
import { MobilePropertyCard } from '@/components/mobile/MobilePropertyCard';
import { MobileSearchFilter } from '@/components/mobile/MobileSearchFilter';
import { Button } from '@/components/common/Button';
import { propertyService } from '@/services/propertyService';
import { companyService } from '@/services/companyService';
import { filtersFromSearchParams, searchParamsFromFilters } from '@/utils/filterQuery';
import type { PropertyFilter } from '@/types';
import { useDataListener } from '@/hooks';

export function MobilePropertiesPage() {
  const dataVersion = useDataListener();
  const [showFilter, setShowFilter] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [displayLimit, setDisplayLimit] = useState(8);

  const filters = useMemo(
    () => (dataVersion < 0 ? {} : filtersFromSearchParams(searchParams, companyService.getFilterConfig())),
    [searchParams, dataVersion],
  );
  const filtered = useMemo(() => {
    if (dataVersion < 0) return [];
    return propertyService.filter(filters);
  }, [filters, dataVersion]);
  const properties = filtered.slice(0, displayLimit);

  const applyFilters = (next: PropertyFilter) => {
    setSearchParams(searchParamsFromFilters(next));
    setDisplayLimit(8);
  };

  const resetFilters = () => applyFilters({});

  return (
    <MobileLayout>
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy-900 border-l-4 border-gold-500 pl-2">BĐS chuyển nhượng</h1>
        <button 
          onClick={() => setShowFilter(true)}
          className="p-2 text-navy-900 hover:bg-slate-100 rounded-full"
        >
          <Sliders className="w-5 h-5" />
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="mx-4 my-4 py-12 px-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p className="text-slate-500 text-sm mb-4">
            Không tìm thấy bất động sản nào phù hợp với bộ lọc hiện tại.
          </p>
          <Button variant="outline" size="sm" onClick={resetFilters}>
            Đặt lại bộ lọc
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 px-4 py-4">
            {properties.map(property => (
              <MobilePropertyCard key={property.id} property={property} />
            ))}
          </div>

          {displayLimit < filtered.length && (
            <div className="px-4 pb-8 flex justify-center">
              <Button variant="outline" className="w-full" onClick={() => setDisplayLimit((prev) => prev + 8)}>
                Xem thêm ({filtered.length - displayLimit})
              </Button>
            </div>
          )}
        </>
      )}

      {/* Floating Filter Button */}
      <button 
        onClick={() => setShowFilter(true)}
        className="fixed bottom-20 left-4 z-40 bg-navy-900 text-white p-3 rounded-full shadow-lg flex items-center justify-center"
      >
        <Sliders className="w-5 h-5" />
      </button>

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
