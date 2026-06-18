import { z } from 'zod';
import OpenAI from 'openai';
import type { Stream } from 'openai/streaming';
import type { ChatCompletionChunk } from 'openai/resources/chat/completions';
import { buildOrdersSummary, buildOrdersAnalysisSnapshot } from '@/lib/analysis/orders/ordersSummary';
import { persistOrdersAnalysis } from '@/lib/analysis/orders/ordersAnalysisDb';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Zod schemas — mirrors FlatOrder / FlatLineItem / FlatCustomer from @/lib/orders
// ---------------------------------------------------------------------------

const FlatLineItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  totalPrice: z.number(),
  variantTitle: z.string(),
  sku: z.string(),
  productId: z.string(),
  productTitle: z.string(),
});

const FlatCustomerSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  lifetimeOrders: z.number(),
  lifetimeSpend: z.number(),
});

const FlatOrderSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  financialStatus: z.string(),
  fulfillmentStatus: z.string(),
  totalPrice: z.number(),
  subtotalPrice: z.number(),
  totalDiscounts: z.number(),
  totalShipping: z.number(),
  currencyCode: z.string(),
  lineItems: z.array(FlatLineItemSchema),
  customer: FlatCustomerSchema.nullable(),
  discountCodes: z.array(z.string()),
  tags: z.array(z.string()),
  isCancelled: z.boolean(),
  cancelReason: z.string().nullable(),
});

const OrdersBodySchema = z.object({
  storeDomain: z.string(),
  orders: z.array(FlatOrderSchema),
});

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert Shopify e-commerce analyst. Give specific, data-driven recommendations that merchants can act on immediately.

Respond with ONLY a single minified JSON object on one line. No markdown, no code fences, no commentary before or after — raw JSON only.

Required schema:
{"overallHealthScore":<integer 1–10>,"categories":[{"name":"Revenue Health"|"Fulfilment Performance"|"Product Mix"|"Customer Quality","score":<integer 1–10>,"status":"good"|"warning"|"critical","finding":"<what the data shows — cite specific numbers>","recommendation":"<concrete action to take this week>","metric":"<single key number supporting this finding>"}],"topPriority":"<single most important action this week>","positives":["<thing going well>","<thing going well>"]}

Rules:
- Output all four category objects every time.
- Scoring: 1–3 critical, 4–5 needs work, 6–7 adequate, 8–10 strong.
- Base every finding and recommendation strictly on the supplied data. Do not invent metrics.
- positives must contain 2–3 items.`;

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function hasHttpStatus(err: unknown): err is { status: number } {
  return isRecord(err) && 'status' in err && typeof err.status === 'number';
}

// ---------------------------------------------------------------------------
// Groq helper — retries on 429 and 5xx with exponential backoff
// ---------------------------------------------------------------------------

async function createGroqStream(
  client: OpenAI,
  userContent: string,
  signal: AbortSignal,
  maxRetries = 2,
): Promise<Stream<ChatCompletionChunk>> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await client.chat.completions.create(
        {
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system' as const, content: SYSTEM_PROMPT },
            { role: 'user' as const, content: userContent },
          ],
          max_tokens: 2048,
          stream: true as const,
          temperature: 0.2,
        },
        { signal },
      );
    } catch (err: unknown) {
      lastError = err;
      const httpStatus = hasHttpStatus(err) ? err.status : undefined;
      const isRetryable =
        attempt < maxRetries &&
        (httpStatus === 429 || (typeof httpStatus === 'number' && httpStatus >= 500));

      if (isRetryable) {
        const delay = 600 * 2 ** attempt;
        console.warn(
          `[/api/orders/analyse] Groq attempt ${attempt + 1} failed (${httpStatus}), retrying in ${delay}ms`,
        );
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
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

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host') ?? '';
  // origin is null for same-origin requests from non-browser clients; the
  // X-Requested-With check below is the effective CSRF guard in that case.
  const isSameOrigin =
    origin === null ||
    origin === `https://${host}` ||
    origin === `http://${host}`;

  if (!isSameOrigin || request.headers.get('x-requested-with') !== 'XMLHttpRequest') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'GROQ_API_KEY not configured' }, { status: 503 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parseResult = OrdersBodySchema.safeParse(rawBody);
  if (!parseResult.success) {
    return Response.json(
      { error: 'Invalid request body', issues: parseResult.error.issues },
      { status: 400 },
    );
  }

  const { storeDomain, orders } = parseResult.data;

  if (orders.length === 0) {
    return Response.json({ error: 'No orders to analyse' }, { status: 400 });
  }

  const snapshot = buildOrdersAnalysisSnapshot(orders);
  const userContent = buildOrdersSummary(orders);

  const client = new OpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey,
  });

  const streamAbort = new AbortController();

  const groqStream = await createGroqStream(
    client,
    userContent,
    streamAbort.signal,
  ).catch((err: unknown) => {
    console.error('[/api/orders/analyse] Groq failed after retries:', err);
    return null;
  });

  if (!groqStream) {
    return Response.json({ error: 'AI service unavailable' }, { status: 502 });
  }

  const encoder = new TextEncoder();

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      function emit(data: string, eventType?: string): void {
        const prefix = eventType ? `event: ${eventType}\n` : '';
        controller.enqueue(encoder.encode(`${prefix}data: ${data}\n\n`));
      }

      let accumulated = '';

      try {
        for await (const chunk of groqStream) {
          const token = chunk.choices[0]?.delta?.content;
          if (token) {
            accumulated += token;
            emit(token);
          }
        }
      } catch (err) {
        console.error('[/api/orders/analyse] Stream read error:', err);
        controller.enqueue(encoder.encode(`event: error\ndata: Stream interrupted\n\n`));
        controller.error(err);
        return;
      }

      emit('[DONE]');
      controller.close();

      // Persist to DB after the response body is fully delivered.
      // A failure here is non-fatal — the client already has its data.
      try {
        const parsed = JSON.parse(accumulated) as unknown;
        if (isRecord(parsed)) {
          await persistOrdersAnalysis(storeDomain, parsed, snapshot);
        }
      } catch (err) {
        console.error('[/api/orders/analyse] DB persistence failed (non-fatal):', err);
      }
    },
    cancel() {
      streamAbort.abort();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    },
  });
}
