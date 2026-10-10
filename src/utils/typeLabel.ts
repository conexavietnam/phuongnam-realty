import { dataStorage } from '@/services/dataStorage';

// Project categories that are not in the property-type filter list.
const EXTRA_LABELS: Record<string, string> = { 'cao-cap': 'Căn hộ cao cấp' };

// "biet-thu" -> "Biet thu": last resort for codes nobody has labelled.
export function humanize(code: string): string {
  const text = code.replace(/[-_]+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Turns a type/category code into the label configured in the filters collection.
// Values that are already readable text (no matching code) pass through humanized.
export function typeLabel(code: string | undefined | null): string {
  if (!code) return '';
  const fromFilters = dataStorage.getFilters().propertyTypes.find((o) => o.value === code)?.label;
  return fromFilters ?? EXTRA_LABELS[code] ?? humanize(code);
}
