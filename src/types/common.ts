import type { CompanySeo } from './seo';

export interface Image {
  src: string;
  alt: string;
}

export interface SEOMeta {
  title: string;
  description: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FilterOption {
  value: string;
  label: string;
}

// Submenu entry of a header menu item (one level only).
export interface MenuChild {
  id?: string;
  label: string;
  path: string;
  visible?: boolean;
  newTab?: boolean;
}

// Entry of menu.desktop or menu.mobileBottomNav. Data saved before the menu editor only has label, path, exact and icon.
export interface MenuItem {
  id?: string;
  label: string;
  path: string;
  icon?: string;
  exact?: boolean;
  visible?: boolean;
  newTab?: boolean;
  children?: MenuChild[];
}

export interface FooterLink {
  label: string;
  url: string;
}

export interface FooterColumn {
  id: string;
  title: string;
  links: FooterLink[];
}

export interface FooterConfig {
  columns: FooterColumn[];
  copyright: string;
}

export interface MenuConfig {
  desktop: MenuItem[];
  mobileBottomNav: MenuItem[];
  // Missing in data saved before the footer became editable; readers fall back to the seeded default.
  footer?: FooterConfig;
}

export interface SocialLinks {
  facebook: string;
  zalo: string;
  youtube: string;
  instagram: string;
}

export interface CompanyInfo {
  name: string;
  slogan: string;
  heroTitle: string;
  heroSubtitle: string;
  heroBannerImage?: string;
  logoImage?: string;
  address: string;
  hotline: string;
  email: string;
  website: string;
  workingHours: string;
  social: SocialLinks;
  googleMapsEmbed: string;
  googleMapsLink: string;
  seo?: CompanySeo;
}

// Bounds are in billions of VND (inclusive); null/undefined means open-ended.
export interface PriceRangeOption extends FilterOption {
  min?: number | null;
  max?: number | null;
}

export interface FilterConfig {
  regions: FilterOption[];
  propertyTypes: FilterOption[];
  priceRanges: PriceRangeOption[];
}
