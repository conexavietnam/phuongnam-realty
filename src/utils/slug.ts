export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

// Returns `base`, or `base-2`, `base-3`... until `isTaken` is false.
export function uniqueSlug(base: string, isTaken: (slug: string) => boolean): string {
  const root = base || 'tin-ky-gui';
  if (!isTaken(root)) return root;
  let n = 2;
  while (isTaken(`${root}-${n}`)) n += 1;
  return `${root}-${n}`;
}
