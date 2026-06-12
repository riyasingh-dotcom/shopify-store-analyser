import OpenAI from 'openai';
import type { Stream } from 'openai/streaming';
import type { ChatCompletionChunk } from 'openai/resources/chat/completions';
import type { Product } from '@/types/shopify';
import type { ProductAuditResult, ProductAuditCheck } from '@/lib/audit/productAudit';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// The existing Product type is already flat (variants/images are arrays, not
// GQL connections) — FlatProduct is a semantic alias, not a structural change.
type FlatProduct = Product;

type SuggestRequestBody = {
  product: FlatProduct;
  auditResult: ProductAuditResult;
};

// Shape Claude must return — streamed as a single JSON object.
export type ProductSuggestion = {
  improvedTitle: string;
  improvedDescription: string;
  improvedDescriptionHtml: string;
  improvedSeoTitle: string;
  improvedSeoDescription: string;
  suggestedTags: string[];
  reasoning: string;
};

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

// DESIGN INTENT — why the system prompt is phrased this way:
//
// The original prompt said "only suggest changes when there is a meaningful
// improvement" — too vague. LLMs interpret "meaningful improvement" liberally
// and almost always find something to "improve," rewriting perfectly good copy.
//
// The fix: make the DEFAULT behaviour PRESERVATION, not generation.
// Generation is the exception that requires explicit audit evidence to trigger.
// Each instruction in the user prompt must name a specific failing check ID
// before the model is permitted to change that field.

const SYSTEM_PROMPT = [
  'You are a Shopify product copy auditor. Your only job is to fix explicit audit failures.',
  '',
  'PRIME DIRECTIVE — read before doing anything else:',
  '  • If a field has NO failing audit checks, return its EXACT original value — character for character.',
  '  • Do NOT rephrase, modernise, reorder, or "enhance" content that already passes.',
  '  • Do NOT change brand names, product names, or trademarks under any circumstances.',
  '  • When a field HAS failures, make the MINIMUM change that fixes those specific checks.',
  '  • Do NOT invent product features, materials, or claims absent from the original.',
  '  • "Sounds better to me" is not a reason to change anything. Audit pass = hands off.',
  '',
  'Output: one minified JSON object. No markdown, no fences, no commentary.',
  'Required keys: improvedTitle, improvedDescription, improvedDescriptionHtml,',
  '               improvedSeoTitle, improvedSeoDescription, suggestedTags, reasoning.',
].join('\n');

// ── Prompt helpers ─────────────────────────────────────────────────────────────

