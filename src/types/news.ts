import type { ItemSeo } from './seo';

export type NewsCategory = 'thi-truong' | 'tin-tuc' | 'du-an';

export interface NewsArticle {
  id: string;
  slug: string;
  title: string;
  category: NewsCategory;
  categoryLabel: string;
  excerpt: string;
  content: string;
  thumbnail: string;
  author: string;
  publishedAt: string;
  readTime: string;
  seo?: ItemSeo;
  // Previous slugs of this item (newest last, max 10); old links redirect (301) to the current one.
  oldSlugs?: string[];
}
