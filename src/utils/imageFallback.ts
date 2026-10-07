export const PLACEHOLDER_IMAGE = '/images/placeholder.svg';

const FALLBACKS: Record<string, string> = {
  logo: '/logo.svg',
  hero: '/images/hero-banner.svg',
};

// Image errors do not bubble, so one capturing listener on window covers every <img>,
// including ones inside rich-text HTML and admin thumbnails. Each element is swapped at most once.
export function installImageFallback(): void {
  window.addEventListener(
    'error',
    (event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement) || img.dataset.fallbackApplied) return;
      img.dataset.fallbackApplied = '1';
      img.dataset.missing = '1';
      img.removeAttribute('srcset');
      img.src = FALLBACKS[img.dataset.fallback ?? ''] ?? PLACEHOLDER_IMAGE;
    },
    true,
  );
}
