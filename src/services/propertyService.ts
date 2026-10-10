import { mergedProperties } from '@/utils/consignmentAdapters';
import { matchesPriceRange, normalizeForSearch } from '@/utils/listingFilter';
import type { Property, PropertyFilter, PaginatedResult, PaginationParams } from '@/types';

export function matchesRegion(property: Property, region: string): boolean {
  if (!region) return true;
  const search = normalizeForSearch(region);
  const district = normalizeForSearch(property.district || '');
  const location = normalizeForSearch(property.location || '');
  return district.includes(search) || location.includes(search) || search.includes(district);
}

export const propertyService = {
  getAll(): Property[] {
    return mergedProperties();
  },

  getFeatured(): Property[] {
    return mergedProperties().filter((p) => p.featured);
  },

  getBySlug(slug: string): Property | undefined {
    return mergedProperties().find((p) => p.slug === slug);
  },

  getById(id: string): Property | undefined {
    return mergedProperties().find((p) => p.id === id);
  },

  getByProjectId(projectId: string): Property[] {
    return mergedProperties().filter((p) => p.projectId === projectId);
  },

  getRelated(currentId: string, limit: number = 3): Property[] {
    const properties = mergedProperties();
    const current = properties.find((p) => p.id === currentId);
    if (!current) {
      return properties.filter((p) => p.id !== currentId).slice(0, limit);
    }
    const sameProject = properties.filter(
      (p) => p.id !== currentId && p.projectId === current.projectId
    );
    const sameType = properties.filter(
      (p) => p.id !== currentId && p.projectId !== current.projectId && p.type === current.type
    );
    const others = properties.filter(
      (p) => p.id !== currentId && p.projectId !== current.projectId && p.type !== current.type
    );
    return [...sameProject, ...sameType, ...others].slice(0, limit);
  },

  filter(filters: PropertyFilter): Property[] {
    const properties = mergedProperties();
    return properties.filter((item) => {
      if (filters.type && item.type !== filters.type) {
        return false;
      }
      if (filters.region && !matchesRegion(item, filters.region)) {
        return false;
      }
      if (filters.priceRange && !matchesPriceRange(item.price, filters.priceRange)) {
        return false;
      }
      if (filters.keyword) {
        const keywordNorm = normalizeForSearch(filters.keyword);
        const titleNorm = normalizeForSearch(item.title);
        if (!titleNorm.includes(keywordNorm)) {
          return false;
        }
      }
      return true;
    });
  },

  getPaginated(params: PaginationParams, filters?: PropertyFilter): PaginatedResult<Property> {
    const items = filters ? this.filter(filters) : mergedProperties();
    const { page, pageSize } = params;
    const start = (page - 1) * pageSize;
    const data = items.slice(start, start + pageSize);
    return {
      data,
      total: items.length,
      page,
      pageSize,
      totalPages: Math.ceil(items.length / pageSize),
    };
  },
};
