import type { ItemSeo } from './seo';

// Slug of an entry of the news_categories collection. Old articles may carry a slug that is no longer listed.
export type NewsCategory = string;

export interface NewsCategorySeo {
  title?: string;
  description?: string;
}

export interface NewsCategoryItem {
  id: string;
  slug: string;
  label: string;
  description: string;
  order: number;
  seo?: NewsCategorySeo;
  // Previous slugs (newest last, max 10); /tin-tuc/danh-muc/<old> redirects (301) to the current one.
  oldSlugs?: string[];
}

export interface NewsArticle {
  id: string;
  slug: string;
  title: string;
  category: NewsCategory;
  // Label at the time of saving; the category list wins when the category still exists.
  categoryLabel: string;
  excerpt: string;
  content: string;
  thumbnail: string;
  author: string;
  // ISO date-time (older data: YYYY-MM-DD); shown in Vietnam time (GMT+7).
  publishedAt: string;
  // Text such as "5 phút đọc".
  readTime: string;
  seo?: ItemSeo;
  // Previous slugs of this item (newest last, max 10); old links redirect (301) to the current one.
  oldSlugs?: string[];
}
