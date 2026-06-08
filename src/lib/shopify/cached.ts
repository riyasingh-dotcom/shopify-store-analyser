import { cache } from 'react';
import { getStoreData } from '@/services/shopify';

// Deduplicates calls within the same React server render tree.
// The root layout and each page both call this — only one Shopify
// API request is made per navigation.
export const getStoreDataCached = cache(getStoreData);
