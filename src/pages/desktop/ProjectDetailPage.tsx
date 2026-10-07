import { useParams, Link } from 'react-router-dom';
import { MapPin, Tag, ShieldCheck, Building2, CheckCircle2, PhoneCall, Bed, Maximize } from 'lucide-react';
import { DesktopLayout } from '@/layouts/DesktopLayout';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { ImageGallery } from '@/components/desktop/ImageGallery';
import { PropertyCard } from '@/components/desktop/PropertyCard';
import { Button } from '@/components/common/Button';
import { SectionTitle } from '@/components/common/SectionTitle';
import { projectService } from '@/services/projectService';
import { propertyService } from '@/services/propertyService';
import { renderRichHtml } from '@/utils/richText';

export function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const project = slug ? projectService.getBySlug(slug) : undefined;
  const relatedProperties = propertyService.getFeatured().slice(0, 3);

  if (!project) {
    return (
      <DesktopLayout>
        <div className="py-24 text-center max-w-lg mx-auto px-4">
          <h1 className="text-4xl font-bold text-navy-900 mb-4">Không tìm thấy dự án</h1>
          <p className="text-slate-500 mb-8">
            Dự án bạn đang tìm kiếm không tồn tại hoặc đã được cập nhật đường dẫn mới.
          </p>
          <Link to="/du-an">
            <Button variant="primary" size="md">
              Xem tất cả dự án
            </Button>
          </Link>
        </div>
      </DesktopLayout>
    );
  }

  return (
    <DesktopLayout>
      {/* Sub-banner Hero */}
      <section className="bg-navy-900 text-white min-h-[180px] flex flex-col justify-center border-b border-navy-800">
        <Breadcrumb
          items={[
            { label: 'Dự án phân phối', path: '/du-an' },
            { label: project.name },
          ]}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <div className="inline-block bg-gold-500/20 text-gold-400 text-xs font-semibold px-3 py-1 rounded-full mb-3 uppercase tracking-wider">
            {project.categoryLabel}
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
            {project.name}
          </h1>
          <div className="flex items-center gap-2 text-slate-300 text-sm">
            <MapPin className="w-4 h-4 text-gold-500" />
            <span>{project.location}</span>
          </div>
        </div>
      </section>

      {/* Main Project Details */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Gallery */}
          <div className="mb-12">
            <ImageGallery images={project.images} />
          </div>

          {/* Quick Info Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 lg:p-8 mb-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 text-center">
            <div>
              <span className="text-xs text-slate-400 block mb-1">MỨC GIÁ</span>
              <span className="text-gold-500 font-bold text-lg">{project.priceFrom}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-1">LOẠI HÌNH</span>
              <span className="text-navy-900 font-semibold text-sm">{project.categoryLabel}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-1">PHÒNG NGỦ</span>
              <div className="flex items-center justify-center gap-1 text-navy-900 font-semibold text-sm">
                <Bed className="w-4 h-4 text-slate-400" />
                <span>{project.bedrooms}</span>
              </div>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-1">DIỆN TÍCH</span>
              <div className="flex items-center justify-center gap-1 text-navy-900 font-semibold text-sm">
                <Maximize className="w-4 h-4 text-slate-400" />
                <span>{project.area}</span>
              </div>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-1">CHỦ ĐẦU TƯ</span>
              <span className="text-navy-900 font-semibold text-sm truncate block" title={project.investor}>
                {project.investor}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-1">TRẠNG THÁI</span>
              <span className="inline-block bg-emerald-50 text-emerald-600 text-xs font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                {project.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Description & Highlights */}
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-navy-900 mb-4 pb-2 border-b border-slate-100">
                  Mô Tả Tổng Quan
                </h2>
                <div
                  className="rich-content text-base"
                  dangerouslySetInnerHTML={{ __html: renderRichHtml(project.fullDescription) }}
                />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-navy-900 mb-4 pb-2 border-b border-slate-100">
                  Điểm Nhấn Tiêu Biểu
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {project.highlights.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <CheckCircle2 className="w-5 h-5 text-gold-500 shrink-0 mt-0.5" />
                      <span className="text-navy-900 text-sm font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar CTA Card */}
            <div>
              <div className="bg-navy-900 text-white p-8 rounded-2xl shadow-xl sticky top-24 border border-navy-800">
                <h3 className="text-xl font-bold text-white mb-2">Đăng Ký Tư Vấn</h3>
                <p className="text-slate-300 text-sm mb-6">
                  Nhận bảng giá gốc, chính sách chiết khấu và mặt bằng chi tiết của {project.name}.
                </p>
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3 text-sm text-slate-200">
                    <ShieldCheck className="w-5 h-5 text-gold-400" />
                    <span>Pháp lý minh bạch, rõ ràng</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-200">
                    <Building2 className="w-5 h-5 text-gold-400" />
                    <span>Tham quan nhà mẫu trực tiếp</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-200">
                    <Tag className="w-5 h-5 text-gold-400" />
                    <span>Chiết khấu độc quyền từ CĐT</span>
                  </div>
                </div>
                <Link to="/lien-he" className="block">
                  <Button
                    variant="primary"
                    size="lg"
                    icon={<PhoneCall className="w-5 h-5" />}
                    className="w-full font-bold shadow-lg shadow-gold-500/25"
                  >
                    LIÊN HỆ TƯ VẤN NGAY
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Properties */}
      <section className="py-16 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle
            subtitle="SẢN PHẨM CÙNG KHU VỰC"
            title="BẤT ĐỘNG SẢN LIÊN QUAN"
            description="Tham khảo thêm các căn hộ và nhà phố sẵn sàng bàn giao lân cận."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedProperties.map((prop) => (
              <PropertyCard key={prop.id} property={prop} />
            ))}
          </div>
        </div>
      </section>
    </DesktopLayout>
  );
}
