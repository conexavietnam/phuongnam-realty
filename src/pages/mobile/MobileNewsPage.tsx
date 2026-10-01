
import { MobileLayout } from '@/layouts/MobileLayout';
import { MobileNewsCard } from '@/components/mobile/MobileNewsCard';
import { Pagination } from '@/components/common/Pagination';
import { newsService } from '@/services/newsService';

export function MobileNewsPage() {
  const news = newsService.getAll();

  return (
    <MobileLayout>
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-navy-900 border-l-4 border-gold-500 pl-2">Tin tức & Sự kiện</h1>
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        {news.map(item => (
          <MobileNewsCard key={item.id} article={item} />
        ))}
      </div>

      <div className="px-4 pb-8">
        <Pagination currentPage={1} totalPages={3} onPageChange={() => {}} />
      </div>
    </MobileLayout>
  );
}
