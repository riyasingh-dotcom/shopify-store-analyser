import { z } from 'zod';
import OpenAI from 'openai';
import type { Stream } from 'openai/streaming';
import type { ChatCompletionChunk } from 'openai/resources/chat/completions';
import type { Product } from '@/types/shopify';
import type { ProductAuditResult, ProductAuditCheck } from '@/lib/analysis/products/productAudit';
import { auditProduct, type AuditCategory } from '@/lib/analysis/products/productAudit';
import { prisma } from '@/lib/prisma';
import type { ProductSuggestion } from '@/types/suggestions';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { groqRatelimit, getRateLimitIdentifier } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Zod schemas — single source of truth for request body validation
// ---------------------------------------------------------------------------

const MoneyV2Schema = z.object({
  amount: z.string(),
  currencyCode: z.string(),
});

const ProductSchema = z.object({
  id: z.string().min(1).max(200),
  title: z.string(),
  descriptionHtml: z.string(),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'DRAFT']),
  vendor: z.string(),
  productType: z.string(),
  tags: z.array(z.string()),
  onlineStoreUrl: z.string().nullable(),
  seo: z.object({
    title: z.string().nullable(),
    description: z.string().nullable(),
  }),
  totalInventory: z.number(),
  priceRangeV2: z.object({
    minVariantPrice: MoneyV2Schema,
    maxVariantPrice: MoneyV2Schema,
  }),
  variants: z.array(z.object({
    id: z.string(),
    title: z.string(),
    price: z.string(),
    inventoryQuantity: z.number().nullable(),
    sku: z.string().nullable(),
  })),
  images: z.array(z.object({
    url: z.string(),
    altText: z.string().nullable(),
  })),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const AuditCategorySchema = z.enum(['title', 'description', 'seo', 'media', 'metadata']);

const ProductAuditCheckSchema = z.object({
  id: z.string(),
  category: AuditCategorySchema,
  label: z.string(),
  passed: z.boolean(),
  score: z.number(),
  maxScore: z.number(),
  suggestion: z.string().optional(),
});

const CategoryScoreSchema = z.object({ score: z.number(), maxScore: z.number() });

const ProductAuditResultSchema = z.object({
  productId: z.string(),
  checks: z.array(ProductAuditCheckSchema),
  totalScore: z.number(),
  grade: z.enum(['A', 'B', 'C', 'D', 'F']),
  categoryScores: z.object({
    title: CategoryScoreSchema,
    description: CategoryScoreSchema,
    seo: CategoryScoreSchema,
    media: CategoryScoreSchema,
    metadata: CategoryScoreSchema,
  }),
});

