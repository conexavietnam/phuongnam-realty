// SEO derivation rules. The PHP twin is server/src/seo.php: KEEP BOTH IDENTICAL.
// Shared test vectors: server/tests/seo-vectors.json (run by `node scripts/check-seo.mjs` here and by smoke.sh there).
//
// Rules
//  1. plainText(html): block-closing tags and <br> become a space, remaining tags are dropped, common
//     entities are decoded, whitespace (incl. U+00A0) collapses to one space, result is trimmed.
//  2. snippet(text, 155): text unchanged when it has <= 155 characters (code points). Otherwise cut to 155,
//     back up to the last space when that space is at index >= 100, strip trailing " ,;:.-" and append "…".
//  3. Title: item.seo.title (trimmed, whitespace collapsed) as is; otherwise <item title> + site titleSuffix.
//  4. Description: item.seo.description; else snippet(plainText(short description or excerpt));
//     else snippet(plainText(full text)); else the site default description.
//  5. Image: first usable of seo.ogImage, thumbnail, images[0], site default OG image. "Usable" = a /uploads/ or
//     /images/ path or an https URL, and not an .svg (social crawlers cannot show SVG).
//  6. Keywords: trimmed, whitespace collapsed, <= 60 chars each, de-duplicated (case-insensitive), <= 15, joined ", ".
//  7. Robots: "noindex, nofollow" when the item has seo.noindex or the site has indexSite === false, else "index, follow".
//  8. News category page (/tin-tuc/danh-muc/<slug>): title = seo.title, else label + titleSuffix; description =
//     seo.description, else snippet(category description), else "Tin tức chuyên mục <label>: cập nhật mới nhất từ <site>.";
//     image = site default; robots noindex when the site is not indexed or the category has no indexable article.
import type { CompanySeo, ItemSeo } from '@/types/seo';

export const SEO_DEFAULTS = {
  siteName: 'Phương Nam Realty',
  titleSuffix: ' | Phương Nam Realty',
  description:
    'Bất động sản Phương Nam — Kiến tạo giá trị, Đồng hành cùng bạn. Phân phối, chuyển nhượng, ký gửi bất động sản uy tín.',
  ogImage: '/images/og-default.png',
} as const;

export const SNIPPET_MAX = 155;
const SNIPPET_MIN_CUT = 100;
export const MAX_KEYWORDS = 15;
export const MAX_KEYWORD_LENGTH = 60;
export const ROBOTS_INDEX = 'index, follow';
export const ROBOTS_NOINDEX = 'noindex, nofollow';

export type SeoKind = 'news' | 'project' | 'property' | 'consignment';

export interface SiteSeo {
  titleSuffix: string;
  description: string;
  ogImage: string;
  indexSite: boolean;
  siteName: string;
  slogan: string;
}

export interface PageSeo {
  title: string;
  description: string;
  keywords: string;
  robots: string;
  image: string;
  ogType: 'website' | 'article';
  // Path only (no host); used for canonical and og:url.
  path: string;
}

export interface CategoryLike {
  label?: unknown;
  description?: unknown;
  seo?: { title?: unknown; description?: unknown } | null;
}

export interface StaticPage {
  title: string;
  description: string;
}

