'use server';

import Anthropic from '@anthropic-ai/sdk';
import type { StoreData } from '@/types/shopify';
import type { StoreAnalysis } from '@/types/analysis';

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert Shopify growth consultant with 10+ years specializing in SMB e-commerce optimization. You advise small-to-medium Shopify stores on inventory management, pricing strategy, product catalog quality, conversion rate optimization, and revenue growth.

Analyse the provided store metrics and return ONLY a raw JSON object — no markdown, no code fences, no explanations before or after. The response must be parseable directly with JSON.parse().

Required JSON structure:
{


  "overallScore": <integer 1–10, holistic store health>,
  "summary": "<2–3 sentence executive summary covering store health and the single highest-priority area to address>",
  "insights": [
    {
      "category": "<one of: inventory | revenue | products | marketing | operations | growth>",
      "title": "<concise title, max 8 words>",
      "finding": "<specific observation grounded in the provided numbers>",
      "recommendation": "<concrete, actionable recommendation with measurable next steps>",
      "priority": "<high | medium | low>"
    }
  ],
  "quickWins": [
    "<specific action the store owner can complete within one week>"
  ]
}

Scoring guide: 1–3 = critical issues, 4–5 = needs significant work, 6–7 = performing adequately, 8–9 = strong store, 10 = exceptional.
Rules: provide 4–6 insights ordered high → medium → low priority; provide 3–5 quick wins; base every insight strictly on the supplied data.`;

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
// JSON extraction — strips markdown code fences if Claude wraps anyway
// ---------------------------------------------------------------------------

function extractJson(raw: string): string {
  // Strip ```json ... ``` or ``` ... ``` fences
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();

  // Fallback: find the outermost { ... } block
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start !== -1 && end > start) return raw.slice(start, end + 1);

  return raw.trim();
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
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.warn('[analyseStore] ANTHROPIC_API_KEY is not set — skipping AI analysis');
    return null;
  }

  const summary = buildStoreSummary(storeData);
  const client = new Anthropic({ apiKey });

  let rawText: string;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analyse this Shopify store and return your assessment as JSON:\n\n${JSON.stringify(summary, null, 2)}`,
        },
      ],
    });

    const block = response.content[0];
    if (block.type !== 'text') {
      console.error('[analyseStore] Unexpected content block type:', block.type);
      return null;
    }
    rawText = block.text;
  } catch (err) {
    console.error('[analyseStore] Anthropic API request failed:', err);
    return null;
  }

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
