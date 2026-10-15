import { DesktopLayout } from '@/layouts/DesktopLayout';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { SectionTitle } from '@/components/common/SectionTitle';
import { NewsCategoryTabs } from '@/components/common/NewsCategoryTabs';
import { NewsCard } from '@/components/desktop/NewsCard';
import { Pagination } from '@/components/common/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { useDataListener } from '@/hooks';
import { newsService } from '@/services/newsService';
import { CardGrid } from '@/components/common/CardGrid';

interface NewsListingProps {
  // Slug of the category page; undefined = all articles (/tin-tuc).
  categorySlug?: string;
}

// /tin-tuc and /tin-tuc/danh-muc/:slug share this layout; the caller remounts it (key) when the category changes.
export function NewsListing({ categorySlug }: NewsListingProps) {
  useDataListener();
  const category = categorySlug ? newsService.getCategory(categorySlug) : undefined;
  const articles = categorySlug ? newsService.getByCategory(categorySlug) : newsService.getAll();

  const { currentPage, totalPages, startIndex, endIndex, goToPage } = usePagination({
    totalItems: articles.length,
    pageSize: 8,
    initialPage: 1,
  });
  const current = articles.slice(startIndex, endIndex);

  const heading = category ? category.label : 'TIN TỨC & THỊ TRƯỜNG';
  const intro = category
    ? category.description || `Các bài viết thuộc chuyên mục ${category.label}.`
    : 'Cập nhật diễn biến thị trường địa ốc, xu hướng giá, phân tích quy hoạch và cẩm nang pháp lý bất động sản hữu ích.';

  return (
    <DesktopLayout>
      {/* Sub-banner Hero */}
      <section className="bg-navy-900 text-white min-h-[200px] flex flex-col justify-center border-b border-navy-800">
        <Breadcrumb
          items={
            category
              ? [{ label: 'Tin tức & Thị trường', path: '/tin-tuc' }, { label: category.label }]
              : [{ label: 'Tin tức & Thị trường' }]
          }
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">{heading}</h1>
          <p className="text-slate-300 text-base max-w-3xl">{intro}</p>
        </div>
      </section>

      {/* News Articles Grid */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <NewsCategoryTabs activeSlug={categorySlug} />
          </div>

          <SectionTitle
            subtitle="BẢN TIN BẤT ĐỘNG SẢN"
            title={category ? `BÀI VIẾT: ${category.label.toUpperCase()}` : 'BÀI VIẾT MỚI NHẤT'}
            description="Thông tin chuẩn xác và kịp thời từ đội ngũ chuyên gia Phương Nam Realty."
          />

          {current.length === 0 ? (
            <p className="py-12 text-center text-slate-500">Chưa có bài viết nào trong chuyên mục này.</p>
          ) : (
            <CardGrid cols={4}>
              {current.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </CardGrid>
          )}

          <div className="mt-12">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
          </div>
        </div>
      </section>
    </DesktopLayout>
  );
}
