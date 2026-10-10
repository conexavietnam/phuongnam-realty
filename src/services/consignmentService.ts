import { dataStorage } from '@/services/dataStorage';
import { companyService } from '@/services/companyService';
import { matchesPriceRange, normalizeForSearch } from '@/utils/listingFilter';
import {
  DESCRIPTION_REWRITE_MESSAGE,
  isPubliclyVisible,
  needsDescriptionRewrite,
  priceLabel,
  sortForPublic,
} from '@/utils/consignment';
import { slugify, uniqueSlug } from '@/utils/slug';
import { typeLabel } from '@/utils/typeLabel';
import type { ConsignmentListing, ConsignmentSection, ConsignmentStatus, CustomerLead, PropertyFilter } from '@/types';

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

  // Only listings that belong on /ky-gui; promoted ones appear through propertyService/projectService.
  getKyGui(): ConsignmentListing[] {
    return this.getPublic().filter((i) => i.section === 'ky-gui');
  },

  getLatest(limit: number): ConsignmentListing[] {
    return this.getKyGui().filter((i) => i.status === 'published').slice(0, limit);
  },

  getPublicBySlug(slug: string): ConsignmentListing | undefined {
    return this.getPublic().find((i) => i.slug === slug);
  },

  filter(filters: PropertyFilter): ConsignmentListing[] {
    return this.getKyGui().filter((item) => {
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
    return this.getKyGui().filter((i) => i.id !== current.id).slice(0, limit);
  },

  propertyTypeLabel(value: string): string {
    return typeLabel(value) || 'Bất động sản';
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

  // Slugs are unique across properties, projects and consignment listings.
  findSlugOwner(slug: string, exceptId: string): string | null {
    if (dataStorage.getProperties().some((p) => p.slug === slug && p.id !== exceptId)) return 'BĐS chuyển nhượng';
    if (dataStorage.getProjects().some((p) => p.slug === slug && p.id !== exceptId)) return 'Dự án';
    if (dataStorage.getConsignments().some((i) => i.slug === slug && i.id !== exceptId)) return 'Tin ký gửi';
    return null;
  },

  // Same Vietnamese message in every editor (consignment, project, property).
  slugConflictMessage(slug: string, exceptId: string): string | null {
    const owner = this.findSlugOwner(slug, exceptId);
    return owner ? `Đường dẫn "${slug}" đã được dùng bởi một mục khác (${owner}). Vui lòng đổi sang đường dẫn khác.` : null;
  },

  isSlugTaken(slug: string, exceptId: string): boolean {
    return this.findSlugOwner(slug, exceptId) !== null;
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
      section: 'ky-gui',
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
      floor: '',
      view: '',
      investor: '',
      projectStatus: '',
      priceFrom: '',
      categoryLabel: '',
      highlights: [],
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
  createDraftFromLead(lead: CustomerLead, section: ConsignmentSection = 'ky-gui'): ConsignmentListing {
    const id = `consign-${lead.id}`;
    const filters = companyService.getFilterConfig();
    const regionLabel = lead.region ? lookupLabel(filters.regions, lead.region) : '';
    const typeLabel = lead.propertyType ? lookupLabel(filters.propertyTypes, lead.propertyType) : '';
    const title = [typeLabel || 'Bất động sản', regionLabel].filter(Boolean).join(' - ');
    return {
      ...this.createBlank(),
      id,
      section,
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

  getLeadOf(listingId: string): CustomerLead | undefined {
    return dataStorage.getCustomerLeads().find((l) => l.consignmentId === listingId);
  },

  // True when publishing this listing must wait for the admin to rewrite the short description.
  isPublishBlocked(listing: ConsignmentListing): boolean {
    return listing.status !== 'draft' && needsDescriptionRewrite(listing, this.getLeadOf(listing.id));
  },

  // Saves a listing and keeps its application in step: sold closes it, leaving sold reopens it as approved.
  async save(listing: ConsignmentListing): Promise<void> {
    if (this.isPublishBlocked(listing)) throw new Error(DESCRIPTION_REWRITE_MESSAGE);
    const previous = dataStorage.getConsignments().find((i) => i.id === listing.id);
    const publishing = listing.status !== 'draft' && (!previous || previous.status === 'draft');
    const next = { ...listing, publishedAt: publishing ? new Date().toISOString() : listing.publishedAt };
    await dataStorage.saveConsignment(next);

    const lead = this.getLeadOf(listing.id);
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
  async approveLead(lead: CustomerLead, section: ConsignmentSection = 'ky-gui'): Promise<ConsignmentListing> {
    // A previous attempt may have saved the draft but failed to link the lead: reuse it, never duplicate.
    const draftId = lead.consignmentId ?? `consign-${lead.id}`;
    const existing = dataStorage.getConsignments().find((i) => i.id === draftId);
    const resection = existing?.status === 'draft' && existing.section !== section;
    const listing = existing ? { ...existing, section: resection ? section : existing.section } : this.createDraftFromLead(lead, section);
    if (!existing || resection) await dataStorage.saveConsignment(listing);
    await dataStorage.updateLead(lead.id, { status: 'approved', consignmentId: listing.id });
    return listing;
  },

  // Deleting a listing detaches its application so it can be approved again.
  async remove(id: string): Promise<void> {
    await dataStorage.deleteConsignment(id);
    const lead = this.getLeadOf(id);
    if (lead) await dataStorage.updateLead(lead.id, { consignmentId: undefined, status: 'processing' });
  },
};
