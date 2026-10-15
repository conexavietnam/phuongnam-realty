import { useEffect } from 'react';
import { ROBOTS_INDEX } from '@/utils/seo';
import type { PageSeo } from '@/utils/seo';

const FIRST_PATH = typeof window === 'undefined' ? '/' : window.location.pathname;

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  const selector = `meta[${attr}="${key}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (content === '') {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setCanonical(href: string): void {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (href === '') {
    link?.remove();
    return;
  }
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

const absolute = (origin: string, value: string): string => (value.startsWith('https://') ? value : origin + value);

// Keeps <head> in step with client-side navigation so it matches what server/seo/index.php injected for the
// same URL. The derivation lives in src/utils/seo.ts (PHP twin: server/src/seo.php).
export function useSeo(page: PageSeo, siteName: string): void {
  const { title, description, keywords, robots, image, ogType, path } = page;
  useEffect(() => {
    const origin = window.location.origin;
    const url = origin + path;
    const imageUrl = absolute(origin, image);
    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'keywords', keywords);
    upsertMeta('name', 'robots', robots);
    setCanonical(robots === ROBOTS_INDEX ? url : '');
    upsertMeta('property', 'og:type', ogType);
    upsertMeta('property', 'og:site_name', siteName);
    upsertMeta('property', 'og:locale', 'vi_VN');
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', imageUrl);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', imageUrl);
    // The JSON-LD the server wrote describes the first URL only; drop it once the visitor navigates away.
    if (window.location.pathname !== FIRST_PATH) {
      document.head.querySelectorAll('script[type="application/ld+json"]').forEach((node) => node.remove());
    }
  }, [title, description, keywords, robots, image, ogType, path, siteName]);
}
