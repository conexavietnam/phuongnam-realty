import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { companyService } from '@/services/companyService';
import type { PropertyFilter, PropertyType } from '@/types';

interface MobileSearchFilterProps {
  isOpen: boolean;
  onClose: () => void;
  onFilter: (filters: PropertyFilter) => void;
}

export const MobileSearchFilter: React.FC<MobileSearchFilterProps> = ({ 
  isOpen, 
  onClose, 
  onFilter 
}) => {
  const filterConfig = companyService.getFilterConfig();
  
  const [region, setRegion] = useState('');
  const [type, setType] = useState<PropertyType | ''>('');
  const [priceRange, setPriceRange] = useState('');
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleReset = () => {
    setRegion('');
    setType('');
    setPriceRange('');
    setKeyword('');
  };

  const handleApply = () => {
    onFilter({
      region: region || undefined,
      type: type ? (type as PropertyType) : undefined,
      priceRange: priceRange || undefined,
      keyword: keyword || undefined
    });
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div 
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-[70] transform transition-transform duration-300 ease-out max-h-[90vh] flex flex-col ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Drag Handle */}
        <div className="w-full flex justify-center pt-3 pb-2" onClick={onClose}>
          <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
        </div>
        
        {/* Header */}
        <div className="px-4 pb-3 border-b border-slate-100">
          <h2 className="text-lg font-bold text-navy-900 text-center">Lọc bất động sản</h2>
        </div>

        {/* Form Fields */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-navy-900">Khu vực</label>
            <select 
              value={region} 
              onChange={(e) => setRegion(e.target.value)}
              className="w-full h-11 bg-slate-50 border border-slate-200 rounded-lg px-3 text-slate-700 outline-none focus:border-gold-500 transition-colors"
            >
              <option value="">Tất cả khu vực</option>
              {filterConfig.regions.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-navy-900">Loại hình</label>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value as PropertyType | '')}
              className="w-full h-11 bg-slate-50 border border-slate-200 rounded-lg px-3 text-slate-700 outline-none focus:border-gold-500 transition-colors"
            >
              <option value="">Tất cả loại hình</option>
              {filterConfig.propertyTypes.map((t: any) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-navy-900">Khoảng giá</label>
            <select 
              value={priceRange} 
              onChange={(e) => setPriceRange(e.target.value)}
              className="w-full h-11 bg-slate-50 border border-slate-200 rounded-lg px-3 text-slate-700 outline-none focus:border-gold-500 transition-colors"
            >
              <option value="">Tất cả mức giá</option>
              {filterConfig.priceRanges.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-navy-900">Từ khóa</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Nhập tên dự án, đường..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 text-slate-700 outline-none focus:border-gold-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-100 flex space-x-3 pb-safe">
          <button 
            onClick={handleReset}
            className="flex-1 py-3 border border-slate-200 rounded-lg text-slate-600 font-medium active:bg-slate-50"
          >
            Đặt lại
          </button>
          <button 
            onClick={handleApply}
            className="flex-1 py-3 bg-gold-500 text-white rounded-lg font-medium shadow-sm active:bg-gold-600"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </>
  );
};
