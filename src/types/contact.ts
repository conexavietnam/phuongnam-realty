export interface ContactFormData {
  fullName: string;
  phone: string;
  email: string;
  subject: string;
  region: string;
  propertyType: string;
  priceRange: string;
  message: string;
}

export interface ConsignmentFormData {
  fullName: string;
  phone: string;
  purpose: 'ban' | 'cho-thue';
  region: string;
  propertyType: string;
  priceRange: string;
  note?: string;
}

export interface ConsignmentProject {
  id: string;
  slug: string;
  name: string;
  category: string;
  location: string;
  shortDescription: string;
  thumbnail: string;
  images: string[];
}

export interface Agent {
  id: string;
  name: string;
  title: string;
  phone: string;
  zaloLink: string;
  avatar: string;
}
