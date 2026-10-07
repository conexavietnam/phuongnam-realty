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

export interface MenuItem {
  label: string;
  path: string;
  icon?: string;
  exact?: boolean;
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
