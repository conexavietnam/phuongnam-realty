// Admin-side helpers for the SEO fields (editors in Dự án, Tin tức, BĐS chuyển nhượng, Tin ký gửi, Cài đặt > SEO).
// Limits mirror the server validation in server/src/storage.php (PN_SEO_*).
import type { CompanySeo, GoogleHtmlFile, ItemSeo } from '@/types/seo';
import { MAX_KEYWORDS, MAX_KEYWORD_LENGTH, SEO_DEFAULTS, SNIPPET_MAX, cleanKeywords, collapseSpaces, plainText, snippet } from '@/utils/seo';

export const SEO_LIMITS = {
  titleMax: 120,
  titleIdealMin: 30,
  titleIdealMax: 60,
  descriptionMax: 320,
  descriptionWarnMin: 70,
  descriptionIdealMin: 120,
  descriptionIdealMax: 160,
  suffixMax: 60,
  keywords: MAX_KEYWORDS,
  keywordLength: MAX_KEYWORD_LENGTH,
} as const;

const VERIFICATION = /^[A-Za-z0-9_-]{10,100}$/;
const HTML_FILE_NAME = /^google[a-z0-9]{8,64}\.html$/;
const HTML_FILE_CONTENT = /^[A-Za-z0-9 :._-]{1,200}$/;

export const emptySeo = (): ItemSeo => ({ title: '', description: '', keywords: [] });

const str = (value: unknown): string => (typeof value === 'string' ? value : '');

// Reads stored data defensively; undefined when nothing meaningful is stored.
export function normalizeItemSeo(raw: unknown): ItemSeo | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  const seo: ItemSeo = {
    title: str(r.title),
    description: str(r.description),
    keywords: cleanKeywords(r.keywords),
  };
  const ogImage = str(r.ogImage);
  if (ogImage) seo.ogImage = ogImage;
  if (r.noindex === true) seo.noindex = true;
  return seo;
}

// Value to store on save: trimmed, empty parts dropped, and no `seo` key at all when nothing is set.
export function cleanSeoForSave(seo: ItemSeo | undefined): ItemSeo | undefined {
  if (!seo) return undefined;
  const cleaned: ItemSeo = {
    title: collapseSpaces(seo.title).slice(0, SEO_LIMITS.titleMax),
    description: collapseSpaces(seo.description).slice(0, SEO_LIMITS.descriptionMax),
    keywords: cleanKeywords(seo.keywords),
  };
  const ogImage = (seo.ogImage ?? '').trim();
  if (ogImage) cleaned.ogImage = ogImage;
  if (seo.noindex === true) cleaned.noindex = true;
  const empty = !cleaned.title && !cleaned.description && cleaned.keywords.length === 0 && !cleaned.ogImage && !cleaned.noindex;
  return empty ? undefined : cleaned;
}

// Splits typed or pasted text into keywords (comma or new line).
export function splitKeywords(text: string): string[] {
  return text
    .split(/[,\n;]/)
    .map((part) => collapseSpaces(part))
    .filter(Boolean);
}

export function autoTitle(title: string, suffix: string): string {
  const base = collapseSpaces(title);
  return base ? base + suffix : '';
}

export function autoDescription(shortDescription: string, fallback: string): string {
  return snippet(plainText(shortDescription), SNIPPET_MAX) || fallback;
}

export type MeterLevel = 'good' | 'warn' | 'bad';

export function titleMeter(length: number): { level: MeterLevel; hint: string } {
  if (length === 0) return { level: 'warn', hint: 'Chưa có tiêu đề' };
  if (length < SEO_LIMITS.titleIdealMin) return { level: 'warn', hint: 'Hơi ngắn, nên từ 30 đến 60 ký tự' };
  if (length > SEO_LIMITS.titleIdealMax) return { level: 'warn', hint: 'Quá dài, Google có thể cắt bớt (nên ≤ 60)' };
  return { level: 'good', hint: 'Độ dài tốt' };
}

export function descriptionMeter(length: number): { level: MeterLevel; hint: string } {
  if (length === 0) return { level: 'warn', hint: 'Chưa có mô tả' };
  if (length < SEO_LIMITS.descriptionWarnMin) return { level: 'warn', hint: 'Hơi ngắn, nên từ 120 đến 160 ký tự' };
  if (length > SEO_LIMITS.descriptionIdealMax) return { level: 'warn', hint: 'Quá dài, Google có thể cắt bớt (nên ≤ 160)' };
  if (length < SEO_LIMITS.descriptionIdealMin) return { level: 'good', hint: 'Dùng được, tốt nhất từ 120 ký tự' };
  return { level: 'good', hint: 'Độ dài tốt' };
}

export interface ChecklistInput {
  title: string;
  seoTitle: string;
  seoDescription: string;
  shortDescription: string;
  thumbnail: string;
  slug: string;
  primaryKeyword: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  ok: boolean;
  hint?: string;
}

