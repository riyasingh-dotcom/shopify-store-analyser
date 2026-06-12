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
 * Fetch products with full SEO and inventory data.
 * - variants(first: 100): covers stores with up to 100 variants per product;
 *   increase if you sell highly configurable products.
 * - images(first: 10): typically sufficient; raise for products with large
 *   image galleries but note this increases response payload per product.
 * - priceRangeV2 covers the min/max price across all variants.
 * $first is a required variable — pass e.g. { first: 50 }.
 */
export const PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          title
          descriptionHtml
          status
          vendor
          productType
          tags
          onlineStoreUrl
          seo {
            title
            description
          }
          totalInventory
          priceRangeV2 {
            minVariantPrice { amount currencyCode }
            maxVariantPrice { amount currencyCode }
          }
          variants(first: 100) {
            edges {
              node {
                id
                title
                price
                inventoryQuantity
                sku
              }
            }
          }
          images(first: 10) {
            edges {
              node {
                url
                altText
              }
            }
          }
          createdAt
          updatedAt
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
 *
 * Analytics fields added:
 * - subtotalPriceSet + totalDiscountsSet: compute effective discount rate.
 * - cancelReason: surface friction/inventory issues in recommendations.
 * - tags: enable custom order segmentation (e.g. "wholesale", "b2b").
 *
 * Intentionally deferred (expensive sub-connections):
 * - lineItems: per-product sold quantities — add when building product-level
 *   sales rank. Requires an inner `first` variable and pagination.
 * - customer: repeat-buyer rate analysis. Add with `customer { id email }`
 *   but be aware of PII handling requirements.
 *
 * $first is a required variable — pass e.g. { first: 20 }.
 */
export const ORDERS_QUERY = `
  query GetOrders($first: Int!, $after: String) {
    orders(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          name
          totalPriceSet { shopMoney { amount currencyCode } }
          subtotalPriceSet { shopMoney { amount currencyCode } }
          totalDiscountsSet { shopMoney { amount currencyCode } }
          displayFinancialStatus
          displayFulfillmentStatus
          cancelReason
          tags
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
