import { MobileLayout } from '@/layouts/MobileLayout';
import { MobileNewsCard } from '@/components/mobile/MobileNewsCard';
import { NewsCategoryTabs } from '@/components/common/NewsCategoryTabs';
import { Pagination } from '@/components/common/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { useDataListener } from '@/hooks';
import { newsService } from '@/services/newsService';

interface MobileNewsListingProps {
  // Slug of the category page; undefined = all articles (/tin-tuc).
  categorySlug?: string;
}

// /tin-tuc and /tin-tuc/danh-muc/:slug on phones; the caller remounts it (key) when the category changes.
export function MobileNewsListing({ categorySlug }: MobileNewsListingProps) {
  useDataListener();
  const category = categorySlug ? newsService.getCategory(categorySlug) : undefined;
  const articles = categorySlug ? newsService.getByCategory(categorySlug) : newsService.getAll();
  const { currentPage, totalPages, startIndex, endIndex, goToPage } = usePagination({
    totalItems: articles.length,
    pageSize: 8,
    initialPage: 1,
  });

  return (
    <MobileLayout>
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-navy-900 border-l-4 border-gold-500 pl-2">
          {category ? category.label : 'Tin tức & Sự kiện'}
        </h1>
        {category?.description && <p className="mt-2 text-xs text-slate-500 leading-relaxed">{category.description}</p>}
      </div>

      <div className="px-4 pb-1">
        <NewsCategoryTabs activeSlug={categorySlug} compact />
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        {articles.slice(startIndex, endIndex).map((item) => (
          <MobileNewsCard key={item.id} article={item} />
        ))}
        {articles.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Chưa có bài viết nào trong chuyên mục này.</p>}
      </div>

      <div className="px-4 pb-8">
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
      </div>
    </MobileLayout>
  );
}
