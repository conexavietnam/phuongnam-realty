export type ProjectCategory = 'cao-cap' | 'shophouse' | 'biet-thu' | 'nha-pho' | 'dat-nen';

export interface Project {
  id: string;
  slug: string;
  name: string;
  category: ProjectCategory;
  categoryLabel: string;
  location: string;
  priceFrom: string;
  bedrooms: string;
  area: string;
  shortDescription: string;
  fullDescription: string;
  images: string[];
  thumbnail: string;
  featured: boolean;
  highlights: string[];
  investor: string;
  status: string;
}
