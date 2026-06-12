// Allowlist-based HTML sanitizer used on AI-generated description HTML before
// rendering with dangerouslySetInnerHTML and before persisting to the database.
// Only safe block/inline elements are kept; all attributes are stripped to
// eliminate event-handler and javascript:-URL injection vectors.

const ALLOWED_TAGS = new Set([
  'p', 'br', 'ul', 'ol', 'li',
  'b', 'strong', 'em', 'i',
  'h2', 'h3', 'h4', 'h5', 'h6',
  'span',
]);

export function sanitizeHtml(html: string): string {
  return html
    // Remove dangerous elements and their entire content
    .replace(/<(script|style|iframe|object|embed|form|base|link|meta)[^>]*>[\s\S]*?<\/\1>/gi, '')
    // Remove self-closing dangerous tags
    .replace(/<(script|style|link|meta|base)[^>]*\/?>/gi, '')
    // Keep allowed opening tags (no attributes), drop the rest
    .replace(/<([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (_match, tag: string) =>
      ALLOWED_TAGS.has(tag.toLowerCase()) ? `<${tag.toLowerCase()}>` : '',
    )
    // Keep allowed closing tags, drop the rest
    .replace(/<\/([a-zA-Z][a-zA-Z0-9]*)>/g, (_match, tag: string) =>
      ALLOWED_TAGS.has(tag.toLowerCase()) ? `</${tag.toLowerCase()}>` : '',
    );
}
