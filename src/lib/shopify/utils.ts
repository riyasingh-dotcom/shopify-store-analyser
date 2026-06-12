/**
 * Extracts the numeric Shopify ID from a GID string.
 * e.g. "gid://shopify/Product/12345" → "12345"
 */
export function extractNumericId(gid: string): string {
  const parts = gid.split('/');
  return parts[parts.length - 1] ?? gid;
}
