'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { CheckCircle2, Sparkles, X, XCircle } from 'lucide-react';
import type { Product } from '@/types/shopify';
import type { ProductAuditResult } from '@/lib/analysis/products/productAudit';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BulkProduct = {
  id: string; // numeric id — used in /products/[id]/history links
  title: string;
  score: number;
  product: Product;
  auditResult: ProductAuditResult;
};

type ProductResult = { id: string; title: string; ok: boolean };
type Status = 'idle' | 'confirming' | 'running' | 'complete';

interface Props {
  poorProducts: BulkProduct[];
}

// ---------------------------------------------------------------------------
// Stream consumer — reads SSE until [DONE], discards tokens (DB save is
// handled server-side inside the route's ReadableStream.start()).
// ---------------------------------------------------------------------------

async function consumeStream(
  product: Product,
  auditResult: ProductAuditResult,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch('/api/products/suggest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({ product, auditResult }),
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`HTTP ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const events = buf.split('\n\n');
      buf = events.pop() ?? '';
      for (const ev of events) {
        if (ev.includes('data: [DONE]')) return;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BulkOptimise({ poorProducts }: Props) {
  const batch = poorProducts.slice(0, 5);
  const total = batch.length;

  const [status, setStatus] = useState<Status>('idle');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [results, setResults] = useState<ProductResult[]>([]);

  const cancelRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    cancelRef.current = false;
    setStatus('running');
    setCurrentIdx(0);
    setResults([]);

    const collected: ProductResult[] = [];

    for (let i = 0; i < batch.length; i++) {
      if (cancelRef.current) break;

      const item = batch[i];
      setCurrentIdx(i);

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        await consumeStream(item.product, item.auditResult, ctrl.signal);
        collected.push({ id: item.id, title: item.title, ok: true });
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') break;
        collected.push({ id: item.id, title: item.title, ok: false });
      }

      setResults([...collected]);
    }

    abortRef.current = null;
    setStatus('complete');
  }, [batch]);

  const cancel = useCallback(() => {
    cancelRef.current = true;
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setResults([]);
    setCurrentIdx(0);
  }, []);

  if (total === 0) return null;

  // ── Idle ────────────────────────────────────────────────────────────────────

  if (status === 'idle' || status === 'confirming') {
    return (
      <>
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100">
              <Sparkles className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {total} product{total !== 1 ? 's' : ''} ready for optimization
              </p>
              <p className="text-xs text-gray-500">
                Scored D or F — no AI suggestions saved yet
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatus('confirming')}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 active:bg-indigo-800"
          >
            <Sparkles className="h-4 w-4" />
            Bulk Optimise {total} Product{total !== 1 ? 's' : ''}
          </button>
        </div>

        {status === 'confirming' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/5"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                <Sparkles className="h-5 w-5 text-indigo-600" />
              </div>
              <h2
                id="confirm-title"
                className="text-base font-semibold text-gray-900"
              >
                Bulk Optimise Products
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                This will generate AI suggestions for up to{' '}
                <span className="font-medium text-gray-700">{total} product{total !== 1 ? 's' : ''}</span>.
                Each takes ~5 seconds. Continue?
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={run}
                  className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('idle')}
                  className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ── Running ─────────────────────────────────────────────────────────────────

  if (status === 'running') {
    const completed = results.length;
    const pct = Math.round((completed / total) * 100);
    const current = batch[currentIdx];

    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50">
              <Sparkles className="h-4 w-4 animate-pulse text-indigo-600" />
            </div>
            <p className="text-sm font-semibold text-gray-900">Bulk Optimising…</p>
          </div>
          <button
            type="button"
            onClick={cancel}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mb-4 text-right text-[11px] tabular-nums text-gray-400">
          {completed}/{total}
        </p>

        {/* Current product */}
        <p className="mb-4 text-xs text-gray-500">
          Processing product{' '}
          <span className="font-semibold text-gray-700">
            {Math.min(currentIdx + 1, total)} of {total}
          </span>
          {current ? (
            <>
              :{' '}
              <span className="font-medium text-gray-700 italic">{current.title}</span>
            </>
          ) : null}
          <span className="ml-1.5 inline-flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="inline-block h-1 w-1 animate-bounce rounded-full bg-indigo-400"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </span>
        </p>

        {/* Completed items so far */}
        {results.length > 0 && (
          <ul className="space-y-1.5 border-t border-gray-100 pt-3">
            {results.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-xs">
                {r.ok ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                )}
                <span className={r.ok ? 'text-gray-700' : 'text-gray-400 line-through'}>
                  {r.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // ── Complete ─────────────────────────────────────────────────────────────────

  const succeeded = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-sm font-semibold text-gray-900">
            Done! Suggestions saved for {succeeded.length} product
            {succeeded.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="text-xs font-medium text-gray-400 hover:text-gray-600"
        >
          Dismiss
        </button>
      </div>

      {failed.length > 0 && (
        <p className="mb-3 text-xs text-red-500">
          {failed.length} product{failed.length !== 1 ? 's' : ''} failed — retry
          individually from each product page.
        </p>
      )}

      <ul className="space-y-2">
        {succeeded.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <span className="text-gray-700">{r.title}</span>
            </div>
            <Link
              href={`/products/${r.id}/history`}
              className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              View →
            </Link>
          </li>
        ))}
        {failed.map((r) => (
          <li key={r.id} className="flex items-center gap-2 text-xs">
            <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
            <span className="text-gray-400 line-through">{r.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
