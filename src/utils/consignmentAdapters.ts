import { dataStorage } from '@/services/dataStorage';
import { isPubliclyVisible, priceLabel, sortForPublic } from '@/utils/consignment';
import { typeLabel } from '@/utils/typeLabel';
import type {
  ConsignmentListing,
  ConsignmentSection,
  Project,
  ProjectCategory,
  Property,
  PropertyType,
} from '@/types';

// Listings whose section is BĐS chuyển nhượng / Dự án are shown through the same cards and detail
// pages as native properties/projects. The listing stays the single source of truth; these adapters
// only reshape it at read time.

const soldStatus = (item: ConsignmentListing): 'published' | 'sold' => (item.status === 'sold' ? 'sold' : 'published');

export function consignmentToProperty(item: ConsignmentListing): Property {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    projectId: '',
    type: item.propertyType as PropertyType,
    category: typeLabel(item.propertyType) || 'Bất động sản',
    location: item.location,
    district: item.district,
    bedrooms: item.bedrooms,
    bathrooms: item.bathrooms,
    area: item.area,
    floor: item.floor,
    view: item.view,
    direction: item.direction,
    legal: item.legal,
    price: item.price,
    priceDisplay: priceLabel(item),
    shortDescription: item.shortDescription,
    fullDescription: item.fullDescription,
    images: item.images.length > 0 ? item.images : item.thumbnail ? [item.thumbnail] : [],
    thumbnail: item.thumbnail,
    featured: item.featured,
    agentId: '',
    createdAt: item.publishedAt || item.createdAt,
    consignmentStatus: soldStatus(item),
  };
}

const PROJECT_CATEGORY: Record<string, ProjectCategory> = { 'can-ho': 'cao-cap' };

export function consignmentToProject(item: ConsignmentListing): Project {
  return {
    id: item.id,
    slug: item.slug,
    name: item.title,
    category: PROJECT_CATEGORY[item.propertyType] ?? (item.propertyType as ProjectCategory),
    categoryLabel: item.categoryLabel || typeLabel(item.propertyType),
    location: item.location,
    priceFrom: item.priceFrom || priceLabel(item),
    bedrooms: item.bedrooms > 0 ? `${item.bedrooms} PN` : '',
    area: item.area > 0 ? `${item.area} m²` : '',
    shortDescription: item.shortDescription,
    fullDescription: item.fullDescription,
    images: item.images.length > 0 ? item.images : item.thumbnail ? [item.thumbnail] : [],
    thumbnail: item.thumbnail,
    featured: item.featured,
    highlights: item.highlights,
    investor: item.investor,
    status: item.projectStatus,
    consignmentStatus: soldStatus(item),
  };
}

function promoted(section: ConsignmentSection, takenSlugs: Set<string>): ConsignmentListing[] {
  return sortForPublic(
    dataStorage
      .getConsignments()
      .filter((i) => isPubliclyVisible(i) && i.section === section && !takenSlugs.has(i.slug)),
  );
}

// Sold ones go last; promoted (newest first) come before the native items so new posts are seen.
function soldLast<T extends { consignmentStatus?: string }>(items: T[]): T[] {
  return [...items.filter((i) => i.consignmentStatus !== 'sold'), ...items.filter((i) => i.consignmentStatus === 'sold')];
}

// Native items win when a promoted listing has the same slug.
export function mergedProperties(): Property[] {
  const native = dataStorage.getProperties();
  const extra = promoted('chuyen-nhuong', new Set(native.map((p) => p.slug))).map(consignmentToProperty);
  return soldLast([...extra, ...native]);
}

export function mergedProjects(): Project[] {
  const native = dataStorage.getProjects();
  const extra = promoted('du-an', new Set(native.map((p) => p.slug))).map(consignmentToProject);
  return soldLast([...extra, ...native]);
}
