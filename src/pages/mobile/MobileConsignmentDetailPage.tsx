import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Expand } from 'lucide-react';
import { MobileLayout } from '@/layouts/MobileLayout';
import { MobileImageGallery } from '@/components/mobile/MobileImageGallery';
import { MobileConsignmentCard } from '@/components/mobile/MobileConsignmentCard';
import { SectionBadge } from '@/components/common/SectionBadge';
import { ConsignmentInquiryForm } from '@/components/desktop/ConsignmentInquiryForm';
import { ListingContactCta } from '@/components/desktop/ListingContactCta';
import { consignmentService } from '@/services/consignmentService';
import { renderRichHtml, stripHtml } from '@/utils/richText';
import { priceLabel } from '@/utils/consignment';
import { useDataListener } from '@/hooks';

export function MobileConsignmentDetailPage() {
  useDataListener();
  const { slug } = useParams<{ slug: string }>();
  const [showGallery, setShowGallery] = useState(false);
  const item = slug ? consignmentService.getPublicBySlug(slug) : undefined;

  if (!item) {
    return (
      <MobileLayout>
        <div className="px-6 py-20 text-center">
          <h1 className="text-xl font-bold text-navy-900 mb-2">Không tìm thấy tin ký gửi</h1>
          <p className="text-sm text-slate-500 mb-6">Tin ký gửi này không tồn tại hoặc chưa được đăng.</p>
          <Link to="/ky-gui" className="inline-block bg-gold-500 text-white font-semibold px-6 py-2.5 rounded-lg text-sm">
            Xem các tin ký gửi khác
          </Link>
        </div>
      </MobileLayout>
    );
  }

  const images = item.images.length > 0 ? item.images : item.thumbnail ? [item.thumbnail] : [];
  const sold = item.status === 'sold';
  const hasArticle = stripHtml(item.fullDescription) !== '' || /<img\b/i.test(item.fullDescription);
  const related = consignmentService.getRelated(item, 3);

  return (
    <MobileLayout>
      <div className="relative w-full h-64 bg-slate-200" onClick={() => images.length > 0 && setShowGallery(true)}>
        {images[0] && <img src={images[0]} alt={item.title} className="w-full h-full object-cover" />}
        <SectionBadge kind="consignment" className="absolute top-3 left-3" />
        {sold && (
          <span className="absolute top-3 right-3 z-10 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-bold">
            Đã giao dịch
          </span>
        )}
        {images.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
            <Expand className="w-3 h-3" />
            <span>1/{images.length}</span>
          </div>
        )}
      </div>

      <div className="px-4 py-6">
        <div className="text-2xl font-bold text-gold-500 mb-2">{priceLabel(item)}</div>
        <h1 className="text-lg font-bold text-navy-900 mb-3">{item.title}</h1>
        {item.location && (
          <div className="flex items-start gap-1 text-slate-500 mb-6">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="text-sm">{item.location}</span>
          </div>
        )}

        <h2 className="font-bold text-navy-900 mb-3 border-l-4 border-gold-500 pl-2">Thông tin chi tiết</h2>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {consignmentService.getFacts(item).map((fact) => (
            <div key={fact.label} className="flex flex-col border-b border-slate-100 pb-2">
              <span className="text-xs text-slate-500">{fact.label}</span>
              <span className="font-medium text-sm">{fact.value}</span>
            </div>
          ))}
        </div>

        <div className="mb-8">
          <h2 className="font-bold text-navy-900 mb-3 border-l-4 border-gold-500 pl-2">Mô tả</h2>
          {item.shortDescription && <p className="text-sm text-slate-600 mb-4 leading-relaxed">{item.shortDescription}</p>}
          {hasArticle && (
            <div className="rich-content text-sm" dangerouslySetInnerHTML={{ __html: renderRichHtml(item.fullDescription) }} />
          )}
        </div>

        <div className="space-y-6 mb-8">
          <ListingContactCta />
          <ConsignmentInquiryForm listing={item} />
        </div>

        {related.length > 0 && (
          <div>
            <h2 className="font-bold text-navy-900 mb-4 border-l-4 border-gold-500 pl-2">Tin ký gửi khác</h2>
            {related.map((other) => (
              <MobileConsignmentCard key={other.id} item={other} />
            ))}
          </div>
        )}
      </div>

      {showGallery && (
        <MobileImageGallery images={images} initialIndex={0} isOpen={showGallery} onClose={() => setShowGallery(false)} />
      )}
    </MobileLayout>
  );
}