export function seoChecklist(input: ChecklistInput): ChecklistItem[] {
  const keyword = collapseSpaces(input.primaryKeyword).toLowerCase();
  const effectiveTitle = collapseSpaces(input.seoTitle || input.title).toLowerCase();
  const description = collapseSpaces(input.seoDescription) || plainText(input.shortDescription);
  const slug = input.slug.trim();
  return [
    {
      id: 'keyword',
      label: 'Có từ khóa chính trong tiêu đề',
      ok: keyword !== '' && effectiveTitle.includes(keyword),
      hint: keyword === '' ? 'Nhập "Từ khóa chính" để kiểm tra' : undefined,
    },
    {
      id: 'description',
      label: 'Mô tả đủ dài',
      ok: Array.from(description).length >= SEO_LIMITS.descriptionWarnMin,
      hint: 'Từ 70 ký tự trở lên',
    },
    { id: 'image', label: 'Có ảnh đại diện', ok: input.thumbnail.trim() !== '' },
    {
      id: 'slug',
      label: 'Có đường dẫn gọn',
      ok: /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length <= 75,
      hint: 'Chữ thường không dấu, tối đa 75 ký tự',
    },
  ];
}

export function siteHostLabel(website: string | undefined): string {
  const host = (website ?? '').trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, '');
  return host || 'phuongnamrealty.vn';
}

// Settings ---------------------------------------------------------------------------------------

export function defaultCompanySeo(): CompanySeo {
  return {
    titleSuffix: SEO_DEFAULTS.titleSuffix,
    defaultDescription: '',
    defaultOgImage: '',
    googleSiteVerification: '',
    bingSiteVerification: '',
    googleHtmlFile: null,
    indexSite: true,
  };
}

export function normalizeCompanySeo(raw: unknown): CompanySeo {
  const base = defaultCompanySeo();
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return base;
  const r = raw as Record<string, unknown>;
  const file = r.googleHtmlFile as Partial<GoogleHtmlFile> | null | undefined;
  return {
    titleSuffix: typeof r.titleSuffix === 'string' ? r.titleSuffix : base.titleSuffix,
    defaultDescription: str(r.defaultDescription),
    defaultOgImage: str(r.defaultOgImage),
    googleSiteVerification: str(r.googleSiteVerification),
    bingSiteVerification: str(r.bingSiteVerification),
    googleHtmlFile: file && typeof file === 'object' ? { name: str(file.name), content: str(file.content) } : null,
    indexSite: r.indexSite !== false,
  };
}

// Accepts the bare code or the whole <meta ... content="CODE"> tag that Google/Bing show.
export function extractVerificationCode(input: string): string {
  const text = input.trim();
  const tag = /content\s*=\s*["']([^"']+)["']/i.exec(text);
  return (tag ? tag[1] : text).trim();
}

export const isVerificationCode = (value: string): boolean => VERIFICATION.test(value);
export const isGoogleHtmlFileName = (value: string): boolean => HTML_FILE_NAME.test(value);
export const isGoogleHtmlFileContent = (value: string): boolean => HTML_FILE_CONTENT.test(value);

// Problem text for the SEO settings form, or null when everything is acceptable.
export function validateCompanySeo(seo: CompanySeo): string | null {
  if (Array.from(seo.titleSuffix).length > SEO_LIMITS.suffixMax) return `Hậu tố tiêu đề tối đa ${SEO_LIMITS.suffixMax} ký tự.`;
  if (Array.from(seo.defaultDescription).length > SEO_LIMITS.descriptionMax) return `Mô tả mặc định tối đa ${SEO_LIMITS.descriptionMax} ký tự.`;
  if (seo.googleSiteVerification && !isVerificationCode(seo.googleSiteVerification)) {
    return 'Mã xác minh Google không hợp lệ (10-100 ký tự gồm chữ, số, "-" và "_").';
  }
  if (seo.bingSiteVerification && !isVerificationCode(seo.bingSiteVerification)) {
    return 'Mã xác minh Bing không hợp lệ (10-100 ký tự gồm chữ, số, "-" và "_").';
  }
  if (seo.googleHtmlFile) {
    if (!isGoogleHtmlFileName(seo.googleHtmlFile.name)) return 'Tên file xác minh phải có dạng google1234abcd5678.html (chữ thường và số).';
    if (!isGoogleHtmlFileContent(seo.googleHtmlFile.content)) return 'Nội dung file xác minh không hợp lệ (tối đa 200 ký tự, không chứa ký hiệu đặc biệt).';
  }
  return null;
}

// Stored form: empty strings stay as empty strings so the server shape is stable.
export function cleanCompanySeo(seo: CompanySeo): CompanySeo {
  return {
    titleSuffix: seo.titleSuffix,
    defaultDescription: collapseSpaces(seo.defaultDescription),
    defaultOgImage: seo.defaultOgImage.trim(),
    googleSiteVerification: seo.googleSiteVerification.trim(),
    bingSiteVerification: seo.bingSiteVerification.trim(),
    googleHtmlFile: seo.googleHtmlFile && seo.googleHtmlFile.name.trim()
      ? { name: seo.googleHtmlFile.name.trim(), content: seo.googleHtmlFile.content.trim() }
      : null,
    indexSite: seo.indexSite,
  };
}