const SuggestBodySchema = z.object({
  product: ProductSchema,
  auditResult: ProductAuditResultSchema,
  auditLogId: z.string().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Type guards (retained for Groq error handling and response validation)
// ---------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function hasHttpStatus(e: unknown): e is { status: number } {
  return isRecord(e) && 'status' in e && typeof e.status === 'number';
}

function isProductSuggestion(v: unknown): v is ProductSuggestion {
  if (!isRecord(v)) return false;
  return (
    typeof v.improvedTitle === 'string' &&
    typeof v.improvedDescription === 'string' &&
    typeof v.improvedDescriptionHtml === 'string' &&
    typeof v.improvedSeoTitle === 'string' &&
    typeof v.improvedSeoDescription === 'string' &&
    Array.isArray(v.suggestedTags) &&
    v.suggestedTags.every((t: unknown) => typeof t === 'string') &&
    typeof v.reasoning === 'string'
  );
}

// ---------------------------------------------------------------------------
// Prompt helpers
// ---------------------------------------------------------------------------

function stripHtmlForPrompt(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Hard-cap each product field before injecting into the prompt.
// Prevents oversized inputs from consuming excessive tokens and limits the
// surface area for prompt injection via crafted product data.
const PROMPT_LIMITS = {
  title: 200,
  desc: 10_000,
  seoTitle: 300,
  seoDesc: 500,
  vendor: 200,
  productType: 200,
  tag: 100,
} satisfies Record<string, number>;

function cap(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
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

function buildUserPrompt(product: Product, auditResult: ProductAuditResult): string {
  const plainDesc = stripHtmlForPrompt(product.descriptionHtml);
  const { categoryScores, checks, totalScore, grade } = auditResult;

  const failedChecks = checks.filter((c) => !c.passed);

  // Single-pass partition — avoids iterating failedChecks twice.
  const fixable: ProductAuditCheck[] = [];
  const manualOnly: ProductAuditCheck[] = [];
  for (const c of failedChecks) {
    if (isCopyFixable(c)) fixable.push(c);
    else manualOnly.push(c);
  }
  fixable.sort((a, b) => b.maxScore - a.maxScore);
  manualOnly.sort((a, b) => b.maxScore - a.maxScore);

  const fixablePoints = fixable.reduce((sum, c) => sum + c.maxScore, 0);
  const targetScore = totalScore + fixablePoints;

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

  // Truncate every field before embedding in the prompt to reduce the prompt
  // injection surface area and keep token usage predictable.
  const safeTitle = cap(product.title, PROMPT_LIMITS.title);
  const safeDesc = cap(plainDesc, PROMPT_LIMITS.desc);
  const safeDescHtml = cap(product.descriptionHtml, PROMPT_LIMITS.desc);
  const safeSeoTitle = product.seo.title ? cap(product.seo.title, PROMPT_LIMITS.seoTitle) : null;
  const safeSeoDesc = product.seo.description ? cap(product.seo.description, PROMPT_LIMITS.seoDesc) : null;
  const safeVendor = cap(product.vendor, PROMPT_LIMITS.vendor);
  const safeProductType = cap(product.productType, PROMPT_LIMITS.productType);
  const safeTags = product.tags.map((t) => cap(t, PROMPT_LIMITS.tag));

  const directives = [
    fieldDirective(
      'improvedTitle',
      titleFailed,
      `title ${catScore('title')}`,
      `"${safeTitle}"`,
      'Rewrite to pass ALL checks: 20–70 characters, no generic prefix (New/Best/Buy/Cheap/Top), at least 2 words with a descriptor, no ALL CAPS. Keep the core product name.',
    ),

    fieldDirective(
      'improvedDescription + improvedDescriptionHtml',
      descFailed,
      `description ${catScore('description')}`,
      `plain="${safeDesc || '(empty)'}" html="${safeDescHtml || '(empty)'}"`,
      'Rewrite to pass ALL checks: 300+ characters, 2+ <p> paragraphs, no placeholder text. Preserve all factual product details.',
    ),

    fieldDirective(
      'improvedSeoTitle',
      seoTitleFailed,
      `seo-title ${catScore('seo')}`,
      safeSeoTitle ? `"${safeSeoTitle}"` : '"" (not set)',
      `Write an SEO title that is EXACTLY 30–60 characters. Current: ${safeSeoTitle?.length ?? 0} chars.`,
    ),

    fieldDirective(
      'improvedSeoDescription',
      seoDescFailed,
      `seo-desc ${catScore('seo')}`,
      safeSeoDesc ? `"${safeSeoDesc}"` : '"" (not set)',
      `Write an SEO description that is EXACTLY 120–160 characters. Current: ${safeSeoDesc?.length ?? 0} chars.`,
    ),

    fieldDirective(
      'suggestedTags',
      tagsFailed,
      `tags ${categoryScores['metadata'].score}/${categoryScores['metadata'].maxScore}`,
      `[${safeTags.map((t) => `"${t}"`).join(', ')}]`,
      `Suggest 5–10 relevant lowercase tags. Preserve useful existing tags: [${safeTags.join(', ')}].`,
    ),
  ].join('\n\n');

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
Title: "${safeTitle}"
Description (plain): ${safeDesc || '(empty)'}
Description (HTML): ${safeDescHtml || '(empty)'}
SEO Title: ${safeSeoTitle ? `"${safeSeoTitle}"` : '(not set)'}
SEO Description: ${safeSeoDesc ? `"${safeSeoDesc}"` : '(not set)'}
Vendor: ${safeVendor || '(not set)'}
Product Type: ${safeProductType || '(not set)'}
Tags: [${safeTags.map((t) => `"${t}"`).join(', ')}]

AUDIT SCORE: ${totalScore}/100 — Grade: ${grade}
${fixableSummary}${manualSummary ? '\n' + manualSummary : ''}

PER-FIELD DIRECTIVES — follow exactly:
${directives}

reasoning: One paragraph stating which checks were fixed, estimated score gain from ${totalScore} toward ${targetScore}/100, and which issues require manual Shopify Admin action.`;
}

// ---------------------------------------------------------------------------
// Expected score — re-run audit against the projected (suggested) product
// ---------------------------------------------------------------------------

function computeExpectedScore(product: Product, suggestion: ProductSuggestion): number {
  const projected: Product = {
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
            { role: 'system' as const, content: systemPrompt },
            { role: 'user' as const, content: userContent },
          ],
          max_tokens: 2048,
          stream: true as const,
          temperature: 0.3,
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
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  const { success } = await groqRatelimit.limit(getRateLimitIdentifier(request));
  if (!success) {
    return Response.json(
      { error: 'Too many requests. Please wait a minute before trying again.' },
      { status: 429 },
    );
  }

  // CSRF guard: require X-Requested-With AND verify the Origin matches this host.
  // Origin is absent on same-origin navigations in most browsers; when present it
  // must match the Host header, blocking cross-origin fetch from attacker domains.
  const origin = request.headers.get('origin');
  const host = request.headers.get('host') ?? '';
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

  const parseResult = SuggestBodySchema.safeParse(rawBody);
  if (!parseResult.success) {
    return Response.json(
      { error: 'Invalid request body', issues: parseResult.error.issues },
      { status: 400 },
    );
  }

  const { product, auditResult, auditLogId } = parseResult.data;

  const client = new OpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey,
  });

  // Own AbortController so cancel() can abort the upstream request without
  // relying on the undocumented Stream.controller property.
  const streamAbort = new AbortController();

  const groqStream = await createGroqStream(
    client,
    SYSTEM_PROMPT,
    buildUserPrompt(product, auditResult),
    streamAbort.signal,
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

      // ── 2. Parse, sanitize, re-audit, and persist ────────────────────────
      // All DB work and the score event MUST happen before emit('[DONE]') and
      // controller.close() — Next.js drops async work after close().
      try {
        const parsed: unknown = JSON.parse(sanitiseRawJson(fullContent.trim()));

        if (isProductSuggestion(parsed)) {
          // Sanitize AI-generated HTML before storing or scoring — eliminates
          // any XSS vectors injected via crafted product data (prompt injection).
          const safeHtml = sanitizeHtml(parsed.improvedDescriptionHtml);
          const safeParsed: ProductSuggestion = { ...parsed, improvedDescriptionHtml: safeHtml };

          const expectedScore = computeExpectedScore(product, safeParsed);

          await prisma.productSuggestion.create({
            data: {
              productId: product.id,
              productTitle: product.title,
              originalTitle: product.title,
              improvedTitle: safeParsed.improvedTitle,
              originalDescription: stripHtmlForPrompt(product.descriptionHtml),
              improvedDescription: safeParsed.improvedDescription,
              improvedDescriptionHtml: safeHtml,
              originalSeoTitle: product.seo.title || null,
              improvedSeoTitle: safeParsed.improvedSeoTitle,
              originalSeoDescription: product.seo.description || null,
              improvedSeoDescription: safeParsed.improvedSeoDescription,
              suggestedTags: safeParsed.suggestedTags,
              reasoning: safeParsed.reasoning,
              auditScore: auditResult.totalScore,
              expectedScore,
              auditLogId: typeof auditLogId === 'string' ? auditLogId : null,
              storeDomain: process.env.SHOPIFY_STORE_DOMAIN ?? 'unknown',
            },
          });

          emit(
            JSON.stringify({ current: auditResult.totalScore, expected: expectedScore }),
            'score',
          );
        } else {
          const parsedKeys = isRecord(parsed) ? Object.keys(parsed) : [];
          console.warn('[suggest] isProductSuggestion failed — keys:', parsedKeys);
        }
      } catch (err) {
        console.error('[suggest] DB save / re-audit failed:', err);
      }

      // ── 3. Signal completion ─────────────────────────────────────────────
      emit('[DONE]');
      controller.close();
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
