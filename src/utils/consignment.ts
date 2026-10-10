import type {
  ConsignmentListing,
  ConsignmentPurpose,
  ConsignmentStatus,
  CustomerLead,
  LeadStatus,
} from '@/types';

export const CONSIGNMENT_STATUS_LABELS: Record<ConsignmentStatus, string> = {
  draft: 'Nháp',
  published: 'Đang đăng',
  sold: 'Đã giao dịch',
};

const LEGACY_LEAD_STATUS: Record<string, LeadStatus> = {
  contacted: 'processing',
  completed: 'closed',
  cancelled: 'rejected',
};

const LEAD_STATUSES: LeadStatus[] = ['new', 'processing', 'approved', 'rejected', 'closed'];
const LISTING_STATUSES: ConsignmentStatus[] = ['draft', 'published', 'sold'];

const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

// Data saved before the workflow existed has no status (published), `name` and `category`.
export function normalizeListing(raw: unknown): ConsignmentListing {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const status = LISTING_STATUSES.includes(r.status as ConsignmentStatus)
    ? (r.status as ConsignmentStatus)
    : 'published';
  const images = Array.isArray(r.images) ? r.images.filter((i): i is string => typeof i === 'string') : [];
  const createdAt = str(r.createdAt);
  return {
    id: str(r.id),
    slug: str(r.slug),
    status,
    title: str(r.title) || str(r.name),
    purpose: (r.purpose === 'cho-thue' ? 'cho-thue' : 'ban') as ConsignmentPurpose,
    propertyType: str(r.propertyType) || str(r.category),
    region: str(r.region),
    location: str(r.location),
    district: str(r.district),
    price: num(r.price),
    priceDisplay: str(r.priceDisplay),
    area: num(r.area),
    bedrooms: num(r.bedrooms),
    bathrooms: num(r.bathrooms),
    direction: str(r.direction),
    legal: str(r.legal),
    shortDescription: str(r.shortDescription),
    fullDescription: str(r.fullDescription),
    thumbnail: str(r.thumbnail),
    images,
    featured: r.featured === true,
    createdAt,
    publishedAt: str(r.publishedAt) || (status === 'draft' ? '' : createdAt),
  };
}

export function normalizeLead(raw: unknown): CustomerLead {
  const lead = raw as CustomerLead & { status: string };
  const mapped = LEGACY_LEAD_STATUS[lead.status] ?? lead.status;
  return { ...lead, status: LEAD_STATUSES.includes(mapped as LeadStatus) ? (mapped as LeadStatus) : 'new' };
}

export function purposeLabel(purpose: string): string {
  if (purpose === 'ban') return 'Cần bán';
  if (purpose === 'cho-thue') return 'Cho thuê';
  return 'Tư vấn';
}

export const DESCRIPTION_REWRITE_MESSAGE = 'Ghi chú của khách đang là mô tả ngắn — hãy viết lại trước khi đăng';

// A draft made from an application starts with the customer's note as its short description.
// It must be rewritten before publishing because the note may contain personal details.
export function needsDescriptionRewrite(listing: ConsignmentListing, lead?: CustomerLead): boolean {
  if (!lead) return false;
  const description = listing.shortDescription.trim();
  return description === '' || description === (lead.note ?? '').trim();
}

export function isPubliclyVisible(item: ConsignmentListing): boolean {
  return item.status === 'published' || item.status === 'sold';
}

// Published listings first (newest first), sold ones last.
export function sortForPublic(items: ConsignmentListing[]): ConsignmentListing[] {
  const rank = (i: ConsignmentListing) => (i.status === 'sold' ? 1 : 0);
  return [...items].sort(
    (a, b) => rank(a) - rank(b) || b.publishedAt.localeCompare(a.publishedAt),
  );
}

export function priceLabel(item: ConsignmentListing): string {
  return item.priceDisplay.trim() || (item.price > 0 ? `${item.price} Tỷ` : 'Liên hệ');
}

// Where an application stands in: Mới > Đang xử lý > Đã duyệt (nháp) > Đã đăng > Đã giao dịch, or Từ chối.
export type ApplicationStage = 'new' | 'processing' | 'draft' | 'published' | 'closed' | 'rejected';

export const STAGE_LABELS: Record<ApplicationStage, string> = {
  new: 'Mới',
  processing: 'Đang xử lý',
  draft: 'Đã duyệt (nháp)',
  published: 'Đã đăng',
  closed: 'Đã giao dịch',
  rejected: 'Từ chối',
};

export function applicationStage(lead: CustomerLead, listing?: ConsignmentListing): ApplicationStage {
  if (lead.status === 'approved') {
    if (listing?.status === 'published') return 'published';
    if (listing?.status === 'sold') return 'closed';
    return 'draft';
  }
  return lead.status;
}
