import DOMPurify from 'dompurify';

/** Sanitize at the rendering boundary, including historical API content. */
export function sanitizeRichText(html: string): string {
  // The app is a SPA. Never return raw HTML if rendered without a DOM.
  if (!DOMPurify.isSupported) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      's',
      'strike',
      'ul',
      'ol',
      'li',
      'blockquote',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'pre',
      'code',
      'hr',
      'span',
    ],
    ALLOWED_ATTR: ['start'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  });
}
