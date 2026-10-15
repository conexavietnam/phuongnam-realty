export const MAX_OLD_SLUGS = 10;

interface Sluggable {
  slug: string;
  oldSlugs?: string[];
}

// oldSlugs to store with an item being saved: the stored item's history plus its previous slug when it changed.
// Deduplicated, never contains the new slug, capped at the newest MAX_OLD_SLUGS. undefined when empty.
export function nextOldSlugs(stored: Sluggable | undefined, newSlug: string): string[] | undefined {
  if (!stored) return undefined;
  const history = [...(stored.oldSlugs ?? []), ...(stored.slug && stored.slug !== newSlug ? [stored.slug] : [])];
  const unique = history.filter((slug, i) => slug !== newSlug && history.lastIndexOf(slug) === i);
  const capped = unique.slice(-MAX_OLD_SLUGS);
  return capped.length > 0 ? capped : undefined;
}
