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
  options: ShopifyFetchOptions
): Promise<ShopifyFetchResult<T>> {
  const { query, variables } = options;

  const domain = process.env.SHOPIFY_STORE_DOMAIN!;
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;

  // Shopify Admin GraphQL endpoint format
  const endpoint = `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Private app / custom app authentication header
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({ query, variables }),
      // Always fetch live data for the dashboard — no Next.js caching
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        data: null,
        error: `Shopify API error: HTTP ${response.status} ${response.statusText}`,
      };
    }

    const json = await response.json();

    // Shopify returns GraphQL errors inside the 200 response body
    if (json.errors?.length) {
      return { data: null, error: (json.errors[0] as { message: string }).message };
    }

    return { data: json.data as T, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown network error',
    };
  }
}
