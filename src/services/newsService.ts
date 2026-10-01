import newsData from '@/data/news.json';
import type { NewsArticle, PaginatedResult, PaginationParams, NewsCategory } from '@/types';

const news = newsData as NewsArticle[];

export const newsService = {
  getAll(): NewsArticle[] {
    return news;
  },

  getFeatured(limit: number = 3): NewsArticle[] {
    const featured = news.filter((item) => (item as NewsArticle & { featured?: boolean }).featured);
    if (featured.length > 0) {
      return featured.slice(0, limit);
    }
    return news.slice(0, limit);
  },

  getBySlug(slug: string): NewsArticle | undefined {
    return news.find((item) => item.slug === slug);
  },

  getById(id: string): NewsArticle | undefined {
    return news.find((item) => item.id === id);
  },

  getByCategory(category: NewsCategory | string): NewsArticle[] {
    return news.filter((item) => item.category === category);
  },

  getRelated(currentId: string, limit: number = 3): NewsArticle[] {
    const current = news.find((item) => item.id === currentId);
    if (current) {
      const sameCategory = news.filter(
        (item) => item.id !== currentId && item.category === current.category
      );
      if (sameCategory.length >= limit) {
        return sameCategory.slice(0, limit);
      }
      const others = news.filter(
        (item) => item.id !== currentId && item.category !== current.category
      );
      return [...sameCategory, ...others].slice(0, limit);
    }
    return news.filter((item) => item.id !== currentId).slice(0, limit);
  },

  getPaginated(params: PaginationParams, category?: NewsCategory | string): PaginatedResult<NewsArticle> {
    const items = category ? news.filter((item) => item.category === category) : news;
    const { page, pageSize } = params;
    const start = (page - 1) * pageSize;
    const data = items.slice(start, start + pageSize);
    return {
      data,
      total: items.length,
      page,
      pageSize,
      totalPages: Math.ceil(items.length / pageSize),
    };
  },
};
