import { SITE_ROUTES } from '@/seo/routes';
import { newsService } from '@/services/newsService';
import { projectService } from '@/services/projectService';
import { propertyService } from '@/services/propertyService';
import { consignmentService } from '@/services/consignmentService';
import { listingUrl } from '@/utils/consignment';
import { categoryPath } from '@/utils/newsMeta';

export interface QuickLink {
  label: string;
  path: string;
}

export interface QuickLinkGroup {
  title: string;
  links: QuickLink[];
}

// Names of the fixed pages of the route table (paths without a parameter, except the admin area).
const PAGE_LABELS: Record<string, string> = {
  '/': 'Trang chủ',
  '/du-an': 'Dự án',
  '/chuyen-nhuong': 'BĐS chuyển nhượng',
  '/ky-gui': 'Ký gửi',
  '/tin-tuc': 'Tin tức & Thị trường',
  '/lien-he': 'Liên hệ',
};

// Everything a menu item can point at inside the site: fixed pages, news categories and published items.
export function quickLinkGroups(): QuickLinkGroup[] {
  const pages = SITE_ROUTES.filter((r) => r.page !== 'admin' && !r.path.includes(':')).map((r) => ({
    label: PAGE_LABELS[r.path] ?? r.path,
    path: r.path,
  }));
  const groups: QuickLinkGroup[] = [
    { title: 'Trang website', links: pages },
    { title: 'Danh mục tin tức', links: newsService.getCategories().map((c) => ({ label: c.label, path: categoryPath(c.slug) })) },
    { title: 'Dự án', links: projectService.getAll().map((p) => ({ label: p.name, path: `/du-an/${encodeURIComponent(p.slug)}` })) },
    { title: 'BĐS chuyển nhượng', links: propertyService.getAll().map((p) => ({ label: p.title, path: `/chuyen-nhuong/${encodeURIComponent(p.slug)}` })) },
    {
      title: 'Tin ký gửi',
      links: consignmentService.getKyGui().map((i) => ({ label: i.title, path: listingUrl({ ...i, slug: encodeURIComponent(i.slug) }) })),
    },
  ];
  return groups.filter((g) => g.links.length > 0);
}
