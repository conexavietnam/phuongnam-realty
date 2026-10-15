import { useParams } from 'react-router-dom';
import { MobileNewsListing } from '@/components/mobile/MobileNewsListing';
import { MobileNotFoundPage } from '@/pages/mobile/MobileNotFoundPage';
import { useDataListener } from '@/hooks';
import { newsService } from '@/services/newsService';

// /tin-tuc/danh-muc/:slug
export function MobileNewsCategoryPage() {
  useDataListener();
  const { slug = '' } = useParams<{ slug: string }>();
  if (!newsService.getCategory(slug)) return <MobileNotFoundPage />;
  return <MobileNewsListing key={slug} categorySlug={slug} />;
}
