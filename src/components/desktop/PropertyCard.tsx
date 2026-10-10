import { Link } from 'react-router-dom';
import { MapPin, Bed, Maximize, Compass, ArrowRight } from 'lucide-react';
import type { Property } from '@/types';
import { Badge } from '@/components/common/Badge';
import { SectionBadge } from '@/components/common/SectionBadge';

export interface PropertyCardProps {
  property: Property;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const displayPrice = property.price > 0 ? property.priceDisplay : 'Liên hệ';

  return (
    <Link
      to={`/chuyen-nhuong/${property.slug}`}
      className="group block bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-100 flex flex-col h-full"
    >
      {/* Thumbnail with Category Badge */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-navy-950">
        <img
          src={property.thumbnail}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <Badge variant="navy">
          {property.category}
        </Badge>
        <SectionBadge kind="transfer" />
        {property.consignmentStatus === 'sold' && (
          <span className="absolute bottom-3 left-3 z-10 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-bold shadow">
            Đã giao dịch
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-grow justify-between">
        <div>
          <h3 className="font-semibold text-base lg:text-lg text-navy-900 group-hover:text-gold-500 transition-colors line-clamp-2 mb-2 leading-snug">
            {property.title}
          </h3>

          <div className="flex items-center gap-1.5 text-slate-500 text-xs sm:text-sm mb-4">
            <MapPin className="w-3.5 h-3.5 text-gold-500 shrink-0" />
            <span className="truncate">{property.location}</span>
          </div>

          {/* Specs Row */}
          <div className="flex items-center justify-between text-xs text-slate-600 py-2.5 border-y border-slate-100 mb-4">
            {property.bedrooms > 0 && (
              <div className="flex items-center gap-1" title="Số phòng ngủ">
                <Bed className="w-3.5 h-3.5 text-navy-700" />
                <span>{property.bedrooms} PN</span>
              </div>
            )}
            <div className="flex items-center gap-1" title="Diện tích">
              <Maximize className="w-3.5 h-3.5 text-navy-700" />
              <span>{property.area} m²</span>
            </div>
            {(property.floor || property.view) && (
              <div className="flex items-center gap-1 truncate max-w-[120px]" title={property.view || property.floor}>
                <Compass className="w-3.5 h-3.5 text-navy-700 shrink-0" />
                <span className="truncate">{property.floor || property.view}</span>
              </div>
            )}
          </div>
        </div>

        {/* Price & Action */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-[11px] text-slate-400 block uppercase">Mức giá</span>
            <span className="text-gold-500 font-bold text-lg leading-tight">
              {displayPrice}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-gold-500 group-hover:text-gold-600 transition-colors">
            Chi tiết
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}