function stripHtmlForPrompt(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Returns a structured block that either locks a field ("RETURN UNCHANGED")
// or lists exact failing checks the model must fix ("FIX THESE FAILURES").
//
// Including the current value verbatim in the "unchanged" directive is
// intentional: it removes any guess-work and forces the model to copy-paste
// rather than paraphrase.
function fieldDirective(
  fieldName: string,
  failedChecks: ProductAuditCheck[],
  scoreLabel: string,
  unchangedValue: string,
  fixInstruction: string,
): string {
  if (failedChecks.length === 0) {
    return [
      `[${fieldName}] ${scoreLabel} — ALL CHECKS PASSED`,
      `→ RETURN UNCHANGED: ${unchangedValue}`,
    ].join('\n');
  }

  const checkLines = failedChecks
    .map((c) => `    • ${c.label}${c.suggestion ? ' — ' + c.suggestion : ''}`)
    .join('\n');

  return [
    `[${fieldName}] ${scoreLabel} — ${failedChecks.length} FAILURE${failedChecks.length > 1 ? 'S' : ''}`,
    'Fix ONLY these checks:',
    checkLines,
    `→ ${fixInstruction}`,
  ].join('\n');
}

function buildUserPrompt(product: FlatProduct, auditResult: ProductAuditResult): string {
  const plainDesc = stripHtmlForPrompt(product.descriptionHtml);
  const { categoryScores, checks } = auditResult;

  // Index failed checks by category for O(1) lookups below.
  const failedByCategory: Record<string, ProductAuditCheck[]> = {};
  for (const c of checks) {
    if (!c.passed) {
      (failedByCategory[c.category] ??= []).push(c);
    }
  }

  const titleFailed = failedByCategory['title'] ?? [];
  const descFailed = failedByCategory['description'] ?? [];
  const seoFailed = failedByCategory['seo'] ?? [];

  // SEO title and description are distinct fields — split their failures so the
  // model gets a per-field directive rather than a combined "fix SEO" instruction.
  const seoTitleFailed = seoFailed.filter((c) => c.id.startsWith('seo-title'));
  const seoDescFailed = seoFailed.filter((c) => c.id.startsWith('seo-desc'));

  // Tags come from the metadata category but only the meta-tags check matters here.
  const tagsCheck = checks.find((c) => c.id === 'meta-tags');
  const tagsFailed = tagsCheck && !tagsCheck.passed ? [tagsCheck] : [];

  const score = (cat: 'title' | 'description' | 'seo') =>
    `${categoryScores[cat].score}/${categoryScores[cat].maxScore} pts`;

  // Build per-field directives. The "unchanged" value is echoed literally so
  // the model can copy it without interpreting it.
  const directives = [
    fieldDirective(
      'improvedTitle',
      titleFailed,
      `title ${score('title')}`,
      `"${product.title}"`,
      'Fix the failing checks above. Keep the same product name and keywords — do not rename the product.',
    ),

    fieldDirective(
      'improvedDescription + improvedDescriptionHtml',
      descFailed,
      `description ${score('description')}`,
      `plain="${plainDesc || '(empty)'}" html="${product.descriptionHtml || '(empty)'}"`,
      'Rewrite to fix the failing checks only. Preserve all factual product details. ' +
      'improvedDescriptionHtml must use <p> tags; no inline styles.',
    ),

    fieldDirective(
      'improvedSeoTitle',
      seoTitleFailed,
      `seo-title ${categoryScores['seo'].score}/${categoryScores['seo'].maxScore} pts`,
      product.seo.title ? `"${product.seo.title}"` : '"" (empty — not set)',
      'Create/fix an SEO title that is 30–60 characters.',
    ),

    fieldDirective(
      'improvedSeoDescription',
      seoDescFailed,
      `seo-desc ${categoryScores['seo'].score}/${categoryScores['seo'].maxScore} pts`,
      product.seo.description ? `"${product.seo.description}"` : '"" (empty — not set)',
      'Create/fix an SEO description that is 120–160 characters.',
    ),

    fieldDirective(
      'suggestedTags',
      tagsFailed,
      `tags ${categoryScores['metadata'].score}/${categoryScores['metadata'].maxScore} pts`,
      `[${product.tags.map((t) => `"${t}"`).join(', ')}]`,
      `Suggest 5–10 relevant lowercase tags. Preserve useful existing tags: [${product.tags.join(', ')}].`,
    ),
  ].join('\n\n');

  return `Product data:
Title: "${product.title}"
Description (plain): ${plainDesc || '(empty)'}
Description (HTML): ${product.descriptionHtml || '(empty)'}
SEO Title: ${product.seo.title ? `"${product.seo.title}"` : '(not set)'}
SEO Description: ${product.seo.description ? `"${product.seo.description}"` : '(not set)'}
Vendor: ${product.vendor || '(not set)'}
Product Type: ${product.productType || '(not set)'}
Current Tags: [${product.tags.map((t) => `"${t}"`).join(', ')}]
Overall Score: ${auditResult.totalScore}/100 (Grade: ${auditResult.grade})

Per-field audit directives — follow exactly:
${directives}

reasoning: one short paragraph stating what was changed and why. If most fields are unchanged, say so explicitly.`
;
}

// ---------------------------------------------------------------------------
// Groq helper — retries on rate-limit (429) and server errors (5xx)
// ---------------------------------------------------------------------------

async function createGroqStream(
  client: OpenAI,
  systemPrompt: string,
  userContent: string,
  maxRetries = 2,
): Promise<Stream<ChatCompletionChunk>> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: userContent },
        ],
        // Enough headroom for a full JSON suggestion including HTML description.
        max_tokens: 1024,
        stream: true as const,
        // Reduce hallucination on structured JSON output.
        temperature: 0.3,
      });
    } catch (err: unknown) {
      lastError = err;
      const httpStatus = (err as { status?: number })?.status;
      const isRetryable =
        attempt < maxRetries &&
        (httpStatus === 429 || (typeof httpStatus === 'number' && httpStatus >= 500));

      if (isRetryable) {
        const delay = 600 * 2 ** attempt; // 600ms → 1200ms
        console.warn(
          `[/api/products/suggest] Groq attempt ${attempt + 1} failed (${httpStatus}), retrying in ${delay}ms`,
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
// JSON sanitiser — LLMs sometimes emit literal control characters (0x00–0x1F)
// inside string values instead of the required JSON escape sequences.
// This pass converts them without disturbing already-escaped sequences.
// ---------------------------------------------------------------------------

function sanitiseRawJson(raw: string): string {
  let out = '';
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === '\\') {
      // Copy the escape sequence as-is — don't re-escape the next character.
      out += ch + (raw[i + 1] ?? '');
      i += 2;
    } else if (ch.charCodeAt(0) < 0x20) {
      // Bare control character inside a string value — replace with the
      // standard JSON escape so JSON.parse accepts it.
      switch (ch) {
        case '\n': out += '\\n'; break;
        case '\r': out += '\\r'; break;
        case '\t': out += '\\t'; break;
        default:
          out += `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`;
      }
      i++;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Type guard for the completed suggestion (used for DB persistence)
// ---------------------------------------------------------------------------

function isProductSuggestion(v: unknown): v is ProductSuggestion {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.improvedTitle === 'string' &&
    typeof o.improvedDescription === 'string' &&
    typeof o.improvedDescriptionHtml === 'string' &&
    typeof o.improvedSeoTitle === 'string' &&
    typeof o.improvedSeoDescription === 'string' &&
    Array.isArray(o.suggestedTags) &&
    (o.suggestedTags as unknown[]).every((t) => typeof t === 'string') &&
    typeof o.reasoning === 'string'
  );
}

// ---------------------------------------------------------------------------
// Input validation — no Zod, narrow manually to avoid any assertions
// ---------------------------------------------------------------------------

function isValidBody(raw: unknown): raw is SuggestRequestBody {
  if (typeof raw !== 'object' || raw === null) return false;
  const body = raw as Record<string, unknown>;

  const product = body.product;
  const auditResult = body.auditResult;

  if (typeof product !== 'object' || product === null) return false;
  if (typeof auditResult !== 'object' || auditResult === null) return false;

  const p = product as Record<string, unknown>;
  const a = auditResult as Record<string, unknown>;

  return (
    typeof p.id === 'string' &&
    typeof p.title === 'string' &&
    typeof p.descriptionHtml === 'string' &&
    typeof p.vendor === 'string' &&
    typeof p.productType === 'string' &&
    Array.isArray(p.tags) &&
    typeof a.productId === 'string' &&
    typeof a.totalScore === 'number' &&
    typeof a.grade === 'string' &&
    Array.isArray(a.checks)
  );
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  // CSRF guard — browsers enforce CORS preflight for custom headers, so
  // cross-origin callers cannot inject this header without server permission.
  if (request.headers.get('x-requested-with') !== 'XMLHttpRequest') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'GROQ_API_KEY not configured' }, { status: 503 });
  }

  // Parse and validate the request body.
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isValidBody(rawBody)) {
    return Response.json(
      { error: 'Request body must contain { product: FlatProduct; auditResult: ProductAuditResult }' },
      { status: 422 },
    );
  }

  const { product, auditResult } = rawBody;

  const client = new OpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey,
  });

  const groqStream = await createGroqStream(
    client,
    SYSTEM_PROMPT,
    buildUserPrompt(product, auditResult),
  ).catch((err: unknown) => {
    console.error('[/api/products/suggest] Groq failed after retries:', err);
    return null;
  });

  if (!groqStream) {
    return Response.json({ error: 'AI service unavailable' }, { status: 502 });
  }

  const encoder = new TextEncoder();

  // Stream tokens as SSE events so the client can render progressive output.
  // IMPORTANT: the DB save must happen BEFORE emit('[DONE]') and controller.close().
  // Next.js does not await the remainder of ReadableStream.start() after
  // controller.close() — any async work after that point is silently dropped.
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      function emit(data: string): void {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      }

      let fullContent = '';

      // ── 1. Stream all Groq tokens to the client ──────────────────────────
      try {
        for await (const chunk of groqStream) {
          const token = chunk.choices[0]?.delta?.content;
          if (token) {
            fullContent += token;
            emit(token);
          }
        }
      } catch (err) {
        console.error('[/api/products/suggest] Stream read error:', err);
        controller.enqueue(encoder.encode(`event: error\ndata: Stream interrupted\n\n`));
        controller.error(err);
        return;
      }

      // ── 2. Persist to DB (stream still open — Next.js hasn't closed the ──
      //       request context yet, so this await is guaranteed to complete)  ──
      console.log('[suggest] fullContent length:', fullContent.length, '| productId:', product.id);
      try {
        const parsed: unknown = JSON.parse(sanitiseRawJson(fullContent.trim()));
        const valid = isProductSuggestion(parsed);
        console.log('[suggest] isProductSuggestion:', valid);
        if (valid) {
          const row = await prisma.productSuggestion.create({
            data: {
              productId: product.id,
              productTitle: product.title,
              originalTitle: product.title,
              improvedTitle: parsed.improvedTitle,
              originalDescription: stripHtmlForPrompt(product.descriptionHtml),
              improvedDescription: parsed.improvedDescription,
              improvedDescriptionHtml: parsed.improvedDescriptionHtml,
              originalSeoTitle: product.seo.title || null,
              improvedSeoTitle: parsed.improvedSeoTitle,
              originalSeoDescription: product.seo.description || null,
              improvedSeoDescription: parsed.improvedSeoDescription,
              suggestedTags: parsed.suggestedTags,
              reasoning: parsed.reasoning,
              auditScore: auditResult.totalScore,
              storeDomain: process.env.SHOPIFY_STORE_DOMAIN ?? 'unknown',
            },
          });
          console.log('[suggest] saved row id:', row.id, '| productId stored:', row.productId);
        } else {
          console.warn('[suggest] isProductSuggestion failed — keys present:', Object.keys(parsed as object));
        }
      } catch (err) {
        console.error('[suggest] DB save failed:', err);
      }

      // ── 3. Signal completion — client unblocks only after DB is written ──
      emit('[DONE]');
      controller.close();
    },
    cancel() {
      groqStream.controller.abort();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store',
      // Disable nginx/proxy response buffering so tokens reach the client
      // immediately rather than being held until the buffer fills.
      'X-Accel-Buffering': 'no',
      // Keep the connection alive — long-running Groq requests can exceed
      // default proxy timeouts on Vercel's edge network.
      Connection: 'keep-alive',
    },
  });
}
