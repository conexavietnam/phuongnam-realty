import { dataStorage } from '@/services/dataStorage';
import { categoryLabelFor, countByCategory, sortCategories } from '@/utils/newsMeta';
import type { NewsArticle, NewsCategoryItem, PaginatedResult, PaginationParams, NewsCategory } from '@/types';

export const newsService = {
  getAll(): NewsArticle[] {
    return dataStorage.getNews();
  },

  getFeatured(limit: number = 3): NewsArticle[] {
    const news = dataStorage.getNews();
    const featured = news.filter((item) => (item as NewsArticle & { featured?: boolean }).featured);
    if (featured.length > 0) {
      return featured.slice(0, limit);
    }
    return news.slice(0, limit);
  },

  getBySlug(slug: string): NewsArticle | undefined {
    return dataStorage.getNewsBySlug(slug);
  },

  getById(id: string): NewsArticle | undefined {
    return dataStorage.getNews().find((item) => item.id === id);
  },

  getByCategory(category: NewsCategory | string): NewsArticle[] {
    return dataStorage.getNews().filter((item) => item.category === category);
  },

  // Categories in display order (order, then label).
  getCategories(): NewsCategoryItem[] {
    return sortCategories(dataStorage.getNewsCategories());
  },

  getCategory(slug: string): NewsCategoryItem | undefined {
    return dataStorage.getNewsCategories().find((c) => c.slug === slug);
  },

  // Category label for display: the list's label, else the one stored with the article.
  getCategoryLabel(article: NewsArticle): string {
    return categoryLabelFor(article, dataStorage.getNewsCategories());
  },

  // Number of articles per category slug (including slugs that are not in the list).
  getCategoryCounts(): Record<string, number> {
    return countByCategory(dataStorage.getNews());
  },

  getRelated(currentId: string, limit: number = 3): NewsArticle[] {
    const news = dataStorage.getNews();
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
    const news = dataStorage.getNews();
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
