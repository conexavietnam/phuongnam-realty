import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Bed, Bath, Maximize, Layers } from 'lucide-react';
import type { Property } from '@/types';

interface MobilePropertyCardProps {
  property: Property;
}

export const MobilePropertyCard: React.FC<MobilePropertyCardProps> = ({ property }) => {
  return (
    <Link 
      to={`/chuyen-nhuong/${property.slug}`}
      className="flex bg-white rounded-xl shadow-sm overflow-hidden p-3 mb-3 border border-slate-100 active:scale-[0.98] transition-transform"
    >
      <div className="relative shrink-0 w-32 h-32 bg-navy-950 rounded-lg overflow-hidden">
        <img 
          src={property.thumbnail} 
          alt={property.title} 
          className="w-full h-full object-cover rounded-lg"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-2 left-2 bg-gold-500/90 text-white text-[10px] font-medium px-2 py-1 rounded">
          {property.category}
        </div>
      </div>
      
      <div className="ml-3 flex flex-col justify-between flex-1 min-w-0">
        <div>
          <h3 className="font-semibold text-navy-900 text-sm leading-tight line-clamp-2 mb-1">
            {property.title}
          </h3>
          <div className="flex items-center text-slate-500 text-xs mb-1.5">
            <MapPin className="w-3 h-3 mr-1 shrink-0" />
            <span className="truncate">{property.district}, {property.location}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-slate-600 text-xs mb-2">
          <div className="flex items-center">
            <Bed className="w-3.5 h-3.5 mr-1 text-slate-400" />
            {property.bedrooms} PN
          </div>
          <div className="flex items-center">
            <Bath className="w-3.5 h-3.5 mr-1 text-slate-400" />
            {property.bathrooms} WC
          </div>
          <div className="flex items-center">
            <Maximize className="w-3.5 h-3.5 mr-1 text-slate-400" />
            {property.area} m²
          </div>
          {property.floor && (
            <div className="flex items-center truncate">
              <Layers className="w-3.5 h-3.5 mr-1 text-slate-400" />
              {property.floor}
            </div>
          )}
        </div>
        
        <div className="text-gold-500 font-bold text-sm">
          {property.priceDisplay}
        </div>
      </div>
    </Link>
  );
};
