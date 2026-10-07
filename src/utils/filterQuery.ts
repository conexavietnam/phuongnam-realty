import type { FilterConfig, PropertyFilter, PropertyType } from '@/types';

// Query keys on /chuyen-nhuong: ?type=can-ho&region=quan-2&price=3-5-ty&q=keyword.
// type/region/price must be option values from the filters collection; unknown values are ignored.
export function filtersFromSearchParams(params: URLSearchParams, config: FilterConfig): PropertyFilter {
  const pick = (key: string, options: Array<{ value: string }>): string | undefined => {
    const value = params.get(key);
    return value && options.some((o) => o.value === value) ? value : undefined;
  };
  const keyword = params.get('q')?.trim().slice(0, 100);
  return {
    type: pick('type', config.propertyTypes) as PropertyType | undefined,
    region: pick('region', config.regions),
    priceRange: pick('price', config.priceRanges),
    keyword: keyword || undefined,
  };
}

export function searchParamsFromFilters(filters: PropertyFilter): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.region) params.set('region', filters.region);
  if (filters.priceRange) params.set('price', filters.priceRange);
  if (filters.keyword) params.set('q', filters.keyword);
  return params;
}
