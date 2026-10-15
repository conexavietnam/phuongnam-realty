import type { ItemSeo } from './seo';

export type ProjectCategory = 'cao-cap' | 'shophouse' | 'biet-thu' | 'nha-pho' | 'dat-nen';

export interface Project {
  id: string;
  slug: string;
  name: string;
  category: ProjectCategory;
  categoryLabel: string;
  location: string;
  priceFrom: string;
  bedrooms: string;
  area: string;
  shortDescription: string;
  fullDescription: string;
  images: string[];
  thumbnail: string;
  featured: boolean;
  highlights: string[];
  investor: string;
  status: string;
  // Set only on listings promoted from Ký gửi; 'sold' shows a "Đã giao dịch" badge.
  consignmentStatus?: 'published' | 'sold';
  seo?: ItemSeo;
  // Previous slugs of this item (newest last, max 10); old links redirect (301) to the current one.
  oldSlugs?: string[];
}
