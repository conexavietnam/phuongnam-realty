import { Link } from 'react-router-dom';
import { PhoneCall } from 'lucide-react';
import { DesktopLayout } from '@/layouts/DesktopLayout';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { SectionTitle } from '@/components/common/SectionTitle';
import { ProjectCard } from '@/components/desktop/ProjectCard';
import { PropertyCard } from '@/components/desktop/PropertyCard';
import { Button } from '@/components/common/Button';
import { projectService } from '@/services/projectService';
import { propertyService } from '@/services/propertyService';

export function ProjectsPage() {
  const projects = projectService.getAll();
  const relatedProperties = propertyService.getFeatured().slice(0, 3);

  return (
    <DesktopLayout>
      {/* Sub-banner Hero */}
      <section className="bg-navy-900 text-white min-h-[200px] flex flex-col justify-center border-b border-navy-800">
        <Breadcrumb items={[{ label: 'Dự án phân phối' }]} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">
            DỰ ÁN PHÂN PHỐI
          </h1>
          <p className="text-slate-300 text-base max-w-3xl">
            Danh mục các dự án bất động sản chiến lược được phân phối chính thức bởi Phương Nam Realty với chính sách ưu đãi và pháp lý an toàn.
          </p>
        </div>
      </section>

      {/* Projects Grid */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle
            subtitle="DANH MỤC DỰ ÁN"
            title="CÁC DỰ ÁN PHÂN PHỐI TIÊU BIỂU"
            description="Tìm hiểu thông tin quy hoạch, bảng giá và tiến độ xây dựng mới nhất của từng dự án."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      </section>

      {/* Related Properties Section */}
      <section className="py-16 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <SectionTitle
              subtitle="GỢI Ý DÀNH CHO BẠN"
              title="BẤT ĐỘNG SẢN LIÊN QUAN"
              description="Những căn hộ và biệt thự chuyển nhượng nổi bật tại các khu đô thị lớn."
            />
            <Link to="/lien-he">
              <Button
                variant="primary"
                size="md"
                icon={<PhoneCall className="w-4 h-4" />}
                className="font-bold shadow-md shadow-gold-500/20"
              >
                LIÊN HỆ TƯ VẤN →
              </Button>
            </Link>
          </div>

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
