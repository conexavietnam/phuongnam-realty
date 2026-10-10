import { Link } from 'react-router-dom';
import { MapPin, Bed, Maximize, ArrowRight, Tag } from 'lucide-react';
import type { ConsignmentListing } from '@/types';
import { Badge } from '@/components/common/Badge';
import { SectionBadge } from '@/components/common/SectionBadge';
import { consignmentService } from '@/services/consignmentService';
import { priceLabel } from '@/utils/consignment';

export interface ConsignmentCardProps {
  item: ConsignmentListing;
}

export function ConsignmentCard({ item }: ConsignmentCardProps) {
  const sold = item.status === 'sold';

  return (
    <Link
      to={`/ky-gui/${item.slug}`}
      className="group block bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-100 flex flex-col h-full"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-navy-950">
        <img
          src={item.thumbnail}
          alt={item.title}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${sold ? 'opacity-70' : ''}`}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <Badge variant="navy">{consignmentService.propertyTypeLabel(item.propertyType)}</Badge>
        <SectionBadge kind="consignment" />
        {sold && (
          <span className="absolute bottom-3 left-3 z-10 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-bold shadow">
            Đã giao dịch
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col flex-grow justify-between">
        <div>
          <h3 className="font-semibold text-base lg:text-lg text-navy-900 group-hover:text-gold-500 transition-colors line-clamp-2 mb-2 leading-snug">
            {item.title}
          </h3>
          <div className="flex items-center gap-1.5 text-slate-500 text-xs sm:text-sm mb-3">
            <MapPin className="w-3.5 h-3.5 text-gold-500 shrink-0" />
            <span className="truncate">{item.location || consignmentService.regionLabel(item.region) || 'Đang cập nhật'}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600 py-2.5 border-y border-slate-100 mb-4">
            <span className="inline-flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-navy-700" />
              {item.purpose === 'cho-thue' ? 'Cho thuê' : 'Cần bán'}
            </span>
            {item.area > 0 && (
              <span className="inline-flex items-center gap-1">
                <Maximize className="w-3.5 h-3.5 text-navy-700" />
                {item.area} m²
              </span>
            )}
            {item.bedrooms > 0 && (
              <span className="inline-flex items-center gap-1">
                <Bed className="w-3.5 h-3.5 text-navy-700" />
                {item.bedrooms} PN
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-[11px] text-slate-400 block uppercase">Mức giá</span>
            <span className="text-gold-500 font-bold text-lg leading-tight">{priceLabel(item)}</span>
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
