import { useLocation } from 'react-router-dom';
import { useSeo } from '@/hooks/useSeo';
import { useDataListener } from '@/hooks/useDataListener';
import { resolvePageSeo } from '@/seo/resolvePageSeo';

// Rendered once inside the router: every page gets its title, description, canonical and social tags here.
export function RouteSeo() {
  useDataListener();
  const { pathname } = useLocation();
  const { page, site } = resolvePageSeo(pathname);
  useSeo(page, site.siteName);
  return null;
}
