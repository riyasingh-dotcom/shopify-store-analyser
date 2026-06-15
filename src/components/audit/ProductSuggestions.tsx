'use client';

import { useState, useCallback, useRef } from 'react';
import {
  type LucideIcon,
  AlertCircle,
  AlignLeft,
  Check,
  Copy,
  RotateCcw,
  Search,
  Sparkles,
  Tag,
  Type,
} from 'lucide-react';
import type { Product } from '@/types/shopify';
import type { ProductAuditResult } from '@/lib/audit/productAudit';
import type { ProductSuggestion } from '@/types/suggestions';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PartialSuggestion = Partial<ProductSuggestion>;
type SuggestionKey = keyof ProductSuggestion;
type StringSuggestionKey = Exclude<SuggestionKey, 'suggestedTags'>;

type Status = 'idle' | 'loading' | 'streaming' | 'complete' | 'error';
type TabId = 'title' | 'description' | 'seo' | 'tags';

type StringFieldState =
  | { status: 'pending' }
  | { status: 'streaming'; text: string }
  | { status: 'complete'; value: string };

type TagsFieldState =
  | { status: 'pending' }
  | { status: 'streaming' }
  | { status: 'complete'; value: string[] };

interface ProductSuggestionsProps {
  product: Product;
  auditResult: ProductAuditResult;
  savedSuggestion?: ProductSuggestion | null;
  savedExpectedScore?: number | null;
  auditLogId?: string | null;
}

// ---------------------------------------------------------------------------
// Type guards — no `as` casts
// ---------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isStringArray(arr: unknown[]): arr is string[] {
  return arr.every((t: unknown) => typeof t === 'string');
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
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
    isStringArray(v.suggestedTags) &&
    typeof v.reasoning === 'string'
  );
}

// ---------------------------------------------------------------------------
// Incremental JSON parsing — pre-compiled RegExps
// ---------------------------------------------------------------------------

// Complete-field patterns: require a closing " followed by , or } so we don't
// falsely match mid-stream content. Compiled once at module load — not per call.
const COMPLETE_RE: Record<StringSuggestionKey, RegExp> = {
  improvedTitle:          /"improvedTitle"\s*:\s*"((?:[^"\\]|\\.)*)"\s*(?=[,}])/,
  improvedDescription:    /"improvedDescription"\s*:\s*"((?:[^"\\]|\\.)*)"\s*(?=[,}])/,
  improvedDescriptionHtml:/"improvedDescriptionHtml"\s*:\s*"((?:[^"\\]|\\.)*)"\s*(?=[,}])/,
  improvedSeoTitle:       /"improvedSeoTitle"\s*:\s*"((?:[^"\\]|\\.)*)"\s*(?=[,}])/,
  improvedSeoDescription: /"improvedSeoDescription"\s*:\s*"((?:[^"\\]|\\.)*)"\s*(?=[,}])/,
  reasoning:              /"reasoning"\s*:\s*"((?:[^"\\]|\\.)*)"\s*(?=[,}])/,
};

// Partial-field patterns: match from the opening " to end-of-buffer (streaming).
const PARTIAL_RE: Record<StringSuggestionKey, RegExp> = {
  improvedTitle:          /"improvedTitle"\s*:\s*"([\s\S]*)/,
  improvedDescription:    /"improvedDescription"\s*:\s*"([\s\S]*)/,
  improvedDescriptionHtml:/"improvedDescriptionHtml"\s*:\s*"([\s\S]*)/,
  improvedSeoTitle:       /"improvedSeoTitle"\s*:\s*"([\s\S]*)/,
  improvedSeoDescription: /"improvedSeoDescription"\s*:\s*"([\s\S]*)/,
  reasoning:              /"reasoning"\s*:\s*"([\s\S]*)/,
};

// Tags: match a complete JSON array.
const TAGS_RE = /"suggestedTags"\s*:\s*(\[[^\]]*\])/;

// Pre-computed key strings used for fast lastIndexOf in detectStreamingField.
const FIELD_KEY: Record<SuggestionKey, string> = {
  improvedTitle:           '"improvedTitle"',
  improvedDescription:     '"improvedDescription"',
  improvedDescriptionHtml: '"improvedDescriptionHtml"',
  improvedSeoTitle:        '"improvedSeoTitle"',
  improvedSeoDescription:  '"improvedSeoDescription"',
  suggestedTags:           '"suggestedTags"',
  reasoning:               '"reasoning"',
};

