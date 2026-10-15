import { slugify } from '@/utils/slug';
import type { NewsCategoryItem } from '@/types/news';

// Same limits as the server (pn_valid_news_category in server/src/storage.php).
export const CATEGORY_LIMITS = {
  max: 40,
  label: 60,
  description: 300,
  slug: 80,
  seoTitle: 120,
  seoDescription: 320,
} as const;

const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;

export const categorySlugFromLabel = (label: string): string => slugify(label).slice(0, CATEGORY_LIMITS.slug).replace(/-+$/, '');

// `base`, or `base-2`, `base-3`... until nobody uses it.
export function uniqueCategorySlug(base: string, taken: ReadonlySet<string>): string {
  const root = base || 'chuyen-muc';
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root.slice(0, CATEGORY_LIMITS.slug - 4)}-${n}`)) n += 1;
  return `${root.slice(0, CATEGORY_LIMITS.slug - 4)}-${n}`;
}

export interface CategoryFields {
  label: string;
  slug: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
}

// Vietnamese error for the first rule a category breaks, or null.
export function categoryProblem(fields: CategoryFields, others: readonly NewsCategoryItem[]): string | null {
  const label = fields.label.trim();
  if (!label) return 'Vui lòng nhập tên danh mục.';
  if (label.length > CATEGORY_LIMITS.label) return `Tên danh mục tối đa ${CATEGORY_LIMITS.label} ký tự.`;
  if (!SLUG_PATTERN.test(fields.slug)) return 'Đường dẫn chỉ gồm chữ thường không dấu, số và dấu gạch ngang (tối đa 80 ký tự).';
  if (others.some((c) => c.slug === fields.slug)) return `Đường dẫn "${fields.slug}" đã được dùng bởi danh mục "${others.find((c) => c.slug === fields.slug)?.label}".`;
  if (others.some((c) => c.label.trim().toLowerCase() === label.toLowerCase())) return `Đã có danh mục tên "${label}".`;
  if (fields.description.trim().length > CATEGORY_LIMITS.description) return `Mô tả tối đa ${CATEGORY_LIMITS.description} ký tự.`;
  if (fields.seoTitle.trim().length > CATEGORY_LIMITS.seoTitle) return `Tiêu đề SEO tối đa ${CATEGORY_LIMITS.seoTitle} ký tự.`;
  if (fields.seoDescription.trim().length > CATEGORY_LIMITS.seoDescription) return `Mô tả SEO tối đa ${CATEGORY_LIMITS.seoDescription} ký tự.`;
  return null;
}

export function toCategory(id: string, order: number, fields: CategoryFields): NewsCategoryItem {
  const seoTitle = fields.seoTitle.trim();
  const seoDescription = fields.seoDescription.trim();
  const item: NewsCategoryItem = {
    id,
    slug: fields.slug,
    label: fields.label.trim(),
    description: fields.description.trim(),
    order,
  };
  if (seoTitle || seoDescription) {
    item.seo = { ...(seoTitle ? { title: seoTitle } : {}), ...(seoDescription ? { description: seoDescription } : {}) };
  }
  return item;
}

// Orders 1..n following the list order.
export const renumber = (list: readonly NewsCategoryItem[]): NewsCategoryItem[] => list.map((c, i) => ({ ...c, order: i + 1 }));
