import type { PriceRangeOption } from '@/types/common';

export type PriceBounds = [number | null, number | null];

// Bounds for options saved before min/max existed (billions of VND).
const LEGACY_BOUNDS: Record<string, PriceBounds> = {
  'duoi-3-ty': [null, 3],
  '3-5-ty': [3, 5],
  '5-10-ty': [5, 10],
  '10-20-ty': [10, 20],
  'tren-20-ty': [20, null],
};

// Explicit bounds win; options without any bound fall back to the legacy table.
export function getPriceBounds(option: PriceRangeOption): PriceBounds | null {
  if (option.min != null || option.max != null) {
    return [option.min ?? null, option.max ?? null];
  }
  return LEGACY_BOUNDS[option.value] ?? null;
}
