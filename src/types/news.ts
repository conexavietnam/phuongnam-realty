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
}
