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

export interface MenuConfig {
  desktop: MenuItem[];
  mobileBottomNav: MenuItem[];
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

export interface FilterConfig {
  regions: FilterOption[];
  propertyTypes: FilterOption[];
  priceRanges: FilterOption[];
}
