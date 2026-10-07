import React, { useState } from 'react';
import { MapPin, Building2, CircleDollarSign, Search } from 'lucide-react';
import { companyService } from '@/services/companyService';
import type { PropertyFilter, PropertyType } from '@/types';
import { Button } from '@/components/common/Button';

export interface SearchFilterProps {
  onFilter: (filters: PropertyFilter) => void;
  initialFilters?: PropertyFilter;
}

export function SearchFilter({ onFilter, initialFilters }: SearchFilterProps) {
  const filterConfig = companyService.getFilterConfig();

  const [region, setRegion] = useState(initialFilters?.region ?? '');
  const [type, setType] = useState<PropertyType | ''>(initialFilters?.type ?? '');
  const [priceRange, setPriceRange] = useState(initialFilters?.priceRange ?? '');
  const [keyword, setKeyword] = useState(initialFilters?.keyword ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilter({
      region: region || undefined,
      type: type ? (type as PropertyType) : undefined,
      priceRange: priceRange || undefined,
      keyword: keyword.trim() || undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-lg border border-slate-100 py-4 px-6 w-full"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
        {/* Khu vực */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gold-500">
            <MapPin className="w-4 h-4" />
          </div>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-7 py-2.5 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:bg-white transition-all appearance-none cursor-pointer"
          >
            <option value="">Tất cả khu vực</option>
            {filterConfig.regions.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>

        {/* Loại hình dự án */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gold-500">
            <Building2 className="w-4 h-4" />
          </div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as PropertyType | '')}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-7 py-2.5 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:bg-white transition-all appearance-none cursor-pointer"
          >
            <option value="">Loại hình dự án</option>
            {filterConfig.propertyTypes.map((pt) => (
              <option key={pt.value} value={pt.value}>
                {pt.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>

        {/* Tài chính */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gold-500">
            <CircleDollarSign className="w-4 h-4" />
          </div>
          <select
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-7 py-2.5 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:bg-white transition-all appearance-none cursor-pointer"
          >
            <option value="">Khoảng tài chính</option>
            {filterConfig.priceRanges.map((pr) => (
              <option key={pr.value} value={pr.value}>
                {pr.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>

        {/* Tìm theo tên */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gold-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo tên dự án..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:bg-white transition-all"
          />
        </div>

        {/* Nút tìm kiếm */}
        <div>
          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={<Search className="w-4 h-4" />}
            className="w-full font-semibold shadow-md shadow-gold-500/20"
          >
            TÌM KIẾM
          </Button>
        </div>
      </div>
    </form>
  );
}
