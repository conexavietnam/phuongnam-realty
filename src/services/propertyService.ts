import propertiesData from '@/data/properties.json';
import type { Property, PropertyFilter, PaginatedResult, PaginationParams } from '@/types';

const properties = propertiesData as Property[];

function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');
}

function matchesPriceRange(price: number, range: string): boolean {
  if (!range) return true;
  if (price <= 0) return false;

  const priceInBillion = price >= 1_000_000 ? price / 1_000_000_000 : price;
  const normalized = range.toLowerCase().trim();

  if (['duoi-3-ty', 'duoi-3', '0-3', '<3'].includes(normalized)) {
    return priceInBillion <= 3;
  }
  if (['3-5-ty', '3-5'].includes(normalized)) {
    return priceInBillion >= 3 && priceInBillion <= 5;
  }
  if (['5-10-ty', '5-10'].includes(normalized)) {
    return priceInBillion >= 5 && priceInBillion <= 10;
  }
  if (['10-20-ty', '10-20'].includes(normalized)) {
    return priceInBillion >= 10 && priceInBillion <= 20;
  }
  if (['tren-20-ty', 'tren-20', '20+', '>20'].includes(normalized)) {
    return priceInBillion >= 20;
  }

  if (normalized.endsWith('+')) {
    const min = parseFloat(normalized.slice(0, -1));
    return !isNaN(min) ? priceInBillion >= min : true;
  }

  const parts = normalized.split('-');
  if (parts.length === 2) {
    const min = parseFloat(parts[0]);
    const max = parseFloat(parts[1]);
    if (!isNaN(min) && !isNaN(max)) {
      return priceInBillion >= min && priceInBillion <= max;
    }
  }

  return true;
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
    return properties;
  },

  getFeatured(): Property[] {
    return properties.filter((p) => p.featured);
  },

  getBySlug(slug: string): Property | undefined {
    return properties.find((p) => p.slug === slug);
  },

  getById(id: string): Property | undefined {
    return properties.find((p) => p.id === id);
  },

  getByProjectId(projectId: string): Property[] {
    return properties.filter((p) => p.projectId === projectId);
  },

  getRelated(currentId: string, limit: number = 3): Property[] {
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
    const items = filters ? this.filter(filters) : properties;
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
