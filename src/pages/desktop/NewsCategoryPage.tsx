import { useParams } from 'react-router-dom';
import { NewsListing } from '@/components/desktop/NewsListing';
import { NotFoundPage } from '@/pages/desktop/NotFoundPage';
import { useDataListener } from '@/hooks';
import { newsService } from '@/services/newsService';

// /tin-tuc/danh-muc/:slug
export function NewsCategoryPage() {
  useDataListener();
  const { slug = '' } = useParams<{ slug: string }>();
  if (!newsService.getCategory(slug)) return <NotFoundPage />;
  return <NewsListing key={slug} categorySlug={slug} />;
}
