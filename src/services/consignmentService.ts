import { dataStorage } from '@/services/dataStorage';
import { companyService } from '@/services/companyService';
import { matchesPriceRange, normalizeForSearch } from '@/services/propertyService';
import { isPubliclyVisible, priceLabel, sortForPublic } from '@/utils/consignment';
import { slugify, uniqueSlug } from '@/utils/slug';
import type { ConsignmentListing, ConsignmentStatus, CustomerLead, PropertyFilter } from '@/types';

function matchesRegion(item: ConsignmentListing, region: string): boolean {
  if (item.region === region) return true;
  const search = normalizeForSearch(region);
  return (
    normalizeForSearch(item.location).includes(search) ||
    normalizeForSearch(item.district).includes(search)
  );
}

function lookupLabel(options: Array<{ value: string; label: string }>, value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export const consignmentService = {
  // Admin view: every listing including drafts (the API only returns drafts to an admin session).
  getAll(): ConsignmentListing[] {
    return dataStorage.getConsignments();
  },

  // Public view: the API already hides drafts; filtered again here so a stale admin cache never leaks them.
  getPublic(): ConsignmentListing[] {
    return sortForPublic(dataStorage.getConsignments().filter(isPubliclyVisible));
  },

  getLatest(limit: number): ConsignmentListing[] {
    return this.getPublic().filter((i) => i.status === 'published').slice(0, limit);
  },

  getPublicBySlug(slug: string): ConsignmentListing | undefined {
    return this.getPublic().find((i) => i.slug === slug);
  },

  filter(filters: PropertyFilter): ConsignmentListing[] {
    return this.getPublic().filter((item) => {
      if (filters.type && item.propertyType !== filters.type) return false;
      if (filters.region && !matchesRegion(item, filters.region)) return false;
      if (filters.priceRange && !matchesPriceRange(item.price, filters.priceRange)) return false;
      if (filters.keyword && !normalizeForSearch(item.title).includes(normalizeForSearch(filters.keyword))) {
        return false;
      }
      return true;
    });
  },

  getRelated(current: ConsignmentListing, limit: number): ConsignmentListing[] {
    return this.getPublic().filter((i) => i.id !== current.id).slice(0, limit);
  },

  propertyTypeLabel(value: string): string {
    return lookupLabel(companyService.getFilterConfig().propertyTypes, value) || 'Bất động sản';
  },

  regionLabel(value: string): string {
    return lookupLabel(companyService.getFilterConfig().regions, value);
  },

  // Key facts shown on the detail page; rows without a value are left out.
  getFacts(item: ConsignmentListing): Array<{ label: string; value: string }> {
    const rows: Array<{ label: string; value: string }> = [
      { label: 'Nhu cầu', value: item.purpose === 'cho-thue' ? 'Cho thuê' : 'Cần bán' },
      { label: 'Loại hình', value: item.propertyType ? this.propertyTypeLabel(item.propertyType) : '' },
      { label: 'Khu vực', value: item.region ? this.regionLabel(item.region) : '' },
      { label: 'Vị trí', value: [item.location, item.district].filter(Boolean).join(', ') },
      { label: 'Mức giá', value: priceLabel(item) },
      { label: 'Diện tích', value: item.area > 0 ? `${item.area} m²` : '' },
      { label: 'Phòng ngủ', value: item.bedrooms > 0 ? `${item.bedrooms} PN` : '' },
      { label: 'Phòng tắm', value: item.bathrooms > 0 ? `${item.bathrooms} WC` : '' },
      { label: 'Hướng', value: item.direction },
      { label: 'Pháp lý', value: item.legal },
    ];
    return rows.filter((row) => row.value !== '');
  },

  isSlugTaken(slug: string, exceptId: string): boolean {
    return dataStorage.getConsignments().some((i) => i.slug === slug && i.id !== exceptId);
  },

  makeUniqueSlug(title: string, exceptId: string): string {
    return uniqueSlug(slugify(title), (slug) => this.isSlugTaken(slug, exceptId));
  },

  // Blank listing for "Tạo tin mới".
  createBlank(): ConsignmentListing {
    const now = new Date().toISOString();
    return {
      id: `consign-${Date.now()}`,
      slug: '',
      status: 'draft',
      title: '',
      purpose: 'ban',
      propertyType: '',
      region: '',
      location: '',
      district: '',
      price: 0,
      priceDisplay: '',
      area: 0,
      bedrooms: 0,
      bathrooms: 0,
      direction: '',
      legal: '',
      shortDescription: '',
      fullDescription: '',
      thumbnail: '',
      images: [],
      featured: false,
      createdAt: now,
      publishedAt: '',
    };
  },

  // Draft prefilled from an application. Owner name and phone are deliberately NOT copied.
  // The id derives from the lead id so a retried approval overwrites instead of duplicating.
  createDraftFromLead(lead: CustomerLead): ConsignmentListing {
    const id = `consign-${lead.id}`;
    const filters = companyService.getFilterConfig();
    const regionLabel = lead.region ? lookupLabel(filters.regions, lead.region) : '';
    const typeLabel = lead.propertyType ? lookupLabel(filters.propertyTypes, lead.propertyType) : '';
    const title = [typeLabel || 'Bất động sản', regionLabel].filter(Boolean).join(' - ');
    return {
      ...this.createBlank(),
      id,
      slug: this.makeUniqueSlug(title, id),
      title,
      purpose: lead.purpose === 'cho-thue' ? 'cho-thue' : 'ban',
      propertyType: lead.propertyType ?? '',
      region: lead.region ?? '',
      location: regionLabel,
      priceDisplay: lead.priceRange ? lookupLabel(filters.priceRanges, lead.priceRange) : '',
      shortDescription: lead.note ?? '',
    };
  },

  // Saves a listing and keeps its application in step: sold closes it, leaving sold reopens it as approved.
  async save(listing: ConsignmentListing): Promise<void> {
    const previous = dataStorage.getConsignments().find((i) => i.id === listing.id);
    const publishing = listing.status !== 'draft' && (!previous || previous.status === 'draft');
    const next = { ...listing, publishedAt: publishing ? new Date().toISOString() : listing.publishedAt };
    await dataStorage.saveConsignment(next);

    const lead = dataStorage.getCustomerLeads().find((l) => l.consignmentId === listing.id);
    if (!lead) return;
    if (next.status === 'sold' && lead.status !== 'closed') {
      await dataStorage.updateLead(lead.id, { status: 'closed' });
    } else if (next.status !== 'sold' && lead.status === 'closed') {
      await dataStorage.updateLead(lead.id, { status: 'approved' });
    }
  },

  setStatus(listing: ConsignmentListing, status: ConsignmentStatus): Promise<void> {
    return this.save({ ...listing, status });
  },

  // Approves an application: creates (or reuses) its draft listing and links both ways.
  async approveLead(lead: CustomerLead): Promise<ConsignmentListing> {
    const existing = lead.consignmentId
      ? dataStorage.getConsignments().find((i) => i.id === lead.consignmentId)
      : undefined;
    const listing = existing ?? this.createDraftFromLead(lead);
    if (!existing) await dataStorage.saveConsignment(listing);
    await dataStorage.updateLead(lead.id, { status: 'approved', consignmentId: listing.id });
    return listing;
  },

  // Deleting a listing detaches its application so it can be approved again.
  async remove(id: string): Promise<void> {
    await dataStorage.deleteConsignment(id);
    const lead = dataStorage.getCustomerLeads().find((l) => l.consignmentId === id);
    if (lead) await dataStorage.updateLead(lead.id, { consignmentId: undefined, status: 'processing' });
  },
};
