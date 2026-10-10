import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Expand } from 'lucide-react';
import { MobileLayout } from '@/layouts/MobileLayout';
import { MobileProjectCard } from '@/components/mobile/MobileProjectCard';
import { MobileImageGallery } from '@/components/mobile/MobileImageGallery';
import { MobileNotFoundPage } from './MobileNotFoundPage';
import { projectService } from '@/services/projectService';
import { Badge } from '@/components/common/Badge';
import { renderRichHtml } from '@/utils/richText';
import { typeLabel } from '@/utils/typeLabel';

export function MobileProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const project = projectService.getBySlug(slug || '');
  const [showGallery, setShowGallery] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!project) return <MobileNotFoundPage />;

  const relatedProjects = projectService.getFeatured().filter(p => p.id !== project.id);

  return (
    <MobileLayout>
      {/* Hero Image */}
      <div className="relative w-full h-64 bg-slate-200" onClick={() => setShowGallery(true)}>
        <img src={project.images[0]} alt={project.name} className="w-full h-full object-cover" />
        {project.status && <Badge variant={project.status === 'Đang mở bán' ? 'gold' : 'navy'}>{project.status}</Badge>}
        {project.consignmentStatus === 'sold' && (
          <span className="absolute top-4 right-4 z-10 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-bold">Đã giao dịch</span>
        )}
        <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
          <Expand className="w-3 h-3" />
          <span>1/{project.images.length}</span>
        </div>
      </div>

      <div className="px-4 py-6">
        <h1 className="text-xl font-bold text-navy-900 mb-2">{project.name}</h1>
        <div className="flex items-start gap-1 text-slate-500 mb-4">
          <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="text-sm">{project.location}</span>
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[
            { label: 'Giá từ', value: project.priceFrom, accent: true },
            { label: 'Loại hình', value: project.categoryLabel || typeLabel(project.category), accent: false },
            { label: 'Quy mô', value: project.area, accent: false },
            { label: 'Chủ đầu tư', value: project.investor, accent: false },
          ]
            .filter((row) => row.value)
            .map((row) => (
              <div key={row.label} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-xs text-slate-500 block mb-1">{row.label}</span>
                <span className={row.accent ? 'font-bold text-gold-500' : 'font-medium text-navy-900'}>{row.value}</span>
              </div>
            ))}
        </div>

        {/* Description */}
        <div className="mb-6">
          <h2 className="font-bold text-navy-900 mb-3 border-l-4 border-gold-500 pl-2">Tổng quan</h2>
          <div className={`rich-content text-sm ${expanded ? '' : 'line-clamp-4'}`} dangerouslySetInnerHTML={{ __html: renderRichHtml(project.fullDescription) }} />
          <button onClick={() => setExpanded(!expanded)} className="text-gold-500 font-medium text-sm mt-2">
            {expanded ? 'Thu gọn' : 'Xem thêm'}
          </button>
        </div>

        {/* Highlights */}
        {project.highlights && project.highlights.length > 0 && (
          <div className="mb-6">
            <h2 className="font-bold text-navy-900 mb-3 border-l-4 border-gold-500 pl-2">Điểm nổi bật</h2>
            <div className="flex flex-wrap gap-2">
              {project.highlights.map((h, i) => (
                <span key={i} className="bg-navy-50 text-navy-800 px-3 py-1 rounded-full text-xs font-medium">
                  {h}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Related Projects */}
        <div className="mt-8">
          <h2 className="font-bold text-navy-900 mb-4 border-l-4 border-gold-500 pl-2">Dự án liên quan</h2>
          <div className="flex overflow-x-auto gap-4 scrollbar-hide pb-2">
            {relatedProjects.map(p => (
              <div key={p.id} className="w-64 flex-shrink-0">
                <MobileProjectCard project={p} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {showGallery && (
        <MobileImageGallery 
          images={project.images} 
          initialIndex={0} 
          isOpen={showGallery}
          onClose={() => setShowGallery(false)} 
        />
      )}
    </MobileLayout>
  );
}
