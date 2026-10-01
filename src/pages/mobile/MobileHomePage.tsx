
import { Link } from 'react-router-dom';
import { MobileLayout } from '@/layouts/MobileLayout';
import { MobileProjectCard } from '@/components/mobile/MobileProjectCard';
import { MobilePropertyCard } from '@/components/mobile/MobilePropertyCard';
import { MobileNewsCard } from '@/components/mobile/MobileNewsCard';
import { Button } from '@/components/common/Button';
import { companyService } from '@/services/companyService';
import { projectService } from '@/services/projectService';
import { propertyService } from '@/services/propertyService';
import { newsService } from '@/services/newsService';

export function MobileHomePage() {
  const companyInfo = companyService.getCompanyInfo();
  const featuredProjects = projectService.getFeatured();
  const featuredProperties = propertyService.getFeatured();
  const featuredNews = newsService.getFeatured(3);

  return (
    <MobileLayout>
      {/* Hero section */}
      <section className="relative h-64 bg-navy-900 w-full overflow-hidden">
        <img 
          src="/images/hero.jpg" 
          alt="Hero" 
          className="absolute inset-0 w-full h-full object-cover opacity-30" 
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <h2 className="text-gold-500 font-bold tracking-wider text-sm mb-2">{companyInfo.name}</h2>
          <h1 className="text-2xl font-bold text-white mb-2 leading-tight">{companyInfo.heroTitle}</h1>
          <p className="text-sm text-slate-300 mb-6">{companyInfo.heroSubtitle}</p>
          <div className="flex flex-col gap-3 w-full max-w-[200px]">
            <Link to="/bat-dong-san">
              <Button variant="primary" className="w-full text-sm">TÌM BĐS</Button>
            </Link>
            <Link to="/ky-gui">
              <Button variant="outline" className="w-full text-sm border-white text-white hover:bg-white hover:text-navy-900">KÝ GỬI BĐS</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Dự án nổi bật */}
      <section className="py-6 px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-navy-900 border-l-4 border-gold-500 pl-2">Dự án nổi bật</h2>
          <Link to="/du-an" className="text-sm text-gold-500 font-medium">Xem tất cả &rarr;</Link>
        </div>
        <div className="flex overflow-x-auto gap-4 scrollbar-hide pb-2">
          {featuredProjects.map(project => (
            <div key={project.id} className="w-64 flex-shrink-0">
              <MobileProjectCard project={project} />
            </div>
          ))}
        </div>
      </section>

      {/* BĐS Chuyển nhượng */}
      <section className="py-6 px-4 bg-slate-50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-navy-900 border-l-4 border-gold-500 pl-2">BĐS Chuyển nhượng</h2>
        </div>
        <div className="flex flex-col gap-4 mb-4">
          {featuredProperties.slice(0, 4).map(property => (
            <MobilePropertyCard key={property.id} property={property} />
          ))}
        </div>
        <Link to="/bat-dong-san" className="block text-center">
          <Button variant="outline" className="w-full">Xem tất cả &rarr;</Button>
        </Link>
      </section>

      {/* CTA Banner */}
      <section className="py-8 px-4 bg-navy-900 text-center">
        <h2 className="text-xl font-bold text-white mb-4">Bạn có Bất động sản cần bán hoặc cho thuê?</h2>
        <Link to="/ky-gui">
          <Button variant="primary">KÝ GỬI BĐS</Button>
        </Link>
      </section>

      {/* Tin tức */}
      <section className="py-6 px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-navy-900 border-l-4 border-gold-500 pl-2">Tin tức & Sự kiện</h2>
          <Link to="/tin-tuc" className="text-sm text-gold-500 font-medium">Xem tất cả &rarr;</Link>
        </div>
        <div className="flex overflow-x-auto gap-4 scrollbar-hide pb-2">
          {featuredNews.map(news => (
            <div key={news.id} className="w-72 flex-shrink-0">
              <MobileNewsCard article={news} />
            </div>
          ))}
        </div>
      </section>
    </MobileLayout>
  );
}
