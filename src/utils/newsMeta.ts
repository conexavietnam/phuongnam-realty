// Pure helpers for news: reserved slugs, category lookup/counting, reading time and GMT+7 dates.
// No imports, so scripts/check-news-menu.mjs can run them under plain node.

// Slugs an article may not use: /tin-tuc/danh-muc/<category> is a fixed URL space.
// PHP twin: PN_NEWS_RESERVED_SLUGS in server/src/storage.php.
export const RESERVED_NEWS_SLUGS: readonly string[] = ['danh-muc'];

export const NEWS_CATEGORY_BASE = '/tin-tuc/danh-muc';

export const isReservedNewsSlug = (slug: string): boolean => RESERVED_NEWS_SLUGS.includes(slug);

// Vietnamese message when `slug` cannot be used by the article `exceptId` (reserved, or taken as a slug or old slug).
export function newsSlugConflict(
  news: ReadonlyArray<{ id: string; slug: string; oldSlugs?: string[] }>,
  slug: string,
  exceptId: string,
): string | null {
  if (isReservedNewsSlug(slug)) {
    return `Đường dẫn "${slug}" được hệ thống giữ riêng cho trang danh mục tin. Vui lòng chọn đường dẫn khác.`;
  }
  return news.some((n) => n.id !== exceptId && (n.slug === slug || (n.oldSlugs ?? []).includes(slug)))
    ? `Đường dẫn "${slug}" đã được dùng bởi một bài viết khác. Vui lòng đổi sang đường dẫn khác.`
    : null;
}

export const categoryPath = (slug: string): string => `${NEWS_CATEGORY_BASE}/${encodeURIComponent(slug)}`;

export interface CategoryRef {
  slug: string;
  label: string;
  order: number;
}

export function sortCategories<T extends CategoryRef>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'vi'));
}

// The label shown for an article: the category's current label, else the label stored with the article
// (old data whose category is not in the list), else the raw category code.
export function categoryLabelFor(
  article: { category: string; categoryLabel?: string },
  categories: readonly CategoryRef[],
): string {
  return categories.find((c) => c.slug === article.category)?.label ?? (article.categoryLabel || article.category);
}

export function countByCategory(news: ReadonlyArray<{ category: string }>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of news) counts[item.category] = (counts[item.category] ?? 0) + 1;
  return counts;
}

export function usedAuthors(news: ReadonlyArray<{ author?: string }>): string[] {
  const seen = new Set<string>();
  for (const item of news) {
    const name = (item.author ?? '').trim();
    if (name) seen.add(name);
  }
  return [...seen].sort((a, b) => a.localeCompare(b, 'vi'));
}

// ---------------------------------------------------------------------------------------------
// Reading time
// ---------------------------------------------------------------------------------------------

export const WORDS_PER_MINUTE = 200;

const TEXT_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function plainWords(html: string): string[] {
  const text = html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#\d{1,6}|[a-zA-Z]{2,6});/g, (match, name: string) => TEXT_ENTITIES[name] ?? (name.startsWith('#') ? ' ' : match));
  return text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word));
}

// ~200 words per minute, at least 1.
export function readTimeMinutes(html: string): number {
  return Math.max(1, Math.ceil(plainWords(html).length / WORDS_PER_MINUTE));
}

export const readTimeLabel = (minutes: number): string => `${minutes} phút đọc`;

// "5 phút đọc" -> 5; anything without a number -> null.
export function readTimeToMinutes(label: string): number | null {
  const match = /\d+/.exec(label);
  const value = match ? Number(match[0]) : NaN;
  return Number.isFinite(value) && value > 0 ? value : null;
}

// ---------------------------------------------------------------------------------------------
// Dates (Vietnam time, UTC+7, no daylight saving)
// ---------------------------------------------------------------------------------------------

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_INPUT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

// Stored values are ISO strings; very old data may be a bare "YYYY-MM-DD", read as midnight in Vietnam.
export function parseStoredDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(DATE_ONLY.test(trimmed) ? `${trimmed}T00:00:00+07:00` : trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

const pad = (n: number): string => String(n).padStart(2, '0');

function vietnamParts(date: Date): { y: number; mo: number; d: number; h: number; mi: number } {
  const shifted = new Date(date.getTime() + VN_OFFSET_MS);
  return { y: shifted.getUTCFullYear(), mo: shifted.getUTCMonth() + 1, d: shifted.getUTCDate(), h: shifted.getUTCHours(), mi: shifted.getUTCMinutes() };
}

// Value for <input type="datetime-local">: "YYYY-MM-DDTHH:mm" in Vietnam time ('' when unreadable).
export function toDateTimeLocal(stored: string): string {
  const date = parseStoredDate(stored);
  if (!date) return '';
  const p = vietnamParts(date);
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
}

// The ISO string to store for a datetime-local value read as Vietnam time; null when invalid.
export function fromDateTimeLocal(local: string): string | null {
  if (!LOCAL_INPUT.test(local)) return null;
  const date = new Date(`${local}:00+07:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// dd/MM/yyyy in Vietnam time; the stored text itself when it is not a date.
export function formatNewsDate(stored: string): string {
  const date = parseStoredDate(stored);
  if (!date) return stored;
  const p = vietnamParts(date);
  return `${pad(p.d)}/${pad(p.mo)}/${p.y}`;
}

export function formatNewsDateTime(stored: string): string {
  const date = parseStoredDate(stored);
  if (!date) return stored;
  const p = vietnamParts(date);
  return `${pad(p.d)}/${pad(p.mo)}/${p.y} ${pad(p.h)}:${pad(p.mi)}`;
}
