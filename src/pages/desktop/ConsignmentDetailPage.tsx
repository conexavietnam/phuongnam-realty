import { useParams, Link, Navigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { DesktopLayout } from '@/layouts/DesktopLayout';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { SectionTitle } from '@/components/common/SectionTitle';
import { SectionBadge } from '@/components/common/SectionBadge';
import { Button } from '@/components/common/Button';
import { ImageGallery } from '@/components/desktop/ImageGallery';
import { ConsignmentCard } from '@/components/desktop/ConsignmentCard';
import { ConsignmentInquiryForm } from '@/components/desktop/ConsignmentInquiryForm';
import { ListingContactCta } from '@/components/desktop/ListingContactCta';
import { consignmentService } from '@/services/consignmentService';
import { renderRichHtml, stripHtml } from '@/utils/richText';
import { listingUrl, priceLabel } from '@/utils/consignment';
import { useDataListener } from '@/hooks';

export function ConsignmentDetailPage() {
  useDataListener();
  const { slug } = useParams<{ slug: string }>();
  const item = slug ? consignmentService.getPublicBySlug(slug) : undefined;

  if (!item) {
    return (
      <DesktopLayout>
        <div className="py-24 text-center max-w-lg mx-auto px-4">
          <h1 className="text-4xl font-bold text-navy-900 mb-4">Không tìm thấy tin ký gửi</h1>
          <p className="text-slate-500 mb-8">Tin ký gửi này không tồn tại hoặc chưa được đăng.</p>
          <Link to="/ky-gui">
            <Button variant="primary" size="md">Xem các tin ký gửi khác</Button>
          </Link>
        </div>
      </DesktopLayout>
    );
  }

  // Old or shared /ky-gui links keep working after a listing moves to another section.
  if (item.section !== 'ky-gui') return <Navigate to={listingUrl(item)} replace />;

  const images = item.images.length > 0 ? item.images : item.thumbnail ? [item.thumbnail] : [];
  const sold = item.status === 'sold';
  const hasArticle = stripHtml(item.fullDescription) !== '' || /<img\b/i.test(item.fullDescription);
  const related = consignmentService.getRelated(item, 3);

  return (
    <DesktopLayout>
      <section className="bg-navy-900 text-white min-h-[160px] flex flex-col justify-center border-b border-navy-800">
        <Breadcrumb items={[{ label: 'Ký gửi', path: '/ky-gui' }, { label: item.title }]} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
          <div className="flex items-center gap-3 mb-2">
            <SectionBadge kind="consignment" className="static" />
            {sold && <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-bold">Đã giao dịch</span>}
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2 leading-tight">{item.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-slate-300 text-sm">
            {item.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-gold-500" />
                {item.location}
              </span>
            )}
            <span className="text-gold-400 font-bold">{priceLabel(item)}</span>
            {item.area > 0 && <span>{item.area} m²</span>}
          </div>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
            <div className="lg:col-span-7">
              <ImageGallery images={images} />
            </div>
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <span className="text-xs uppercase tracking-wider text-slate-400 block mb-1">Mức giá</span>
                <div className="text-3xl font-extrabold text-gold-500">{priceLabel(item)}</div>
              </div>
              <ListingContactCta />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              <h2 className="text-2xl font-bold text-navy-900 mb-6 pb-2 border-b border-slate-100">THÔNG TIN CHI TIẾT</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 bg-slate-50 p-6 rounded-2xl border border-slate-100 text-sm mb-12">
                {consignmentService.getFacts(item).map((fact) => (
                  <div key={fact.label} className="flex justify-between gap-4 py-2 border-b border-slate-200/60">
                    <span className="text-slate-500">{fact.label}</span>
                    <span className="font-semibold text-navy-900 text-right">{fact.value}</span>
                  </div>
                ))}
              </div>

              <h2 className="text-2xl font-bold text-navy-900 mb-6 pb-2 border-b border-slate-100">MÔ TẢ CHI TIẾT</h2>
              {item.shortDescription && <p className="text-slate-600 mb-6 leading-relaxed">{item.shortDescription}</p>}
              {hasArticle && (
                <div
                  className="rich-content text-base"
                  dangerouslySetInnerHTML={{ __html: renderRichHtml(item.fullDescription) }}
                />
              )}
            </div>
            <aside className="lg:col-span-4">
              <div className="lg:sticky lg:top-24">
                <ConsignmentInquiryForm listing={item} />
              </div>
            </aside>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="py-16 bg-slate-50 border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionTitle subtitle="GỢI Ý THÊM" title="TIN KÝ GỬI KHÁC" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map((other) => (
                <ConsignmentCard key={other.id} item={other} />
              ))}
            </div>
          </div>
        </section>
      )}
    </DesktopLayout>
  );
}
