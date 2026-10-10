import { dataStorage } from '@/services/dataStorage';
import { getPriceBounds } from '@/utils/priceRange';

export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
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
