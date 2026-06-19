import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { getStoreData, getOrdersData } from './service';

const REVALIDATE_SECONDS = 60;

// unstable_cache: persists the result across requests for 60 s (Next.js data cache).
// React cache(): deduplicates concurrent calls within the same render tree so the
// layout and pages don't each trigger a separate cache lookup in the same navigation.
export const getStoreDataCached = cache(
  unstable_cache(getStoreData, ['shopify-store-data'], {
    revalidate: REVALIDATE_SECONDS,
  }),
);

// Same strategy for orders — used by the /orders page alongside getStoreDataCached.
export const getOrdersDataCached = unstable_cache(
  getOrdersData,
  ['shopify-orders-data'],
  { revalidate: REVALIDATE_SECONDS },
);
