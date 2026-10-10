export type ConsignmentStatus = 'draft' | 'published' | 'sold';

export type ConsignmentPurpose = 'ban' | 'cho-thue';

// A public consignment listing. The consignor's name and phone are never stored here:
// they stay in customer_leads, which only an admin session can read.
export interface ConsignmentListing {
  id: string;
  slug: string;
  status: ConsignmentStatus;
  title: string;
  purpose: ConsignmentPurpose;
  propertyType: string;
  region: string;
  location: string;
  district: string;
  // Billions of VND; 0 means "not set" and the site shows "Liên hệ".
  price: number;
  priceDisplay: string;
  area: number;
  bedrooms: number;
  bathrooms: number;
  direction: string;
  legal: string;
  shortDescription: string;
  fullDescription: string;
  thumbnail: string;
  images: string[];
  featured: boolean;
  createdAt: string;
  publishedAt: string;
}

export type LeadStatus = 'new' | 'processing' | 'approved' | 'rejected' | 'closed';

export interface CustomerLead {
  id: string;
  fullName: string;
  phone: string;
  purpose: 'ban' | 'cho-thue' | 'tu-van';
  region?: string;
  propertyType?: string;
  priceRange?: string;
  note?: string;
  createdAt: string;
  status: LeadStatus;
  source: 'consignment' | 'contact';
  internalNote?: string;
  consignmentId?: string;
}
