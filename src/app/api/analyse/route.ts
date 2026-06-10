import OpenAI from 'openai';
import { getStoreData } from '@/services/shopify';
import type { StoreData } from '@/types/shopify';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Prompt — identical schema to the server action so results are consistent
// ---------------------------------------------------------------------------

// NDJSON format: one self-contained JSON object per line.
// Each line is parseable the moment it arrives, enabling progressive UI rendering.
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

function buildPayload(storeData: StoreData): string {
  const { shop, orders, metrics } = storeData;

  const orderStatusBreakdown: Record<string, number> = {};
  for (const order of orders) {
    const key = order.displayFinancialStatus ?? 'Unknown';
    orderStatusBreakdown[key] = (orderStatusBreakdown[key] ?? 0) + 1;
  }

  return JSON.stringify({
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
  });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'GROQ_API_KEY not configured' }, { status: 503 });
  }

  // Fetch store data server-side — avoids sending large arrays client→server
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

  // Initialise the stream before returning the Response so auth/quota errors
  // are caught here and can still produce a proper HTTP error status.
  const groqStream = await client.chat.completions
    .create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Analyse this store:\n${buildPayload(storeData)}` },
      ],
      max_tokens: 1024,
      stream: true,
    })
    .catch((err: unknown) => {
      console.error('[/api/analyse] Groq stream init failed:', err);
      return null;
    });

  if (!groqStream) {
    return Response.json({ error: 'AI service unavailable' }, { status: 502 });
  }

  // Pipe Groq token deltas into a ReadableStream sent to the browser.
  // Real streaming: each token is enqueued as it arrives via for await...of.
  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of groqStream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            controller.enqueue(encoder.encode(delta));
          }
        }
        controller.close();
      } catch (err) {
        console.error('[/api/analyse] Error during stream read:', err);
        controller.error(err);
      }
    },
    cancel() {
      // Client disconnected — abort the upstream Groq request
      groqStream.controller.abort();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-store',
      // Prevent Vercel / nginx edge proxies from buffering the stream
      'X-Accel-Buffering': 'no',
    },
  });
}
