import { Link } from 'react-router-dom';
import { MapPin, Maximize, Bed } from 'lucide-react';
import type { ConsignmentListing } from '@/types';
import { SectionBadge } from '@/components/common/SectionBadge';
import { consignmentService } from '@/services/consignmentService';
import { priceLabel } from '@/utils/consignment';

interface MobileConsignmentCardProps {
  item: ConsignmentListing;
}

export function MobileConsignmentCard({ item }: MobileConsignmentCardProps) {
  const sold = item.status === 'sold';

  return (
    <Link
      to={`/ky-gui/${item.slug}`}
      className="flex bg-white rounded-xl shadow-sm overflow-hidden p-3 mb-3 border border-slate-100 active:scale-[0.98] transition-transform"
    >
      <div className="relative shrink-0 w-32 h-32 bg-navy-950 rounded-lg overflow-hidden">
        <img
          src={item.thumbnail}
          alt={item.title}
          className={`w-full h-full object-cover rounded-lg ${sold ? 'opacity-70' : ''}`}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <SectionBadge kind="consignment" className="absolute top-2 left-2" />
        {sold && (
          <span className="absolute bottom-2 left-2 right-2 text-center bg-rose-600 text-white text-[10px] font-bold py-0.5 rounded">
            Đã giao dịch
          </span>
        )}
      </div>

      <div className="ml-3 flex flex-col justify-between flex-1 min-w-0">
        <div>
          <h3 className="font-semibold text-navy-900 text-sm leading-tight line-clamp-2 mb-1">{item.title}</h3>
          <div className="flex items-center text-slate-500 text-xs mb-1.5">
            <MapPin className="w-3 h-3 mr-1 shrink-0" />
            <span className="truncate">{item.location || consignmentService.regionLabel(item.region) || 'Đang cập nhật'}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-600 text-xs">
            <span>{consignmentService.propertyTypeLabel(item.propertyType)}</span>
            {item.area > 0 && (
              <span className="inline-flex items-center">
                <Maximize className="w-3 h-3 mr-0.5 text-slate-400" />
                {item.area} m²
              </span>
            )}
            {item.bedrooms > 0 && (
              <span className="inline-flex items-center">
                <Bed className="w-3 h-3 mr-0.5 text-slate-400" />
                {item.bedrooms}
              </span>
            )}
          </div>
        </div>
        <div className="text-gold-500 font-bold text-sm">{priceLabel(item)}</div>
      </div>
    </Link>
  );
}
