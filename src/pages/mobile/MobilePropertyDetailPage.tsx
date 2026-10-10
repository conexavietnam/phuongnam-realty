import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Expand, Phone, MessageSquare } from 'lucide-react';
import { MobileLayout } from '@/layouts/MobileLayout';
import { MobilePropertyCard } from '@/components/mobile/MobilePropertyCard';
import { MobileImageGallery } from '@/components/mobile/MobileImageGallery';
import { MobileNotFoundPage } from './MobileNotFoundPage';
import { propertyService } from '@/services/propertyService';
import { companyService } from '@/services/companyService';
import { Badge } from '@/components/common/Badge';
import { renderRichHtml } from '@/utils/richText';

export function MobilePropertyDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const property = propertyService.getBySlug(slug || '');
  const [showGallery, setShowGallery] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!property) return <MobileNotFoundPage />;

  const promoted = property.consignmentStatus !== undefined;
  const agent = companyService.getAgentById(property.agentId);
  const relatedProperties = propertyService.getFeatured().filter(p => p.id !== property.id);

  return (
    <MobileLayout>
      {/* Hero Image */}
      <div className="relative w-full h-64 bg-slate-200" onClick={() => setShowGallery(true)}>
        <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" />
        <Badge variant="gold">{property.type}</Badge>
        {property.consignmentStatus === 'sold' && (
          <span className="absolute top-4 right-4 z-10 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-bold">Đã giao dịch</span>
        )}
        <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
          <Expand className="w-3 h-3" />
          <span>1/{property.images.length}</span>
        </div>
      </div>

      <div className="px-4 py-6">
        <div className="text-2xl font-bold text-gold-500 mb-2">{property.priceDisplay}</div>
        <h1 className="text-lg font-bold text-navy-900 mb-3">{property.title}</h1>
        
        <div className="flex items-start gap-1 text-slate-500 mb-6">
          <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="text-sm">{property.location}</span>
        </div>

        {/* Specs Grid */}
        <h2 className="font-bold text-navy-900 mb-3 border-l-4 border-gold-500 pl-2">Thông tin chi tiết</h2>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[
            { label: 'Diện tích', value: property.area > 0 ? `${property.area} m²` : '' },
            { label: 'Phòng ngủ', value: property.bedrooms > 0 || !promoted ? String(property.bedrooms) : '' },
            { label: 'Phòng tắm', value: property.bathrooms > 0 || !promoted ? String(property.bathrooms) : '' },
            { label: 'Hướng', value: property.direction },
            { label: 'Pháp lý', value: property.legal },
            { label: 'Tầng', value: property.floor },
          ]
            .filter((row) => row.value !== '')
            .map((row) => (
              <div key={row.label} className="flex flex-col border-b border-slate-100 pb-2">
                <span className="text-xs text-slate-500">{row.label}</span>
                <span className="font-medium">{row.value}</span>
              </div>
            ))}
        </div>

        {/* Description */}
        <div className="mb-8">
          <h2 className="font-bold text-navy-900 mb-3 border-l-4 border-gold-500 pl-2">Mô tả</h2>
          <div
            className={`rich-content text-sm ${expanded ? '' : 'line-clamp-5'}`}
            dangerouslySetInnerHTML={{ __html: renderRichHtml(property.fullDescription) }}
          />
          <button onClick={() => setExpanded(!expanded)} className="text-gold-500 font-medium text-sm mt-2">
            {expanded ? 'Thu gọn' : 'Xem thêm'}
          </button>
        </div>

        {/* Agent Card */}
        {agent && (
          <div className="bg-slate-50 p-4 rounded-xl mb-8 border border-slate-100">
            <div className="flex items-center gap-4 mb-4">
              <img src={agent.avatar} alt={agent.name} className="w-16 h-16 rounded-full object-cover" />
              <div>
                <h3 className="font-bold text-navy-900">{agent.name}</h3>
                <p className="text-sm text-slate-500">{agent.title}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <a href={`tel:${agent.phone}`} className="flex-1 bg-navy-900 text-white py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2">
                <Phone className="w-4 h-4" /> Gọi điện
              </a>
              <a href={`https://zalo.me/${agent.phone}`} target="_blank" rel="noreferrer" className="flex-1 bg-blue-500 text-white py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2">
                <MessageSquare className="w-4 h-4" /> Zalo
              </a>
            </div>
          </div>
        )}

        {/* Related Properties */}
        <div className="mb-4">
          <h2 className="font-bold text-navy-900 mb-4 border-l-4 border-gold-500 pl-2">BĐS tương tự</h2>
          <div className="flex overflow-x-auto gap-4 scrollbar-hide pb-2">
            {relatedProperties.map(p => (
              <div key={p.id} className="w-72 flex-shrink-0">
                <MobilePropertyCard property={p} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {showGallery && (
        <MobileImageGallery 
          images={property.images} 
          initialIndex={0} 
          isOpen={showGallery}
          onClose={() => setShowGallery(false)} 
        />
      )}
    </MobileLayout>
  );
}
