import { DesktopLayout } from '@/layouts/DesktopLayout';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { SectionTitle } from '@/components/common/SectionTitle';
import { NewsCard } from '@/components/desktop/NewsCard';
import { Pagination } from '@/components/common/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { useDataListener } from '@/hooks';
import { newsService } from '@/services/newsService';

export function NewsPage() {
  useDataListener();
  const allNews = newsService.getAll();

  const {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    goToPage,
  } = usePagination({
    totalItems: allNews.length,
    pageSize: 8,
    initialPage: 1,
  });

  const currentArticles = allNews.slice(startIndex, endIndex);

  return (
    <DesktopLayout>
      {/* Sub-banner Hero */}
      <section className="bg-navy-900 text-white min-h-[200px] flex flex-col justify-center border-b border-navy-800">
        <Breadcrumb items={[{ label: 'Tin tức & Thị trường' }]} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">
            TIN TỨC & THỊ TRƯỜNG
          </h1>
          <p className="text-slate-300 text-base max-w-3xl">
            Cập nhật diễn biến thị trường địa ốc, xu hướng giá, phân tích quy hoạch và cẩm nang pháp lý bất động sản hữu ích.
          </p>
        </div>
      </section>

      {/* News Articles Grid */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle
            subtitle="BẢN TIN BẤT ĐỘNG SẢN"
            title="BÀI VIẾT MỚI NHẤT"
            description="Thông tin chuẩn xác và kịp thời từ đội ngũ chuyên gia Phương Nam Realty."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {currentArticles.map((article) => (
              <NewsCard key={article.id} article={article} />
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-12">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
            />
          </div>
        </div>
      </section>
    </DesktopLayout>
  );
}
