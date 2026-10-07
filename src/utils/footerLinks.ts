export type FooterLinkKind = 'internal' | 'external' | 'mail' | 'tel';

// Only these shapes are ever rendered as links; anything else (javascript:, data:, //host) is rejected.
export function classifyFooterUrl(raw: string): FooterLinkKind | null {
  const url = raw.trim();
  if (!url || /[\s"'<>]/.test(url)) return null;
  if (/^\/(?!\/)/.test(url)) return 'internal';
  if (/^https:\/\/[^/?#]+/i.test(url)) return 'external';
  if (/^mailto:[^\s@]+@[^\s@]+$/i.test(url)) return 'mail';
  if (/^tel:\+?[0-9][0-9.\-()]*$/i.test(url)) return 'tel';
  return null;
}
