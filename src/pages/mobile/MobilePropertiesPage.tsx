import { useState } from 'react';
import { Sliders } from 'lucide-react';
import { MobileLayout } from '@/layouts/MobileLayout';
import { MobilePropertyCard } from '@/components/mobile/MobilePropertyCard';
import { MobileSearchFilter } from '@/components/mobile/MobileSearchFilter';
import { Button } from '@/components/common/Button';
import { propertyService } from '@/services/propertyService';
import type { PropertyFilter } from '@/types';
import { useDataListener } from '@/hooks';

export function MobilePropertiesPage() {
  useDataListener();
  const [showFilter, setShowFilter] = useState(false);
  const properties = propertyService.getAll(); // in real app, apply filters

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

      <div className="flex flex-col gap-4 px-4 py-4">
        {properties.map(property => (
          <MobilePropertyCard key={property.id} property={property} />
        ))}
      </div>

      <div className="px-4 pb-8 flex justify-center">
        <Button variant="outline" className="w-full">Xem thêm</Button>
      </div>

      {/* Floating Filter Button */}
      <button 
        onClick={() => setShowFilter(true)}
        className="fixed bottom-20 left-4 z-40 bg-navy-900 text-white p-3 rounded-full shadow-lg flex items-center justify-center"
      >
        <Sliders className="w-5 h-5" />
      </button>

      <MobileSearchFilter 
        isOpen={showFilter} 
        onClose={() => setShowFilter(false)} 
        onFilter={(filters: PropertyFilter) => {
          console.log(filters);
          setShowFilter(false);
        }}
      />
    </MobileLayout>
  );
}
