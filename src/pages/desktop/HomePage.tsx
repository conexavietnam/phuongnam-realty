import { Link } from 'react-router-dom';
import { ArrowRight, PhoneCall } from 'lucide-react';
import { DesktopLayout } from '@/layouts/DesktopLayout';
import { HeroBanner } from '@/components/desktop/HeroBanner';
import { SectionTitle } from '@/components/common/SectionTitle';
import { ProjectCard } from '@/components/desktop/ProjectCard';
import { PropertyCard } from '@/components/desktop/PropertyCard';
import { CTABanner } from '@/components/desktop/CTABanner';
import { NewsCard } from '@/components/desktop/NewsCard';
import { Button } from '@/components/common/Button';
import { useDataListener } from '@/hooks';
import { projectService } from '@/services/projectService';
import { propertyService } from '@/services/propertyService';
import { newsService } from '@/services/newsService';

export function HomePage() {
  useDataListener();
  const featuredProjects = projectService.getFeatured();
  const featuredProperties = propertyService.getFeatured();
  const featuredNews = newsService.getFeatured(3);

  return (
    <DesktopLayout>
      {/* 1. Hero Banner */}
      <HeroBanner />

      {/* 2. Section: Dự án phân phối */}
      <section className="py-16 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle
            subtitle="DỰ ÁN NỔI BẬT"
            title="CÁC DỰ ÁN PHÂN PHỐI TIÊU BIỂU"
            description="Tuyển chọn những dự án bất động sản cao cấp, pháp lý hoàn chỉnh và tiềm năng sinh lời vượt trội."
            centered
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link to="/du-an">
              <Button variant="outline" size="md" className="font-semibold px-8 hover:shadow-md">
                <span className="flex items-center gap-2">
                  XEM TẤT CẢ DỰ ÁN
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Divider / CTA Strip */}
      <section className="bg-navy-900 text-white py-10 border-y border-gold-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h3 className="text-xl lg:text-2xl font-bold text-white mb-2">
              Bạn đang tìm kiếm bất động sản phù hợp với nhu cầu và tài chính?
            </h3>
            <p className="text-slate-300 text-sm">
              Đội ngũ chuyên viên tư vấn của Phương Nam Realty luôn sẵn sàng hỗ trợ 24/7.
            </p>
          </div>
          <Link to="/lien-he" className="shrink-0">
            <Button
              variant="primary"
              size="lg"
              icon={<PhoneCall className="w-5 h-5" />}
              className="font-bold shadow-lg shadow-gold-500/20"
            >
              LIÊN HỆ TƯ VẤN →
            </Button>
          </Link>
        </div>
      </section>

      {/* 4. Section: BĐS Chuyển nhượng */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle
            subtitle="CHUYỂN NHƯỢNG"
            title="BẤT ĐỘNG SẢN CHUYỂN NHƯỢNG"
            description="Cập nhật nguồn hàng chuyển nhượng giá tốt nhất thị trường từ các chủ nhà tin cậy."
            centered
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link to="/chuyen-nhuong">
              <Button variant="outline" size="md" className="font-semibold px-8 hover:shadow-md">
                <span className="flex items-center gap-2">
                  XEM TẤT CẢ BẤT ĐỘNG SẢN
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 5. CTABanner (Ký gửi CTA) */}
      <CTABanner />

      {/* 6. Section: Tin tức & Thị trường */}
      <section className="py-16 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle
            subtitle="TIN TỨC MỚI NHẤT"
            title="TIN TỨC & THỊ TRƯỜNG"
            description="Thông tin cập nhật nhanh chóng, phân tích chuyên sâu về quy hoạch và xu hướng địa ốc."
            centered
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredNews.map((article) => (
              <NewsCard key={article.id} article={article} />
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link to="/tin-tuc">
              <Button variant="outline" size="md" className="font-semibold px-8 hover:shadow-md">
                <span className="flex items-center gap-2">
                  XEM TẤT CẢ TIN TỨC
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </DesktopLayout>
  );
}
