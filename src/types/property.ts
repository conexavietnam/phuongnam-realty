export type PropertyType = 'can-ho' | 'nha-pho' | 'biet-thu' | 'shophouse' | 'dat-nen';

export interface Property {
  id: string;
  slug: string;
  title: string;
  projectId: string;
  type: PropertyType;
  category: string;
  location: string;
  district: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  floor: string;
  view: string;
  direction: string;
  legal: string;
  price: number;
  priceDisplay: string;
  shortDescription: string;
  fullDescription: string;
  images: string[];
  thumbnail: string;
  featured: boolean;
  agentId: string;
  createdAt: string;
}

export interface PropertyFilter {
  region?: string;
  type?: PropertyType;
  priceRange?: string;
  keyword?: string;
}
