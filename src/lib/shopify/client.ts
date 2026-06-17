/**
 * Shopify Admin API client — server-side only.
 *
 * Reads SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN from the Node.js
 * environment (never exposed to the browser). Sends authenticated GraphQL
 * POST requests to the Shopify Admin API endpoint.
 *
 * All calls return { data, error } — never throws — so callers decide how
 * to surface failures.
 */

const SHOPIFY_API_VERSION = '2025-01';

/**
 * True when either credential env var is missing.
 * The API layer uses this to switch to mock data automatically.
 */
export function isMockMode(): boolean {
  return (
    !process.env.SHOPIFY_STORE_DOMAIN ||
    !process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
  );
}

export interface ShopifyFetchOptions {
  query: string;
  variables?: Record<string, unknown>;
}

export interface ShopifyFetchResult<T> {
  data: T | null;
  error: string | null;
}

export async function shopifyFetch<T>(
  options: ShopifyFetchOptions,
): Promise<ShopifyFetchResult<T>> {
  const { query, variables } = options;

  const domain = process.env.SHOPIFY_STORE_DOMAIN!;
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;
  const endpoint = `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

  // Retry up to 3 times. Three distinct failure modes each need their own
  // handling before giving up:
  //   1. Network throws (stale keepalive socket) — retry immediately, no delay.
  //   2. HTTP 429 — Shopify's REST rate limit; honour the Retry-After header.
  //   3. GraphQL THROTTLED (HTTP 200 with extensions.code=THROTTLED) — Shopify's
  //      GraphQL cost-bucket limit; retry after extensions.retryAfter seconds.
  const MAX_RETRIES = 3;
  let lastError = 'Unknown error';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token,
        },
        body: JSON.stringify({ query, variables }),
        cache: 'no-store',
      });

      // HTTP 429 — rate limited. Honour Retry-After if present.
      if (response.status === 429) {
        if (attempt < MAX_RETRIES) {
          const retryAfter = response.headers.get('Retry-After');
          const waitMs = retryAfter
            ? Math.ceil(parseFloat(retryAfter) * 1000)
            : 1000 * 2 ** attempt;
          console.warn(`[shopifyFetch] HTTP 429, waiting ${waitMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await new Promise<void>((r) => setTimeout(r, waitMs));
          continue;
        }
        return { data: null, error: 'Shopify API error: HTTP 429 Too Many Requests' };
      }

      if (!response.ok) {
        return {
          data: null,
          error: `Shopify API error: HTTP ${response.status} ${response.statusText}`,
        };
      }

      const json = await response.json() as {
        data?: T;
        errors?: Array<{ message: string; extensions?: { code?: string; retryAfter?: number } }>;
      };

      // GraphQL THROTTLED — Shopify sends HTTP 200 with an error extension.
      if (json.errors?.length) {
        const throttled = json.errors.find((e) => e.extensions?.code === 'THROTTLED');
        if (throttled && attempt < MAX_RETRIES) {
          const waitMs = Math.ceil((throttled.extensions?.retryAfter ?? 2) * 1000);
          console.warn(`[shopifyFetch] GraphQL throttled, waiting ${waitMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await new Promise<void>((r) => setTimeout(r, waitMs));
          continue;
        }
        return { data: null, error: json.errors[0].message };
      }

      return { data: json.data as T, error: null };
    } catch (err) {
      const cause =
        err instanceof Error && err.cause instanceof Error
          ? `: ${err.cause.message}`
          : '';
      lastError =
        err instanceof Error ? `${err.message}${cause}` : 'Unknown network error';

      if (attempt < MAX_RETRIES) {
        console.warn('[shopifyFetch] Transient connection error, retrying:', lastError);
        continue;
      }
    }
  }

  return { data: null, error: lastError };
}
