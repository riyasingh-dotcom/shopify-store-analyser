import OpenAI from 'openai';
import { getStoreData } from '@/lib/shopify/service';
import { prisma } from '@/lib/prisma';
import { getGroqRatelimit, getRateLimitIdentifier } from '@/lib/ratelimit';
import type { StoreData } from '@/types/shopify';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a Shopify growth consultant for SMB stores.
Output NDJSON — exactly one JSON object per line, no markdown, no fences, no extra text.

Output in this exact order:
Line 1: {"overallScore":<1-10>,"summary":"<2 sentences>"}
Lines 2-5: {"insight":{"category":"<category>","title":"<max 6 words>","finding":"<data-backed observation>","recommendation":"<actionable next step>","priority":"<priority>"}}
Last line: {"quickWins":["<action 1>","<action 2>","<action 3>"]}

category: inventory|revenue|products|marketing|operations|growth
priority: high|medium|low — output 3-4 insights ordered high→low
Score: 1-3 critical, 4-5 needs work, 6-7 adequate, 8-10 strong.
Base every observation on the supplied numbers only.`;

// ---------------------------------------------------------------------------
// Payload builder — returns object so it can be stored directly in DB
// ---------------------------------------------------------------------------

function buildSummaryObject(storeData: StoreData): Record<string, unknown> {
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
// DB persistence — called after the stream closes; failure never breaks the
// API response because the HTTP body is already delivered by that point.
// ---------------------------------------------------------------------------

async function persistAnalysis(storeData: StoreData, ndjsonText: string): Promise<void> {
  let overallScore = 0;
  let summary = '';
  const rawInsights: Record<string, unknown>[] = [];
  let quickWins: string[] = [];

  for (const line of ndjsonText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>;
      if ('overallScore' in obj) {
        overallScore = Number(obj.overallScore);
        summary = String(obj.summary ?? '');
      } else if ('insight' in obj) {
        rawInsights.push(obj.insight as Record<string, unknown>);
      } else if ('quickWins' in obj) {
        quickWins = (obj.quickWins as string[]) ?? [];
      }
    } catch { /* skip malformed line */ }
  }

  if (overallScore < 1 || !summary || rawInsights.length === 0) {
    console.warn('[/api/analyse] Skipping DB save — incomplete NDJSON');
    return;
  }

  const storeDomain = storeData.shop.myshopifyDomain || storeData.shop.name || 'unknown';
  const { metrics } = storeData;

  await prisma.storeAnalysis.create({
    data: {
      storeDomain,
      overallScore: Math.min(10, Math.max(1, Math.round(overallScore))),
      summary,
      rawInsights: JSON.parse(JSON.stringify(rawInsights)),
      quickWins,
      snapshot: {
        create: {
          storeDomain,
          productCount: metrics.totalProducts,
          orderCount: metrics.totalOrders,
          totalRevenue: metrics.totalRevenue,
          rawData: JSON.parse(JSON.stringify(buildSummaryObject(storeData))),
        },
      },
    },
  });

}

// ---------------------------------------------------------------------------
// Groq helper — retries on rate-limit (429) and server errors (5xx)
// ---------------------------------------------------------------------------

async function createGroqStream(
  client: OpenAI,
  systemPrompt: string,
  userContent: string,
  maxRetries = 2,
) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: userContent },
        ],
        max_tokens: 1024,
        stream: true as const,
      });
    } catch (err: unknown) {
      lastError = err;
      const httpStatus = (err as { status?: number })?.status;
      if (
        attempt < maxRetries &&
        (httpStatus === 429 || (typeof httpStatus === 'number' && httpStatus >= 500))
      ) {
        const delay = 600 * 2 ** attempt; // 600ms, 1200ms
        console.warn(
          `[/api/analyse] Groq attempt ${attempt + 1} failed (${httpStatus}), retrying in ${delay}ms`,
        );
        await new Promise<void>((r) => setTimeout(r, delay));
        continue;
      }
      break;
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // Reject requests that don't originate from this app's own pages.
  // Browsers enforce CORS preflight for custom headers, so cross-origin
  // callers cannot include X-Requested-With without explicit server permission.
  if (request.headers.get('x-requested-with') !== 'XMLHttpRequest') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { success, limit, remaining, reset } = await getGroqRatelimit().limit(
    getRateLimitIdentifier(request),
  );
  if (!success) {
    return Response.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(reset),
        },
      },
    );
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'GROQ_API_KEY not configured' }, { status: 503 });
  }

  let storeData: StoreData;
  try {
    storeData = await getStoreData();
  } catch (err) {
    console.error('[/api/analyse] Store data fetch failed:', err);
    return Response.json({ error: 'Failed to fetch store data' }, { status: 500 });
  }

  const client = new OpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey,
  });

  const userContent = `Analyse this store:\n${JSON.stringify(buildSummaryObject(storeData))}`;
  const groqStream = await createGroqStream(client, SYSTEM_PROMPT, userContent)
    .catch((err: unknown) => {
      console.error('[/api/analyse] Groq failed after retries:', err);
      return null;
    });

  if (!groqStream) {
    return Response.json({ error: 'AI service unavailable' }, { status: 502 });
  }

  const encoder = new TextEncoder();

  // Accumulate the full NDJSON text as tokens stream through, so we can
  // persist it after the stream closes without a second Groq call.
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      let accumulated = '';

      try {
        for await (const chunk of groqStream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            accumulated += delta;
            controller.enqueue(encoder.encode(delta));
          }
        }
        // Close the stream — the browser has all tokens at this point.
        controller.close();
      } catch (err) {
        console.error('[/api/analyse] Error during stream read:', err);
        controller.error(err);
        return;
      }

      // Persist to DB after the response body is fully delivered.
      // A failure here is non-fatal — the client already has its data.
      try {
        await persistAnalysis(storeData, accumulated);
      } catch (err) {
        console.error('[/api/analyse] DB persistence failed (non-fatal):', err);
      }
    },
    cancel() {
      groqStream.controller.abort();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}