// Titles/descriptions of the fixed pages; the title gets the site suffix like any other derived title.
export const STATIC_PAGES: Record<string, StaticPage> = {
  projects: {
    title: 'Dự án bất động sản',
    description:
      'Danh sách dự án bất động sản do Phương Nam Realty phân phối: căn hộ, nhà phố, biệt thự, đất nền với thông tin minh bạch, pháp lý rõ ràng.',
  },
  properties: {
    title: 'Bất động sản chuyển nhượng',
    description:
      'Bất động sản chuyển nhượng chọn lọc: căn hộ, nhà phố, biệt thự, đất nền có pháp lý rõ ràng, giá tốt, hỗ trợ xem nhà và thủ tục trọn gói.',
  },
  consignments: {
    title: 'Tin ký gửi bất động sản',
    description:
      'Tin ký gửi mua bán và cho thuê bất động sản đã được Phương Nam Realty xác minh. Đăng ký gửi nhà đất của bạn để được tư vấn miễn phí.',
  },
  news: {
    title: 'Tin tức & thị trường bất động sản',
    description:
      'Cập nhật tin tức, phân tích thị trường và xu hướng giá bất động sản mới nhất từ đội ngũ chuyên gia Phương Nam Realty.',
  },
  contact: {
    title: 'Liên hệ tư vấn',
    description:
      'Liên hệ Phương Nam Realty để được tư vấn mua bán, thuê, ký gửi bất động sản. Hotline, email và địa chỉ văn phòng.',
  },
  notFound: {
    title: 'Không tìm thấy trang',
    description: 'Trang bạn tìm không tồn tại hoặc đã được di chuyển.',
  },
  admin: {
    title: 'Quản trị',
    description: 'Khu vực quản trị nội bộ.',
  },
};

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\xa0', hellip: '…', ndash: '–', mdash: '—',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»', copy: '©', middot: '·', bull: '•',
};

function decodeEntities(value: string): string {
  return value.replace(/&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([a-zA-Z]{2,8}));/g, (match, dec, hex, name) => {
    if (name !== undefined) return ENTITIES[name] ?? match;
    const code = dec !== undefined ? Number(dec) : parseInt(hex, 16);
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : match;
  });
}

export function collapseSpaces(value: string): string {
  return value.replace(/[\s\xa0]+/g, ' ').trim();
}

export function plainText(html: string | null | undefined): string {
  const source = html ?? '';
  const spaced = source
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<\/(?:p|div|h[1-6]|li|ul|ol|blockquote|tr)\s*>|<br\s*\/?>/gi, ' ')
    .replace(/<\/?[a-zA-Z!][^>]*>/g, '');
  return collapseSpaces(decodeEntities(spaced));
}

export function snippet(value: string, max: number = SNIPPET_MAX): string {
  const clean = collapseSpaces(value);
  const chars = Array.from(clean);
  if (chars.length <= max) return clean;
  let cut = chars.slice(0, max);
  const space = cut.lastIndexOf(' ');
  if (space >= SNIPPET_MIN_CUT) cut = cut.slice(0, space);
  return cut.join('').replace(/[\s,;:.\-–—]+$/u, '') + '…';
}

