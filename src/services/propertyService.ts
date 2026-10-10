import { dataStorage } from '@/services/dataStorage';
import { getPriceBounds } from '@/utils/priceRange';
import type { Property, PropertyFilter, PaginatedResult, PaginationParams } from '@/types';

export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');
}

export function matchesPriceRange(price: number, range: string): boolean {
  if (!range) return true;
  if (price <= 0) return false;

  const option = dataStorage.getFilters().priceRanges.find((o) => o.value === range);
  const bounds = option ? getPriceBounds(option) : null;
  if (!bounds) return true;

  const priceInBillion = price >= 1_000_000 ? price / 1_000_000_000 : price;
  const [min, max] = bounds;
  return (min === null || priceInBillion >= min) && (max === null || priceInBillion <= max);
}

function matchesRegion(property: Property, region: string): boolean {
  if (!region) return true;
  const search = normalizeForSearch(region);
  const district = normalizeForSearch(property.district || '');
  const location = normalizeForSearch(property.location || '');
  return district.includes(search) || location.includes(search) || search.includes(district);
}

export const propertyService = {
  getAll(): Property[] {
    return dataStorage.getProperties();
  },

  getFeatured(): Property[] {
    return dataStorage.getProperties().filter((p) => p.featured);
  },

  getBySlug(slug: string): Property | undefined {
    return dataStorage.getPropertyBySlug(slug);
  },

  getById(id: string): Property | undefined {
    return dataStorage.getProperties().find((p) => p.id === id);
  },

  getByProjectId(projectId: string): Property[] {
    return dataStorage.getProperties().filter((p) => p.projectId === projectId);
  },

  getRelated(currentId: string, limit: number = 3): Property[] {
    const properties = dataStorage.getProperties();
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
    const properties = dataStorage.getProperties();
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
    const items = filters ? this.filter(filters) : dataStorage.getProperties();
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
