import DOMPurify from 'dompurify';

// Isolated instance so the hooks below never affect other DOMPurify callers.
const purifier = DOMPurify(window);

const ALLOWED_TAGS = [
  'p', 'br', 'h2', 'h3', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'hr',
];
// `style` is kept only so the hook below can reduce it to a strict text-align value.
const ALLOWED_ATTR = ['href', 'target', 'rel', 'src', 'alt', 'width', 'height', 'loading', 'style'];

const SAFE_HREF = /^(https?:|mailto:|tel:|\/(?!\/)|#)/i;
const SAFE_IMG_SRC = /^(\/uploads\/|https:\/\/)/i;
const TEXT_ALIGN = /^\s*text-align:\s*(left|center|right|justify)\s*;?\s*$/i;
const ALIGNABLE = new Set(['P', 'H2', 'H3']);

purifier.addHook('afterSanitizeAttributes', (node) => {
  if (!(node instanceof Element)) return;

  const style = node.getAttribute('style');
  if (style !== null) {
    const match = ALIGNABLE.has(node.tagName) ? TEXT_ALIGN.exec(style) : null;
    if (match) node.setAttribute('style', `text-align: ${match[1].toLowerCase()}`);
    else node.removeAttribute('style');
  }

  if (node.tagName === 'A') {
    const href = node.getAttribute('href');
    if (href !== null && !SAFE_HREF.test(href.trim())) node.removeAttribute('href');
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }

  if (node.tagName === 'IMG') {
    const src = node.getAttribute('src');
    if (src === null || !SAFE_IMG_SRC.test(src.trim())) {
      node.remove();
      return;
    }
    node.setAttribute('loading', 'lazy');
  }
});

export function sanitizeRichHtml(html: string): string {
  return purifier.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

const HAS_HTML_TAG = /<\/?[a-z][a-z0-9]*(\s[^>]*)?\/?>/i;
const MARKDOWN_IMAGE = /^!\[(.*?)\]\((.*?)\)$/;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Legacy content is plain text: blank line = paragraph, single newline = <br>,
// and a lone `![alt](url)` paragraph = image. Content that already has HTML passes through.
export function toEditorHtml(value: string | undefined | null): string {
  const text = (value ?? '').replace(/\r\n?/g, '\n');
  if (text.trim() === '') return '';
  if (HAS_HTML_TAG.test(text)) return text;

  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const image = MARKDOWN_IMAGE.exec(block);
      if (image) return `<img src="${escapeHtml(image[2])}" alt="${escapeHtml(image[1])}">`;
      return `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`;
    })
    .join('');
}

// Safe HTML ready for dangerouslySetInnerHTML, for both legacy plain text and rich content.
export function renderRichHtml(value: string | undefined | null): string {
  return sanitizeRichHtml(toEditorHtml(value));
}

// Plain text for list cards / excerpts.
export function stripHtml(value: string | undefined | null): string {
  const text = value ?? '';
  if (!HAS_HTML_TAG.test(text)) return text.replace(/\s+/g, ' ').trim();
  const spaced = text.replace(/<\/(p|h[1-6]|li|blockquote)>|<br\s*\/?>/gi, ' ');
  const doc = new DOMParser().parseFromString(spaced, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

const EMPTY_P = /<p(?:\s[^>]*)?>(?:\s|<br\s*\/?>|&nbsp;)*<\/p>/.source;
const LEADING_EMPTY = new RegExp('^(?:\\s*' + EMPTY_P + ')+', 'i');
const TRAILING_EMPTY = new RegExp('(?:' + EMPTY_P + '\\s*)+$', 'i');

// Drops empty paragraphs at the start/end of editor output (TipTap keeps a trailing one).
export function trimEmptyParagraphs(html: string): string {
  return html.replace(LEADING_EMPTY, '').replace(TRAILING_EMPTY, '').trim();
}

// Value to store on save: legacy text converted, sanitized, empty edges removed.
export function normalizeEditorHtml(value: string | undefined | null): string {
  return trimEmptyParagraphs(renderRichHtml(value));
}
