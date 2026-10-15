// The ONE client-side route table. src/App.tsx builds its <Route>s from it and useSeo derives per-page meta
// from it. The PHP twin is PN_SEO_ROUTES in server/src/seo.php: keep both in step.
export type RoutePage =
  | 'home'
  | 'projects'
  | 'project'
  | 'properties'
  | 'property'
  | 'consignments'
  | 'consignment'
  | 'news'
  | 'article'
  | 'contact'
  | 'admin';

export interface SiteRoute {
  path: string;
  page: RoutePage;
}

export const SITE_ROUTES: SiteRoute[] = [
  { path: '/', page: 'home' },
  { path: '/du-an', page: 'projects' },
  { path: '/du-an/:slug', page: 'project' },
  { path: '/chuyen-nhuong', page: 'properties' },
  { path: '/chuyen-nhuong/:slug', page: 'property' },
  { path: '/ky-gui', page: 'consignments' },
  { path: '/ky-gui/:slug', page: 'consignment' },
  { path: '/tin-tuc', page: 'news' },
  { path: '/tin-tuc/:slug', page: 'article' },
  { path: '/lien-he', page: 'contact' },
  { path: '/admin', page: 'admin' },
];

export interface RouteMatch {
  page: RoutePage;
  slug: string | null;
}

// Same matching rules as the PHP side: exact segments, ":slug" takes one non-empty decoded segment,
// a trailing slash is ignored, "//" never matches.
export function matchSiteRoute(pathname: string): RouteMatch | null {
  if (!pathname.startsWith('/') || pathname.includes('//')) return null;
  const path = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  const segments = path === '/' ? [] : path.slice(1).split('/');
  for (const route of SITE_ROUTES) {
    const pattern = route.path === '/' ? [] : route.path.slice(1).split('/');
    if (pattern.length !== segments.length) continue;
    let slug: string | null = null;
    const matched = pattern.every((part, i) => {
      if (part !== ':slug') return part === segments[i];
      try {
        slug = decodeURIComponent(segments[i]);
      } catch {
        return false;
      }
      return slug !== '';
    });
    if (matched) return { page: route.page, slug };
  }
  return null;
}
