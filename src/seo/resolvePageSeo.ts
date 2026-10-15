import { dataStorage } from '@/services/dataStorage';
import { newsService } from '@/services/newsService';
import { projectService } from '@/services/projectService';
import { propertyService } from '@/services/propertyService';
import { consignmentService } from '@/services/consignmentService';
import { listingUrl } from '@/utils/consignment';
import { categorySeo, homeSeo, itemSeo, siteSeo, staticPageSeo } from '@/utils/seo';
import { categoryPath } from '@/utils/newsMeta';
import type { PageSeo, SeoKind, SiteSeo } from '@/utils/seo';
import { matchSiteRoute } from '@/seo/routes';
import type { RoutePage } from '@/seo/routes';

const LIST_PAGES: Partial<Record<RoutePage, { key: string; path: string }>> = {
  projects: { key: 'projects', path: '/du-an' },
  properties: { key: 'properties', path: '/chuyen-nhuong' },
  consignments: { key: 'consignments', path: '/ky-gui' },
  news: { key: 'news', path: '/tin-tuc' },
  contact: { key: 'contact', path: '/lien-he' },
};

const asRecord = (item: unknown): Record<string, unknown> => item as Record<string, unknown>;

export interface ResolvedSeo {
  page: PageSeo;
  site: SiteSeo;
}

// What the page at `pathname` should declare in <head>; mirrors pn_seo_resolve() in server/src/seo.php.
export function resolvePageSeo(pathname: string): ResolvedSeo {
  const site = siteSeo(dataStorage.getCompany());
  const wrap = (page: PageSeo): ResolvedSeo => ({ page, site });
  const notFound = () => wrap(staticPageSeo('notFound', pathname, site));
  const route = matchSiteRoute(pathname);
  if (!route) return notFound();

  const { page, slug } = route;
  if (page === 'home') return wrap(homeSeo(site));
  if (page === 'admin') return wrap(staticPageSeo('admin', '/admin', site));
  const list = LIST_PAGES[page];
  if (list) return wrap(staticPageSeo(list.key, list.path, site));

  const slugValue = slug ?? '';
  const encoded = encodeURIComponent(slugValue);

  if (page === 'newsCategory') {
    const category = newsService.getCategory(slugValue);
    if (!category) return notFound();
    const indexable = newsService.getAll().filter((n) => n.category === category.slug && n.seo?.noindex !== true).length;
    return wrap(categorySeo(category, indexable, site, categoryPath(category.slug)));
  }
  const detail = (kind: SeoKind, item: unknown, path: string) => wrap(itemSeo(kind, asRecord(item), site, path));

  if (page === 'article') {
    const item = newsService.getBySlug(slugValue);
    return item ? detail('news', item, `/tin-tuc/${encoded}`) : notFound();
  }
  if (page === 'project') {
    const item = projectService.getBySlug(slugValue);
    return item ? detail('project', item, `/du-an/${encoded}`) : notFound();
  }
  if (page === 'property') {
    const item = propertyService.getBySlug(slugValue);
    return item ? detail('property', item, `/chuyen-nhuong/${encoded}`) : notFound();
  }
  const listing = consignmentService.getPublicBySlug(slugValue);
  if (!listing) return notFound();
  return detail('consignment', listing, listingUrl({ ...listing, slug: encoded }));
}
