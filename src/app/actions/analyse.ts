'use server';

import OpenAI from 'openai';
import { getStoreData } from '@/services/shopify';
import type { StoreData } from '@/types/shopify';
import type { StoreAnalysis } from '@/types/analysis';

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a Shopify growth consultant for SMB stores. Analyse the store metrics and return JSON only — no markdown, no fences.

Schema: {"overallScore":1-10,"summary":"2 sentences","insights":[{"category":"inventory|revenue|products|marketing|operations|growth","title":"max 6 words","finding":"data-backed observation","recommendation":"actionable next step","priority":"high|medium|low"}],"quickWins":["action completable this week"]}

Rules: 3-4 insights (high→low priority), 3 quick wins, base everything on the supplied numbers. Score: 1-3 critical, 4-5 needs work, 6-7 adequate, 8-10 strong.`;

// ---------------------------------------------------------------------------
// Input shape sent to Claude (subset of StoreData, serialisation-safe)
// ---------------------------------------------------------------------------

interface StoreSummary {
  storeName: string;
  plan: string;
  currency: string;
  productCount: number;
  activeProducts: number;
  draftProducts: number;
  archivedProducts: number;
  lowStockProducts: number;
  orderCount: number;
  totalRevenue: number;
  averageOrderValue: number;
  paidOrders: number;
  orderStatusBreakdown: Record<string, number>;
  topProducts: Array<{
    title: string;
    vendor: string;
    inventory: number;
    priceRange: string;
  }>;
}

function buildStoreSummary(storeData: StoreData): StoreSummary {
  const { shop, orders, metrics } = storeData;

  const orderStatusBreakdown: Record<string, number> = {};
  for (const order of orders) {
    const key = order.displayFinancialStatus ?? 'Unknown';
    orderStatusBreakdown[key] = (orderStatusBreakdown[key] ?? 0) + 1;
  }

  return {
    storeName: shop.name,
    plan: shop.plan.displayName,
    currency: metrics.currencyCode,
    productCount: metrics.totalProducts,
    activeProducts: metrics.activeProducts,
    draftProducts: metrics.draftProducts,
    archivedProducts: metrics.archivedProducts,
    lowStockProducts: metrics.lowStockProducts,
    orderCount: metrics.totalOrders,
    totalRevenue: Math.round(metrics.totalRevenue * 100) / 100,
    averageOrderValue: Math.round(metrics.averageOrderValue * 100) / 100,
    paidOrders: metrics.paidOrders,
    orderStatusBreakdown,
    topProducts: metrics.topProducts.map((p) => ({
      title: p.title,
      vendor: p.vendor,
      inventory: p.totalInventory,
      priceRange:
        p.minPrice === p.maxPrice
          ? `${p.currencyCode} ${p.minPrice.toFixed(2)}`
          : `${p.currencyCode} ${p.minPrice.toFixed(2)}–${p.maxPrice.toFixed(2)}`,
    })),
  };
}

// ---------------------------------------------------------------------------
// JSON extraction — strips fences and cleans JS-style syntax that Gemini
// occasionally emits even when responseMimeType is set to application/json.
// ---------------------------------------------------------------------------

function extractJson(raw: string): string {
  // 1. Strip ```json ... ``` or ``` ... ``` fences
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  let candidate = fenceMatch?.[1]?.trim() ?? '';

  if (!candidate) {
    // 2. Find the outermost { ... } block
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    candidate = start !== -1 && end > start ? raw.slice(start, end + 1) : raw.trim();
  }

  // 3. Strip JS-style line comments  ("// ...")
  candidate = candidate.replace(/\/\/[^\n\r]*/g, '');
  // 4. Strip JS-style block comments ("/* ... */")
  candidate = candidate.replace(/\/\*[\s\S]*?\*\//g, '');
  // 5. Remove trailing commas before } or ]  (common in Gemini output)
  candidate = candidate.replace(/,(\s*[}\]])/g, '$1');

  return candidate;
}

// ---------------------------------------------------------------------------
// Basic shape validation — guards against partial/malformed responses
// ---------------------------------------------------------------------------

function isValidAnalysis(value: unknown): value is StoreAnalysis {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.overallScore === 'number' &&
    v.overallScore >= 1 &&
    v.overallScore <= 10 &&
    typeof v.summary === 'string' &&
    v.summary.length > 0 &&
    Array.isArray(v.insights) &&
    v.insights.length > 0 &&
    Array.isArray(v.quickWins) &&
    v.quickWins.length > 0
  );
}

// ---------------------------------------------------------------------------
// Main server action
// ---------------------------------------------------------------------------

export async function analyseStore(storeData: StoreData): Promise<StoreAnalysis | null> {
  // ── provider boundary — swap here to switch back to Anthropic ──────────────
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.warn('[analyseStore] GROQ_API_KEY is not set — skipping AI analysis');
    return null;
  }

  const client = new OpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey,
  });

  const summary = buildStoreSummary(storeData);

  let rawText: string;

  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Analyse this store:\n${JSON.stringify(summary)}` },
      ],
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    });

    rawText = response.choices[0]?.message?.content ?? '';

    if (!rawText) {
      console.error('[analyseStore] Groq returned an empty response');
      return null;
    }
  } catch (err) {
    console.error('[analyseStore] Groq API request failed:', err);
    return null;
  }
  // ── end provider boundary ───────────────────────────────────────────────────

  try {
    const jsonStr = extractJson(rawText);
    const parsed: unknown = JSON.parse(jsonStr);

    if (!isValidAnalysis(parsed)) {
      console.error('[analyseStore] Response failed shape validation:', parsed);
      return null;
    }

    // Clamp score to valid range in case Claude drifts slightly
    return {
      ...parsed,
      overallScore: Math.min(10, Math.max(1, Math.round(parsed.overallScore))),
    };
  } catch (err) {
    console.error('[analyseStore] JSON parse error:', err);
    console.error('[analyseStore] Raw response was:', rawText);
    return null;
  }
}

// No-argument wrapper called from the client component.
// Fetches store data server-side so nothing large travels client→server.
export async function analyseCurrentStore(): Promise<StoreAnalysis | null> {
  const storeData = await getStoreData();
  return analyseStore(storeData);
}