const FIELD_ORDER: SuggestionKey[] = [
  'improvedTitle',
  'improvedDescription',
  'improvedDescriptionHtml',
  'improvedSeoTitle',
  'improvedSeoDescription',
  'suggestedTags',
  'reasoning',
];

// Decode common JSON escape sequences for partial (unclosed) string display.
function decodePartial(raw: string): string {
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function extractStringField(buffer: string, key: StringSuggestionKey): string | undefined {
  const m = COMPLETE_RE[key].exec(buffer);
  if (!m) return undefined;
  try {
    const parsed: unknown = JSON.parse(`"${m[1]}"`);
    return typeof parsed === 'string' ? parsed : m[1];
  } catch {
    return m[1];
  }
}

function extractArrayField(buffer: string): string[] | undefined {
  const m = TAGS_RE.exec(buffer);
  if (!m) return undefined;
  try {
    const parsed: unknown = JSON.parse(m[1]);
    if (Array.isArray(parsed) && isStringArray(parsed)) return parsed;
    return undefined;
  } catch {
    return undefined;
  }
}

// Skip fields already in `complete` — avoids rescanning the entire buffer for
// every token for fields that are already resolved (prevents O(n²) complexity).
function parsePartialSuggestion(
  buffer: string,
  complete: ReadonlySet<SuggestionKey>,
): PartialSuggestion {
  const result: PartialSuggestion = {};
  const stringKeys: StringSuggestionKey[] = [
    'improvedTitle',
    'improvedDescription',
    'improvedDescriptionHtml',
    'improvedSeoTitle',
    'improvedSeoDescription',
    'reasoning',
  ];
  for (const key of stringKeys) {
    if (complete.has(key)) continue;
    result[key] = extractStringField(buffer, key);
  }
  if (!complete.has('suggestedTags')) {
    result.suggestedTags = extractArrayField(buffer);
  }
  return result;
}

function detectStreamingField(
  buffer: string,
  partial: PartialSuggestion,
): { field: SuggestionKey | null; value: string } {
  let lastField: SuggestionKey | null = null;
  let lastIdx = -1;

  for (const field of FIELD_ORDER) {
    const idx = buffer.lastIndexOf(FIELD_KEY[field]);
    if (idx > lastIdx) {
      lastIdx = idx;
      lastField = field;
    }
  }

  if (!lastField) return { field: null, value: '' };
  if (partial[lastField] !== undefined) return { field: null, value: '' };

  if (lastField === 'suggestedTags') {
    return { field: lastField, value: '' };
  }

  // TypeScript narrows lastField to StringSuggestionKey after the 'suggestedTags' guard above.
  const m = PARTIAL_RE[lastField].exec(buffer);
  return { field: lastField, value: m ? decodePartial(m[1]) : '' };
}

// ---------------------------------------------------------------------------
// Atoms
// ---------------------------------------------------------------------------

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

function StreamCursor() {
  return (
    <span className="ml-0.5 inline-block h-[1em] w-0.5 bg-indigo-400 align-middle animate-pulse" />
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handle = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard denied */
    }
  }, [value]);

  return (
    <button
      type="button"
      onClick={handle}
      aria-label="Copy to clipboard"
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ring-1 transition-all ${
        copied
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          : 'bg-white text-gray-500 ring-gray-200 hover:bg-gray-50 hover:text-gray-700'
      }`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function CharBadge({ value, min, max }: { value: string; min: number; max: number }) {
  const len = value.length;
  const ok = len >= min && len <= max;
  const over = len > max;
  return (
    <span
      className={`text-[11px] font-semibold tabular-nums ${
        ok ? 'text-emerald-600' : over ? 'text-red-500' : 'text-amber-500'
      }`}
      title={`${min}–${max} characters recommended`}
    >
      {len}/{max}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Streaming-aware field helpers
// ---------------------------------------------------------------------------

function getStringFieldState(
  fieldKey: StringSuggestionKey,
  partial: PartialSuggestion,
  streamField: SuggestionKey | null,
  streamValue: string,
): StringFieldState {
  const val = partial[fieldKey];
  if (typeof val === 'string') return { status: 'complete', value: val };
  if (streamField === fieldKey) return { status: 'streaming', text: streamValue };
  return { status: 'pending' };
}

function SuggestedTextField({
  fieldKey,
  partial,
  streamField,
  streamValue,
  charRange,
}: {
  fieldKey: StringSuggestionKey;
  partial: PartialSuggestion;
  streamField: SuggestionKey | null;
  streamValue: string;
  charRange?: { min: number; max: number };
}) {
  const state = getStringFieldState(fieldKey, partial, streamField, streamValue);
  const displayText = state.status === 'complete' ? state.value : state.status === 'streaming' ? state.text : '';

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Suggested</span>
        <div className="flex items-center gap-2">
          {charRange && displayText && (
            <CharBadge value={displayText} min={charRange.min} max={charRange.max} />
          )}
          {state.status === 'complete' && <CopyButton value={state.value} />}
        </div>
      </div>
      {state.status === 'pending' ? (
        <Skeleton className="h-4 w-4/5" />
      ) : (
        <p className="min-h-5 text-sm font-medium text-gray-900">
          {displayText}
          {state.status === 'streaming' && <StreamCursor />}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab panels
// ---------------------------------------------------------------------------

type PanelProps = {
  product: Product;
  partial: PartialSuggestion;
  streamField: SuggestionKey | null;
  streamValue: string;
};

function TitlePanel({ product, partial, streamField, streamValue }: PanelProps) {
  return (
    <div className="p-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Product Title
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Current</p>
          <p className="text-sm text-gray-700">{product.title}</p>
        </div>
        <SuggestedTextField
          fieldKey="improvedTitle"
          partial={partial}
          streamField={streamField}
          streamValue={streamValue}
          charRange={{ min: 20, max: 70 }}
        />
      </div>
    </div>
  );
}

function DescriptionPanel({ product, partial, streamField, streamValue }: PanelProps) {
  const [viewRaw, setViewRaw] = useState(false);
  const htmlState = getStringFieldState('improvedDescriptionHtml', partial, streamField, streamValue);
  const textState = getStringFieldState('improvedDescription', partial, streamField, streamValue);

  return (
    <div className="p-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Product Description
      </p>
      <div className="space-y-3">
        {/* Current — Shopify HTML sanitized before rendering */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Current</p>
          {product.descriptionHtml ? (
            <div
              className="prose prose-sm max-w-none text-gray-600"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.descriptionHtml) }}
            />
          ) : (
            <p className="text-sm italic text-gray-400">No description set.</p>
          )}
        </div>
        {/* Suggested — AI HTML sanitized before rendering */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              Suggested
            </span>
            {htmlState.status === 'complete' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewRaw((v) => !v)}
                  className="rounded px-2 py-0.5 text-[11px] font-medium text-gray-500 ring-1 ring-gray-200 transition-colors hover:bg-white"
                >
                  {viewRaw ? 'Preview' : 'HTML'}
                </button>
                <CopyButton
                  value={viewRaw ? htmlState.value : (partial.improvedDescription ?? '')}
                />
              </div>
            )}
          </div>

          {htmlState.status === 'complete' ? (
            viewRaw ? (
              <pre className="overflow-auto rounded bg-white p-2.5 font-mono text-[11px] leading-relaxed text-gray-600 ring-1 ring-gray-100 whitespace-pre-wrap">
                {htmlState.value}
              </pre>
            ) : (
              <div
                className="prose prose-sm max-w-none text-gray-800"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlState.value) }}
              />
            )
          ) : textState.status === 'complete' ? (
            <div>
              <p className="text-sm text-gray-800">{textState.value}</p>
              <p className="mt-2 text-[11px] text-indigo-400 animate-pulse">Formatting HTML…</p>
            </div>
          ) : textState.status === 'streaming' ? (
            <p className="min-h-12 text-sm text-gray-800">
              {textState.text}
              <StreamCursor />
            </p>
          ) : (
            <div className="min-h-12 space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SeoPanel({ product, partial, streamField, streamValue }: PanelProps) {
  const titleState = getStringFieldState('improvedSeoTitle', partial, streamField, streamValue);
  const descState = getStringFieldState('improvedSeoDescription', partial, streamField, streamValue);

  const previewTitle =
    titleState.status === 'complete'
      ? titleState.value
      : titleState.status === 'streaming'
        ? titleState.text
        : '';
  const previewDesc =
    descState.status === 'complete'
      ? descState.value
      : descState.status === 'streaming'
        ? descState.text
        : '';

  return (
    <div className="space-y-5 p-5">
      {/* SEO Title */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">SEO Title</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Current</p>
            {product.seo.title ? (
              <p className="text-sm text-gray-700">{product.seo.title}</p>
            ) : (
              <p className="text-sm italic text-gray-400">Not set</p>
            )}
          </div>
          <SuggestedTextField
            fieldKey="improvedSeoTitle"
            partial={partial}
            streamField={streamField}
            streamValue={streamValue}
            charRange={{ min: 30, max: 60 }}
          />
        </div>
      </div>

      {/* SEO Description */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          SEO Description
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Current</p>
            {product.seo.description ? (
              <p className="text-sm text-gray-700">{product.seo.description}</p>
            ) : (
              <p className="text-sm italic text-gray-400">Not set</p>
            )}
          </div>
          <SuggestedTextField
            fieldKey="improvedSeoDescription"
            partial={partial}
            streamField={streamField}
            streamValue={streamValue}
            charRange={{ min: 120, max: 160 }}
          />
        </div>
      </div>

      {/* SERP preview */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
          Google Preview
        </p>
        <div className="max-w-lg">
          <p className="text-[12px] text-gray-400">your-store.myshopify.com › products</p>
          <p className="mt-0.5 line-clamp-1 min-h-5 text-[15px] font-medium text-blue-600">
            {previewTitle || (
              <span className="text-gray-300 font-normal italic">Generating SEO title…</span>
            )}
            {titleState.status === 'streaming' && <StreamCursor />}
          </p>
          <p className="mt-1 line-clamp-2 min-h-8 text-[13px] leading-snug text-gray-600">
            {previewDesc || (
              <span className="text-gray-300 italic">Generating SEO description…</span>
            )}
            {descState.status === 'streaming' && <StreamCursor />}
          </p>
        </div>
      </div>
    </div>
  );
}

function TagsPanel({ product, partial, streamField }: PanelProps) {
  const tagsValue = partial.suggestedTags;
  const tagsState: TagsFieldState =
    tagsValue !== undefined
      ? { status: 'complete', value: tagsValue }
      : streamField === 'suggestedTags'
        ? { status: 'streaming' }
        : { status: 'pending' };

  const currentSet = new Set(product.tags.map((t) => t.toLowerCase()));

  return (
    <div className="p-5">
      <div className="space-y-3">
        {/* Current */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Current</p>
          {product.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm italic text-gray-400">No tags set.</p>
          )}
        </div>

        {/* Suggested */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              Suggested
            </span>
            {tagsState.status === 'complete' && (
              <CopyButton value={tagsState.value.join(', ')} />
            )}
          </div>

          {tagsState.status === 'pending' && (
            <div className="flex flex-wrap gap-1.5">
              {[60, 80, 50, 70, 45, 65, 55].map((w, i) => (
                <div
                  key={i}
                  className="h-5 animate-pulse rounded-full bg-gray-200"
                  style={{ width: `${w}px` }}
                />
              ))}
            </div>
          )}

          {tagsState.status === 'streaming' && (
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-indigo-500">Generating tags</p>
              <StreamCursor />
            </div>
          )}

          {tagsState.status === 'complete' && (
            <>
              <div className="flex flex-wrap gap-1.5">
                {tagsState.value.map((tag) => {
                  const isNew = !currentSet.has(tag.toLowerCase());
                  return (
                    <span
                      key={tag}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                        isNew
                          ? 'bg-indigo-50 text-indigo-700 ring-indigo-200'
                          : 'bg-white text-gray-600 ring-gray-200'
                      }`}
                    >
                      {tag}
                      {isNew && (
                        <span className="ml-1 text-[9px] font-bold uppercase tracking-wide text-indigo-400">
                          new
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
              {(() => {
                const newCount = tagsState.value.filter(
                  (t) => !currentSet.has(t.toLowerCase()),
                ).length;
                return newCount > 0 ? (
                  <p className="mt-2 text-[11px] text-indigo-500">
                    <span className="font-semibold">{newCount}</span>{' '}
                    new tag{newCount !== 1 ? 's' : ''} suggested
                  </p>
                ) : null;
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab bar config
// ---------------------------------------------------------------------------

const TABS: Array<{ id: TabId; label: string; Icon: LucideIcon; fields: SuggestionKey[] }> = [
  { id: 'title', label: 'Title', Icon: Type, fields: ['improvedTitle'] },
  {
    id: 'description',
    label: 'Description',
    Icon: AlignLeft,
    fields: ['improvedDescription', 'improvedDescriptionHtml'],
  },
  { id: 'seo', label: 'SEO', Icon: Search, fields: ['improvedSeoTitle', 'improvedSeoDescription'] },
  { id: 'tags', label: 'Tags', Icon: Tag, fields: ['suggestedTags'] },
];

// ---------------------------------------------------------------------------
// Card wrapper
// ---------------------------------------------------------------------------

function Card({ header, children }: { header: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
        {header}
      </div>
      {children}
    </div>
  );
}

function CardTitle({ pulsing = false }: { pulsing?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
        <Sparkles className={`h-4 w-4 text-indigo-600 ${pulsing ? 'animate-pulse' : ''}`} />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">AI Suggestions</p>
        <p className="text-xs text-gray-400">Powered by Groq</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ProductSuggestions({
  product,
  auditResult,
  savedSuggestion,
  savedExpectedScore,
  auditLogId,
}: ProductSuggestionsProps) {
  const [status, setStatus] = useState<Status>(savedSuggestion ? 'complete' : 'idle');
  const [partial, setPartial] = useState<PartialSuggestion>(savedSuggestion ?? {});
  const [streamField, setStreamField] = useState<SuggestionKey | null>(null);
  const [streamValue, setStreamValue] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('title');
  const [expectedScore, setExpectedScore] = useState<number | null>(savedExpectedScore ?? null);
  const abortRef = useRef<AbortController | null>(null);
  const bufferRef = useRef('');
  // Tracks which fields have been fully resolved to skip re-scanning them on
  // every token (avoids O(n²) regex work as the buffer grows).
  const completeFieldsRef = useRef<Set<SuggestionKey>>(new Set());

  const run = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setStatus('loading');
    setPartial({});
    setStreamField(null);
    setStreamValue('');
    setExpectedScore(null);
    setActiveTab('title');
    bufferRef.current = '';
    completeFieldsRef.current = new Set();

    let response: Response;
    try {
      response = await fetch('/api/products/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ product, auditResult, auditLogId }),
        signal: ctrl.signal,
      });
    } catch (err) {
      if (isAbortError(err)) return;
      setStatus('error');
      return;
    }

    if (!response.ok || !response.body) {
      setStatus('error');
      return;
    }

    setStatus('streaming');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = '';

    try {
      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const events = sseBuffer.split('\n\n');
        sseBuffer = events.pop() ?? '';

        for (const block of events) {
          const trimmed = block.trim();
          if (!trimmed) continue;

          let sseEventType: string | undefined;
          let sseData: string | undefined;
          for (const line of trimmed.split('\n')) {
            if (line.startsWith('event: ')) sseEventType = line.slice('event: '.length).trim();
            else if (line.startsWith('data: ')) sseData = line.slice('data: '.length);
          }
          if (!sseData) continue;

          if (sseEventType === 'score') {
            try {
              const scorePayload: unknown = JSON.parse(sseData);
              if (
                isRecord(scorePayload) &&
                typeof scorePayload.expected === 'number'
              ) {
                setExpectedScore(scorePayload.expected);
              }
            } catch { /* ignore malformed score event */ }
            continue;
          }

          if (sseData === '[DONE]') {
            // Set flag and break inner loop — outer while checks !streamDone
            streamDone = true;
            break;
          }

          bufferRef.current += sseData;

          const newPartial = parsePartialSuggestion(bufferRef.current, completeFieldsRef.current);
          // Mark newly completed fields so future iterations skip them.
          for (const key of FIELD_ORDER) {
            if (newPartial[key] !== undefined) completeFieldsRef.current.add(key);
          }

          const detected = detectStreamingField(bufferRef.current, newPartial);
          setPartial(newPartial);
          setStreamField(detected.field);
          setStreamValue(detected.value);
        }
      }
      sseBuffer += decoder.decode();
    } catch (err) {
      if (isAbortError(err)) return;
      setStatus('error');
      return;
    }

    try {
      const parsed: unknown = JSON.parse(bufferRef.current.trim());
      if (isProductSuggestion(parsed)) {
        setPartial(parsed);
        setStreamField(null);
        setStreamValue('');
        setStatus('complete');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }, [product, auditResult, auditLogId]);

  // ── idle ──────────────────────────────────────────────────────────────────

  if (status === 'idle') {
    return (
      <Card header={<CardTitle />}>
        <div className="p-5">
          <p className="mb-4 text-sm text-gray-500">
            Get AI-generated copy improvements for this product — optimised title, description, SEO
            fields, and tags based on the audit results.
          </p>
          <button
            type="button"
            onClick={run}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 active:bg-indigo-800"
          >
            <Sparkles className="h-4 w-4" />
            Get AI Suggestions
          </button>
        </div>
      </Card>
    );
  }

  // ── loading ───────────────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <Card header={<CardTitle pulsing />}>
        <div className="flex items-center gap-3 p-5">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 animate-bounce rounded-full bg-indigo-300"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
          <p className="text-sm text-gray-600">AI is analysing this product…</p>
        </div>
      </Card>
    );
  }

  // ── error ─────────────────────────────────────────────────────────────────

  if (status === 'error') {
    return (
      <Card header={<CardTitle />}>
        <div className="flex items-start gap-3 p-5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-red-800">Failed to generate suggestions</p>
            <p className="mt-0.5 text-xs text-red-500">
              The AI service returned an error. Check GROQ_API_KEY and try again.
            </p>
          </div>
          <button
            type="button"
            onClick={run}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 ring-1 ring-red-200 transition-colors hover:bg-red-100 active:scale-95"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      </Card>
    );
  }

  // ── streaming / complete ──────────────────────────────────────────────────

  const isStreaming = status === 'streaming';

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
        <CardTitle pulsing={isStreaming} />
        {!isStreaming && (
          <button
            type="button"
            onClick={run}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 active:scale-95"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Regenerate
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-0.5 border-b border-gray-100 px-4 pt-1">
        {TABS.map(({ id, label, Icon, fields }) => {
          const hasContent =
            isStreaming &&
            fields.some((f) => partial[f] !== undefined || streamField === f);
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`-mb-px relative flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
                activeTab === id
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{label.slice(0, 4)}</span>
              {hasContent && activeTab !== id && (
                <span className="absolute right-0.5 top-1 h-1.5 w-1.5 rounded-full bg-indigo-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Active panel */}
      {activeTab === 'title' && (
        <TitlePanel
          product={product}
          partial={partial}
          streamField={streamField}
          streamValue={streamValue}
        />
      )}
      {activeTab === 'description' && (
        <DescriptionPanel
          product={product}
          partial={partial}
          streamField={streamField}
          streamValue={streamValue}
        />
      )}
      {activeTab === 'seo' && (
        <SeoPanel
          product={product}
          partial={partial}
          streamField={streamField}
          streamValue={streamValue}
        />
      )}
      {activeTab === 'tags' && (
        <TagsPanel
          product={product}
          partial={partial}
          streamField={streamField}
          streamValue={streamValue}
        />
      )}

      {/* Reasoning footer */}
      {partial.reasoning && (
        <div className="border-t border-gray-100 px-5 py-3.5">
          <p className="text-xs italic leading-relaxed text-gray-500">
            <span className="not-italic font-semibold text-gray-400">Note: </span>
            {partial.reasoning}
          </p>
        </div>
      )}

      {/* Expected score improvement banner — shown after stream completes */}
      {status === 'complete' && expectedScore !== null && (
        <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Expected score after applying
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium tabular-nums text-gray-400">
                {auditResult.totalScore}/100
              </span>
              <span className="text-gray-300">→</span>
              <span
                className={`text-sm font-bold tabular-nums ${
                  expectedScore >= 80
                    ? 'text-emerald-600'
                    : expectedScore >= 60
                      ? 'text-blue-600'
                      : 'text-amber-600'
                }`}
              >
                {expectedScore}/100
              </span>
              {expectedScore > auditResult.totalScore && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 ring-1 ring-emerald-200">
                  +{expectedScore - auditResult.totalScore} pts
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
