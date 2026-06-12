import OpenAI from 'openai';
import type { Stream } from 'openai/streaming';
import type { ChatCompletionChunk } from 'openai/resources/chat/completions';
import type { Product } from '@/types/shopify';
import type { ProductAuditResult, ProductAuditCheck } from '@/lib/audit/productAudit';
import { auditProduct, type AuditCategory } from '@/lib/audit/productAudit';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FlatProduct = Product;

type SuggestRequestBody = {
  product: FlatProduct;
  auditResult: ProductAuditResult;
  auditLogId?: string | null;
};

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
// Prompt helpers
// ---------------------------------------------------------------------------

function stripHtmlForPrompt(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Checks in these categories can be fixed by rewriting copy.
// meta-tags is the only metadata check the AI can influence.
const COPY_FIXABLE_CATEGORIES = new Set<AuditCategory>(['title', 'description', 'seo']);

function isCopyFixable(check: ProductAuditCheck): boolean {
  return COPY_FIXABLE_CATEGORIES.has(check.category) || check.id === 'meta-tags';
}

// Returns a per-field block that either locks a field ("RETURN UNCHANGED") or
// lists exact failing checks the model must fix ("FIX THESE FAILURES").
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
    .map((c) => `    • ${c.label} (−${c.maxScore} pts)${c.suggestion ? ' — ' + c.suggestion : ''}`)
    .join('\n');

  return [
    `[${fieldName}] ${scoreLabel} — ${failedChecks.length} FAILURE${failedChecks.length > 1 ? 'S' : ''}`,
    'Fix EVERY check listed below:',
    checkLines,
    `→ ${fixInstruction}`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = [
  'You are a Shopify product copy optimizer. Your ONLY GOAL is to maximize the product audit score.',
  '',
  'RULES — read before doing anything:',
  '  1. Fields with failing checks → rewrite to FIX EVERY failing check listed for that field.',
  '  2. Fields with ALL checks passing → return the EXACT original value, character for character.',
  '  3. Do NOT invent product features, materials, or claims absent from the original.',
  '  4. Do NOT change brand names, trademarks, or the core product name.',
  '  5. improvedDescriptionHtml must use <p> tags, no inline styles.',
  '  6. suggestedTags must contain at least 5 tags.',
  '',
  'Output: one minified JSON object on a single line. No markdown, no code fences, no commentary.',
  'Required keys: improvedTitle, improvedDescription, improvedDescriptionHtml,',
  '               improvedSeoTitle, improvedSeoDescription, suggestedTags, reasoning.',
].join('\n');

// ---------------------------------------------------------------------------
// User prompt builder
// ---------------------------------------------------------------------------

function buildUserPrompt(product: FlatProduct, auditResult: ProductAuditResult): string {
  const plainDesc = stripHtmlForPrompt(product.descriptionHtml);
  const { categoryScores, checks, totalScore, grade } = auditResult;

  const failedChecks = checks.filter((c) => !c.passed);

  // Separate what the AI can fix vs. what requires manual Shopify Admin action.
  const fixable = [...failedChecks.filter(isCopyFixable)].sort((a, b) => b.maxScore - a.maxScore);
  const manualOnly = [...failedChecks.filter((c) => !isCopyFixable(c))].sort(
    (a, b) => b.maxScore - a.maxScore,
  );

  const fixablePoints = fixable.reduce((sum, c) => sum + c.maxScore, 0);
  const targetScore = totalScore + fixablePoints;

  // Index per-category for per-field directives.
  const failedByCategory: Record<string, ProductAuditCheck[]> = {};
  for (const c of failedChecks) {
    (failedByCategory[c.category] ??= []).push(c);
  }

  const titleFailed = failedByCategory['title'] ?? [];
  const descFailed = failedByCategory['description'] ?? [];
  const seoFailed = failedByCategory['seo'] ?? [];
  const seoTitleFailed = seoFailed.filter((c) => c.id.startsWith('seo-title'));
  const seoDescFailed = seoFailed.filter((c) => c.id.startsWith('seo-desc'));
  const tagsCheck = checks.find((c) => c.id === 'meta-tags');
  const tagsFailed = tagsCheck && !tagsCheck.passed ? [tagsCheck] : [];

  const catScore = (cat: 'title' | 'description' | 'seo') =>
    `${categoryScores[cat].score}/${categoryScores[cat].maxScore}`;

  const directives = [
    fieldDirective(
      'improvedTitle',
      titleFailed,
      `title ${catScore('title')}`,
      `"${product.title}"`,
      'Rewrite to pass ALL checks: 20–70 characters, no generic prefix (New/Best/Buy/Cheap/Top), at least 2 words with a descriptor, no ALL CAPS. Keep the core product name.',
    ),

    fieldDirective(
      'improvedDescription + improvedDescriptionHtml',
      descFailed,
      `description ${catScore('description')}`,
      `plain="${plainDesc || '(empty)'}" html="${product.descriptionHtml || '(empty)'}"`,
      'Rewrite to pass ALL checks: 300+ characters, 2+ <p> paragraphs, no placeholder text. Preserve all factual product details.',
    ),

    fieldDirective(
      'improvedSeoTitle',
      seoTitleFailed,
      `seo-title ${catScore('seo')}`,
      product.seo.title ? `"${product.seo.title}"` : '"" (not set)',
      `Write an SEO title that is EXACTLY 30–60 characters. Current: ${product.seo.title?.length ?? 0} chars.`,
    ),

    fieldDirective(
      'improvedSeoDescription',
      seoDescFailed,
      `seo-desc ${catScore('seo')}`,
      product.seo.description ? `"${product.seo.description}"` : '"" (not set)',
      `Write an SEO description that is EXACTLY 120–160 characters. Current: ${product.seo.description?.length ?? 0} chars.`,
    ),

    fieldDirective(
      'suggestedTags',
      tagsFailed,
      `tags ${categoryScores['metadata'].score}/${categoryScores['metadata'].maxScore}`,
      `[${product.tags.map((t) => `"${t}"`).join(', ')}]`,
      `Suggest 5–10 relevant lowercase tags. Preserve useful existing tags: [${product.tags.join(', ')}].`,
    ),
  ].join('\n\n');

  // Build upfront failure summary so the model sees the full picture before
  // reading per-field directives.
  const fixableSummary =
    fixable.length > 0
      ? [
          `FIXABLE FAILURES — fixing these gains ${fixablePoints} pts → raises score to ${targetScore}/100:`,
          ...fixable.map(
            (c) =>
              `  • [${c.category.toUpperCase()}] ${c.label} — −${c.maxScore} pts${c.suggestion ? ' → ' + c.suggestion : ''}`,
          ),
        ].join('\n')
      : 'No fixable copy failures — all copy fields pass.';

  const manualSummary =
    manualOnly.length > 0
      ? [
          'MANUAL-ONLY (require Shopify Admin action — do NOT attempt to fix via copy):',
          ...manualOnly.map((c) => `  • [${c.category.toUpperCase()}] ${c.label} — −${c.maxScore} pts`),
        ].join('\n')
      : '';

  return `PRODUCT:
Title: "${product.title}"
Description (plain): ${plainDesc || '(empty)'}
Description (HTML): ${product.descriptionHtml || '(empty)'}
SEO Title: ${product.seo.title ? `"${product.seo.title}"` : '(not set)'}
SEO Description: ${product.seo.description ? `"${product.seo.description}"` : '(not set)'}
Vendor: ${product.vendor || '(not set)'}
Product Type: ${product.productType || '(not set)'}
Tags: [${product.tags.map((t) => `"${t}"`).join(', ')}]

AUDIT SCORE: ${totalScore}/100 — Grade: ${grade}
${fixableSummary}${manualSummary ? '\n' + manualSummary : ''}

PER-FIELD DIRECTIVES — follow exactly:
${directives}

reasoning: One paragraph stating which checks were fixed, estimated score gain from ${totalScore} toward ${targetScore}/100, and which issues require manual Shopify Admin action.`;
}

// ---------------------------------------------------------------------------
// Expected score — re-run audit against the projected (suggested) product
// ---------------------------------------------------------------------------

function computeExpectedScore(product: FlatProduct, suggestion: ProductSuggestion): number {
  const projected: FlatProduct = {
    ...product,
    title: suggestion.improvedTitle,
    descriptionHtml:
      suggestion.improvedDescriptionHtml || `<p>${suggestion.improvedDescription}</p>`,
    seo: {
      title: suggestion.improvedSeoTitle.trim() || null,
      description: suggestion.improvedSeoDescription.trim() || null,
    },
    tags: suggestion.suggestedTags,
  };
  return auditProduct(projected).totalScore;
}

// ---------------------------------------------------------------------------
// Groq helper — retries on 429 and 5xx
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
        max_tokens: 2048,
        stream: true as const,
        temperature: 0.3,
      });
    } catch (err: unknown) {
      lastError = err;
      const httpStatus = (err as { status?: number })?.status;
      const isRetryable =
        attempt < maxRetries &&
        (httpStatus === 429 || (typeof httpStatus === 'number' && httpStatus >= 500));

      if (isRetryable) {
        const delay = 600 * 2 ** attempt;
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
// JSON sanitiser — fixes bare control characters in LLM output
// ---------------------------------------------------------------------------

function sanitiseRawJson(raw: string): string {
  let out = '';
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === '\\') {
      out += ch + (raw[i + 1] ?? '');
      i += 2;
    } else if (ch.charCodeAt(0) < 0x20) {
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
// Type guard
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
// Input validation
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
  if (request.headers.get('x-requested-with') !== 'XMLHttpRequest') {
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

  if (!isValidBody(rawBody)) {
    return Response.json(
      { error: 'Request body must contain { product: FlatProduct; auditResult: ProductAuditResult }' },
      { status: 422 },
    );
  }

  const { product, auditResult, auditLogId } = rawBody;

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

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Emits a plain data event (no event type) or a named SSE event.
      function emit(data: string, eventType?: string): void {
        const prefix = eventType ? `event: ${eventType}\n` : '';
        controller.enqueue(encoder.encode(`${prefix}data: ${data}\n\n`));
      }

      let fullContent = '';

      // ── 1. Stream Groq tokens to the client ─────────────────────────────
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

      // ── 2. Parse, re-audit, and persist ─────────────────────────────────
      // All DB work and the score event MUST happen before emit('[DONE]') and
      // controller.close() — Next.js drops async work after close().
      try {
        const parsed: unknown = JSON.parse(sanitiseRawJson(fullContent.trim()));
        const valid = isProductSuggestion(parsed);

        if (valid) {
          const expectedScore = computeExpectedScore(product, parsed);

          await prisma.productSuggestion.create({
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
              expectedScore,
              auditLogId: typeof auditLogId === 'string' ? auditLogId : null,
              storeDomain: process.env.SHOPIFY_STORE_DOMAIN ?? 'unknown',
            },
          });

          // Send the before/after score so the client can show the improvement.
          emit(
            JSON.stringify({ current: auditResult.totalScore, expected: expectedScore }),
            'score',
          );
        } else {
          console.warn('[suggest] isProductSuggestion failed — keys:', Object.keys(parsed as object));
        }
      } catch (err) {
        console.error('[suggest] DB save / re-audit failed:', err);
      }

      // ── 3. Signal completion ─────────────────────────────────────────────
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
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    },
  });
}
