/**
 * Shopify Admin GraphQL queries.
 *
 * All list queries use the Shopify "connection" pattern: the API returns
 * { edges: [{ node: <item> }], pageInfo: { hasNextPage, endCursor } }
 * The api.ts layer flattens edges into plain arrays before returning.
 */

// Basic store metadata shown in the dashboard header
export const SHOP_QUERY = `
  query GetShop {
    shop {
      name
      email
      myshopifyDomain
      primaryDomain {
        url
      }
      currencyCode
      plan {
        displayName
      }
    }
  }
`;

/**
 * Fetch products with inventory and pricing data.
 * priceRangeV2 covers the min/max price across all variants.
 * $first is a required variable — pass e.g. { first: 50 }.
 */
export const PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          title
          status
          vendor
          totalInventory
          priceRangeV2 {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

/**
 * Fetch recent orders sorted newest-first.
 * customer is null for guest checkouts — handled by the UI layer.
 * $first is a required variable — pass e.g. { first: 20 }.
 */
export const ORDERS_QUERY = `
  query GetOrders($first: Int!, $after: String) {
    orders(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          name
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          displayFinancialStatus
          displayFulfillmentStatus
          createdAt
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