const SAFE_IMAGE = /^(?:\/(?:uploads|images)\/[^\s"'<>\\]*|https:\/\/[^\s"'<>\\]+)$/;

// '' when the value cannot be used as a social-preview image.
export function usableImage(value: unknown): string {
  if (typeof value !== 'string') return '';
  const v = value.trim();
  if (v === '' || v.length > 500 || !SAFE_IMAGE.test(v)) return '';
  const withoutQuery = v.split(/[?#]/)[0].toLowerCase();
  return withoutQuery.endsWith('.svg') ? '' : v;
}

export function cleanKeywords(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of list) {
    if (typeof entry !== 'string') continue;
    const keyword = Array.from(collapseSpaces(entry)).slice(0, MAX_KEYWORD_LENGTH).join('');
    const key = keyword.toLowerCase();
    if (keyword === '' || seen.has(key)) continue;
    seen.add(key);
    out.push(keyword);
    if (out.length >= MAX_KEYWORDS) break;
  }
  return out;
}

const str = (value: unknown): string => (typeof value === 'string' ? value : '');

interface CompanyLike {
  name?: unknown;
  slogan?: unknown;
  seo?: Partial<CompanySeo> | null;
}

export function siteSeo(company: CompanyLike | null | undefined): SiteSeo {
  const seo = company?.seo ?? {};
  return {
    titleSuffix: typeof seo.titleSuffix === 'string' ? seo.titleSuffix : SEO_DEFAULTS.titleSuffix,
    description: collapseSpaces(str(seo.defaultDescription)) || SEO_DEFAULTS.description,
    ogImage: usableImage(seo.defaultOgImage) || SEO_DEFAULTS.ogImage,
    indexSite: seo.indexSite !== false,
    siteName: collapseSpaces(str(company?.name)) || SEO_DEFAULTS.siteName,
    slogan: collapseSpaces(str(company?.slogan)),
  };
}

export function homeTitle(site: SiteSeo): string {
  return site.slogan ? `${site.siteName} — ${site.slogan}` : site.siteName;
}

export function withSuffix(title: string, site: SiteSeo): string {
  return collapseSpaces(title) + site.titleSuffix;
}

export function staticPageSeo(key: keyof typeof STATIC_PAGES, path: string, site: SiteSeo): PageSeo {
  const page = STATIC_PAGES[key];
  const hidden = key === 'notFound' || key === 'admin';
  return {
    title: withSuffix(page.title, site),
    description: page.description,
    keywords: '',
    robots: hidden || !site.indexSite ? ROBOTS_NOINDEX : ROBOTS_INDEX,
    image: site.ogImage,
    ogType: 'website',
    path,
  };
}

export function homeSeo(site: SiteSeo): PageSeo {
  return {
    title: homeTitle(site),
    description: site.description,
    keywords: '',
    robots: site.indexSite ? ROBOTS_INDEX : ROBOTS_NOINDEX,
    image: site.ogImage,
    ogType: 'website',
    path: '/',
  };
}

// raw = the stored item (any of the four collections); only the fields below are read.
export function itemSeo(kind: SeoKind, raw: Record<string, unknown>, site: SiteSeo, path: string): PageSeo {
  const seo = (typeof raw.seo === 'object' && raw.seo !== null ? raw.seo : {}) as Partial<ItemSeo>;
  const baseTitle = collapseSpaces(str(kind === 'project' ? raw.name : raw.title) || str(raw.name));
  const short = kind === 'news' ? str(raw.excerpt) : str(raw.shortDescription);
  const full = kind === 'news' ? str(raw.content) : str(raw.fullDescription);
  const images = Array.isArray(raw.images) ? raw.images : [];
  const customTitle = collapseSpaces(str(seo.title));
  const customDescription = collapseSpaces(str(seo.description));
  const image =
    [seo.ogImage, raw.thumbnail, images[0]].map(usableImage).find((i) => i !== '') ?? site.ogImage;
  return {
    title: customTitle || withSuffix(baseTitle, site),
    description:
      customDescription || snippet(plainText(short)) || snippet(plainText(full)) || site.description,
    keywords: cleanKeywords(seo.keywords).join(', '),
    robots: !site.indexSite || seo.noindex === true ? ROBOTS_NOINDEX : ROBOTS_INDEX,
    image,
    ogType: kind === 'news' ? 'article' : 'website',
    path,
  };
}

// Meta of /tin-tuc/danh-muc/<slug>. indexableCount = articles of the category that may be indexed.
export function categorySeo(category: CategoryLike, indexableCount: number, site: SiteSeo, path: string): PageSeo {
  const seo = category.seo ?? {};
  const label = collapseSpaces(str(category.label));
  const customTitle = collapseSpaces(str(seo.title));
  const customDescription = collapseSpaces(str(seo.description));
  const own = snippet(plainText(str(category.description)));
  return {
    title: customTitle || label + site.titleSuffix,
    description: customDescription || own || `Tin tức chuyên mục ${label}: cập nhật mới nhất từ ${site.siteName}.`,
    keywords: '',
    robots: !site.indexSite || indexableCount === 0 ? ROBOTS_NOINDEX : ROBOTS_INDEX,
    image: site.ogImage,
    ogType: 'website',
    path,
  };
}
