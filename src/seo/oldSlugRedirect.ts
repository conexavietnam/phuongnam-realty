import { newsService } from '@/services/newsService';
import { projectService } from '@/services/projectService';
import { propertyService } from '@/services/propertyService';
import { consignmentService } from '@/services/consignmentService';
import { listingUrl } from '@/utils/consignment';
import { categoryPath } from '@/utils/newsMeta';
import { mergedProjects, mergedProperties } from '@/utils/consignmentAdapters';
import { matchSiteRoute } from '@/seo/routes';

const usesOldSlug = (slug: string) => (item: { oldSlugs?: string[] }) => (item.oldSlugs ?? []).includes(slug);

// Where a detail URL that no longer exists should go: the item that used to have that slug.
// A slug that is current for any item of the page's section is never redirected (it wins over old slugs).
// Mirrors pn_seo_old_slug_target() in server/src/seo.php, which answers 301 for crawlers.
export function oldSlugRedirect(pathname: string): string | null {
  const route = matchSiteRoute(pathname);
  if (!route || !route.slug) return null;
  const slug = route.slug;
  const enc = encodeURIComponent;
  switch (route.page) {
    case 'article': {
      if (newsService.getBySlug(slug)) return null;
      const item = newsService.getAll().find(usesOldSlug(slug));
      return item ? `/tin-tuc/${enc(item.slug)}` : null;
    }
    case 'newsCategory': {
      if (newsService.getCategory(slug)) return null;
      const category = newsService.getCategories().find(usesOldSlug(slug));
      return category ? categoryPath(category.slug) : null;
    }
    case 'project': {
      if (projectService.getBySlug(slug)) return null;
      const item = mergedProjects().find(usesOldSlug(slug));
      return item ? `/du-an/${enc(item.slug)}` : null;
    }
    case 'property': {
      if (propertyService.getBySlug(slug)) return null;
      const item = mergedProperties().find(usesOldSlug(slug));
      return item ? `/chuyen-nhuong/${enc(item.slug)}` : null;
    }
    case 'consignment': {
      if (consignmentService.getPublicBySlug(slug)) return null;
      const item = consignmentService.getPublic().find(usesOldSlug(slug));
      return item ? listingUrl({ ...item, slug: enc(item.slug) }) : null;
    }
    default:
      return null;
  }
}
