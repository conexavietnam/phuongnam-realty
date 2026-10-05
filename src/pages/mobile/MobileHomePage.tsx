
import { Link } from 'react-router-dom';
import { MobileLayout } from '@/layouts/MobileLayout';
import { MobileProjectCard } from '@/components/mobile/MobileProjectCard';
import { MobilePropertyCard } from '@/components/mobile/MobilePropertyCard';
import { MobileNewsCard } from '@/components/mobile/MobileNewsCard';
import { Button } from '@/components/common/Button';
import { useDataListener } from '@/hooks';
import { companyService } from '@/services/companyService';
import { projectService } from '@/services/projectService';
import { propertyService } from '@/services/propertyService';
import { newsService } from '@/services/newsService';

export function MobileHomePage() {
  useDataListener();
  const companyInfo = companyService.getCompanyInfo();
  const heroImage = (companyInfo as any).heroBannerImage || '/images/hero-banner.svg';
  const featuredProjects = projectService.getFeatured();
  const featuredProperties = propertyService.getFeatured();
  const featuredNews = newsService.getFeatured(3);

  return (
    <MobileLayout>
      {/* Hero section */}
      <section className="relative min-h-[320px] bg-navy-950 w-full overflow-hidden flex items-center">
        <img 
          src={heroImage} 
          alt="Phương Nam Realty Hero" 
          className="absolute inset-0 w-full h-full object-cover opacity-40 scale-110" 
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-900/80 to-navy-950/60" />
        <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center w-full">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gold-500/15 border border-gold-500/30 text-gold-400 font-bold text-xs tracking-wider uppercase mb-2">
            {companyInfo.name}
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 leading-tight tracking-tight">{companyInfo.heroTitle}</h1>
          <p className="text-xs text-slate-200/80 mb-5 max-w-xs">{companyInfo.heroSubtitle}</p>
          <div className="flex gap-3 w-full max-w-xs justify-center">
            <Link to="/chuyen-nhuong" className="flex-1">
              <Button variant="primary" className="w-full text-xs font-semibold py-2.5 shadow-md shadow-gold-500/20">TÌM BĐS</Button>
            </Link>
            <Link to="/ky-gui" className="flex-1">
              <Button variant="outline" className="w-full text-xs font-semibold py-2.5 border-white/80 text-white hover:bg-white hover:text-navy-900">KÝ GỬI</Button>
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
