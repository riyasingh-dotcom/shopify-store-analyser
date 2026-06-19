'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { FlatOrder } from '@/lib/analysis/orders/orders';
import type {
  CategoryStatus,
  AnalysisCategory,
  OrdersAnalysisResult,
  OrdersAnalysisHistoryItem,
} from '@/types/ordersAnalysis';

// ---------------------------------------------------------------------------
// Module-level cache — survives client-side navigations; cleared on Generate New
// undefined = not yet initialised | null = checked, no result | result = loaded
// ---------------------------------------------------------------------------

let analysisCache: OrdersAnalysisResult | null | undefined = undefined;
let cachedGeneratedAt: string | undefined = undefined;

// ---------------------------------------------------------------------------
// Resilient parser — normalises before validating so minor LLM deviations
// (capitalised status, numeric strings, markdown fences) don't cause failures
// ---------------------------------------------------------------------------

function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1].trim() : trimmed;
}

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v);
  return NaN;
}

function normaliseCategoryStatus(v: unknown, score?: number): CategoryStatus {
  if (typeof v === 'string') {
    const lower = v.toLowerCase().trim();
    if (lower === 'good' || lower === 'strong' || lower === 'adequate') return 'good';
    if (lower === 'warning' || lower === 'needs work' || lower === 'needs_work') return 'warning';
    if (lower === 'critical') return 'critical';
  }
  if (typeof score === 'number') {
    if (score <= 3) return 'critical';
    if (score <= 6) return 'warning';
    return 'good';
  }
  return 'warning';
}

function coerceToString(v: unknown): string | null {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return null;
}

function parseOrdersAnalysis(accumulated: string): OrdersAnalysisResult | null {
  let raw: unknown;
  try {
    raw = JSON.parse(extractJson(accumulated));
  } catch {
    console.error('[OrdersAnalysis] JSON.parse failed, first 500 chars:', accumulated.slice(0, 500));
    return null;
  }

  if (typeof raw !== 'object' || raw === null) {
    console.error('[OrdersAnalysis] parsed value is not an object:', typeof raw);
    return null;
  }
  const o = raw as Record<string, unknown>;

  const overallHealthScore = Math.round(toNumber(o.overallHealthScore));
  if (isNaN(overallHealthScore) || overallHealthScore < 1 || overallHealthScore > 10) {
    console.error('[OrdersAnalysis] overallHealthScore out of range:', o.overallHealthScore);
    return null;
  }

  if (!Array.isArray(o.categories) || o.categories.length === 0) {
    console.error('[OrdersAnalysis] categories missing or empty:', o.categories);
    return null;
  }

  const categories: AnalysisCategory[] = [];
  for (const c of o.categories) {
    if (typeof c !== 'object' || c === null) {
      console.error('[OrdersAnalysis] category is not an object:', c);
      return null;
    }
    const cat = c as Record<string, unknown>;

    const score = Math.round(toNumber(cat.score));
    const status = normaliseCategoryStatus(cat.status, score);
    const metric = coerceToString(cat.metric);

    if (
      isNaN(score) ||
      typeof cat.name !== 'string' ||
      typeof cat.finding !== 'string' ||
      typeof cat.recommendation !== 'string' ||
      metric === null
    ) {
      console.error('[OrdersAnalysis] category field invalid:', {
        name: cat.name,
        status,
        score,
        finding: typeof cat.finding,
        recommendation: typeof cat.recommendation,
        metric: cat.metric,
      });
      return null;
    }

    categories.push({
      name: cat.name as AnalysisCategory['name'],
      score,
      status,
      finding: cat.finding,
      recommendation: cat.recommendation,
      metric,
    });
  }

  if (typeof o.topPriority !== 'string' || o.topPriority.length === 0) {
    console.error('[OrdersAnalysis] topPriority missing or empty:', o.topPriority);
    return null;
  }

  const positives = Array.isArray(o.positives)
    ? o.positives.filter((p): p is string => typeof p === 'string')
    : [];
  if (positives.length === 0) {
    console.error('[OrdersAnalysis] positives empty or missing:', o.positives);
    return null;
  }

  return { overallHealthScore, categories, topPriority: o.topPriority, positives };
}

// ---------------------------------------------------------------------------
// Age label helper — shows relative time like "5m ago", "2h ago", or a date
// ---------------------------------------------------------------------------

function getAgeLabel(ts: string | null, nowMs: number): string {
  if (!ts) return '';
  const diff = nowMs - new Date(ts).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24
    ? `${hrs}h ago`
    : new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Score colour helpers
// ---------------------------------------------------------------------------

function scoreColors(score: number): { text: string; badge: string; bar: string } {
  if (score <= 3)
    return { text: 'text-red-600', badge: 'bg-red-50 text-red-700 ring-red-200', bar: 'bg-red-500' };
  if (score <= 5)
    return { text: 'text-amber-600', badge: 'bg-amber-50 text-amber-700 ring-amber-200', bar: 'bg-amber-500' };
  if (score <= 7)
    return { text: 'text-blue-600', badge: 'bg-blue-50 text-blue-700 ring-blue-200', bar: 'bg-blue-500' };
  return { text: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', bar: 'bg-emerald-500' };
}

function scoreLabel(score: number): string {
  if (score <= 3) return 'Critical';
  if (score <= 5) return 'Needs Work';
  if (score <= 7) return 'Adequate';
  return 'Strong';
}

const statusStyles: Record<CategoryStatus, { badge: string; border: string; dot: string }> = {
  good:     { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  warning:  { badge: 'bg-amber-50 text-amber-700 ring-amber-200',       border: 'border-amber-200',   dot: 'bg-amber-500'   },
  critical: { badge: 'bg-red-50 text-red-700 ring-red-200',             border: 'border-red-200',     dot: 'bg-red-500'     },
};

// ---------------------------------------------------------------------------
// Status type
// ---------------------------------------------------------------------------

type Status = 'idle' | 'loading' | 'complete' | 'error';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function IdleState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100">
        <svg className="h-6 w-6 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="M7 16l4-4 4 4 5-5" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">Orders Intelligence</p>
        <p className="mt-1 text-xs text-gray-500">
          Run an AI-powered deep-dive on your order data to get specific, actionable insights.
        </p>
      </div>
      <button
        onClick={onGenerate}
        className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-violet-700 active:scale-95"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
        </svg>
        Generate Analysis
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-violet-100 bg-violet-50 px-10 py-12 text-center">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2.5 w-2.5 rounded-full bg-violet-400 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
      <p className="text-sm font-medium text-violet-700">Groq is analysing your orders…</p>
      <p className="text-xs text-violet-500">This usually takes 5–10 seconds.</p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
      <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-red-800">Analysis failed</p>
        <p className="mt-0.5 text-xs text-red-600">
          Could not generate your orders analysis. Check your GROQ_API_KEY and try again.
        </p>
      </div>
      <button
        onClick={onRetry}
        className="shrink-0 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-200"
      >
        Retry
      </button>
    </div>
  );
}

function CategoryCard({ category }: { category: AnalysisCategory }) {
  const styles = statusStyles[category.status];
  const colors = scoreColors(category.score);

  return (
    <div className={`flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md ${styles.border}`}>
      <div className="flex items-center justify-between gap-3 p-5 pb-3">
        <h3 className="text-sm font-semibold text-gray-900">{category.name}</h3>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${styles.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
            {category.status.charAt(0).toUpperCase() + category.status.slice(1)}
          </span>
          <span className={`text-sm font-bold tabular-nums ${colors.text}`}>{category.score}/10</span>
        </div>
      </div>

      <div className="flex flex-col flex-1 gap-3 px-5 pb-5">
        <p className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-800">
          {category.metric}
        </p>

        <div className="rounded-lg bg-gray-50 p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Finding</p>
          <p className="text-sm leading-relaxed text-gray-700">{category.finding}</p>
        </div>

        <div className="rounded-lg bg-indigo-50 p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-400">Action</p>
          <p className="text-sm leading-relaxed text-indigo-900">{category.recommendation}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// History dropdown
// ---------------------------------------------------------------------------

function HistoryDropdown({
  history,
  selectedId,
  onSelect,
  isOpen,
  onToggle,
}: {
  history: OrdersAnalysisHistoryItem[];
  selectedId: string | null;
  onSelect: (item: OrdersAnalysisHistoryItem) => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onToggle();
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen, onToggle]);

  if (history.length === 0) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 active:scale-95"
      >
        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        History
        <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-gray-500">
          {history.length}
        </span>
        <svg
          className={`h-3 w-3 shrink-0 text-gray-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-30 mt-1.5 w-60 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Recent Analyses</p>
          </div>
          <ul className="max-h-72 divide-y divide-gray-100 overflow-y-auto">
            {history.map((item) => {
              const d = new Date(item.generatedAt);
              const datePart = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
              const timePart = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
              const isSelected = item.id === selectedId;
              const colors = scoreColors(item.overallHealthScore);
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onSelect(item)}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 ${isSelected ? 'bg-violet-50' : ''}`}
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className={`truncate text-xs font-medium ${isSelected ? 'text-violet-700' : 'text-gray-700'}`}>
                        {datePart}
                      </span>
                      <span className="text-[11px] text-gray-400">{timePart}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />}
                      <span className={`tabular-nums text-xs font-bold ${colors.text}`}>
                        {item.overallHealthScore}
                        <span className="font-normal text-gray-300">/10</span>
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AnalysisResult
// ---------------------------------------------------------------------------

function AnalysisResult({
  result,
  ageLabel,
  onGenerate,
  history,
  selectedHistoryId,
  isHistoryOpen,
  onToggleHistory,
  onHistorySelect,
  expandTrigger,
}: {
  result: OrdersAnalysisResult;
  ageLabel: string;
  onGenerate: () => void;
  history: OrdersAnalysisHistoryItem[];
  selectedHistoryId: string | null;
  isHistoryOpen: boolean;
  onToggleHistory: () => void;
  onHistorySelect: (item: OrdersAnalysisHistoryItem) => void;
  expandTrigger: number;
}) {
  const overallColors = scoreColors(result.overallHealthScore);
  const label = scoreLabel(result.overallHealthScore);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (expandTrigger > 0) setIsExpanded(true);
  }, [expandTrigger]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100">
            <svg className="h-4 w-4 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Orders Intelligence</h2>
            <p className="text-xs text-gray-500">
              Powered by Groq{ageLabel ? ` · Generated ${ageLabel}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <HistoryDropdown
            history={history}
            selectedId={selectedHistoryId}
            onSelect={onHistorySelect}
            isOpen={isHistoryOpen}
            onToggle={onToggleHistory}
          />
          <button
            onClick={onGenerate}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 active:scale-95"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
            Generate New Analysis
          </button>
        </div>
      </div>

      {/* Card: score + priority + positives always visible; BI cards expandable */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className={`h-1 w-full ${overallColors.bar}`} />

        {/* Always-visible: score row */}
        <div className="flex items-center gap-3 px-5 pt-5 sm:gap-4">
          <div className="flex shrink-0 items-baseline gap-0.5">
            <span className={`text-3xl font-bold tabular-nums leading-none ${overallColors.text}`}>
              {result.overallHealthScore}
            </span>
            <span className="text-sm font-normal text-gray-300">/10</span>
          </div>
          <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${overallColors.badge}`}>
            {label}
          </span>
          <span className="text-xs text-gray-400">Overall Health</span>
        </div>

        {/* Always-visible: Top Priority + What's Going Well */}
        <div className="space-y-4 px-5 pt-4 pb-0">
          <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 shrink-0 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <p className="text-xs font-semibold text-amber-800">Top Priority This Week</p>
            </div>
            <p className="text-sm leading-relaxed text-amber-900">{result.topPriority}</p>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold text-emerald-800">What&apos;s Going Well</p>
            <ul className="flex flex-col gap-1.5">
              {result.positives.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-emerald-900">
                  <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Expand / collapse toggle — sits at the bottom of the always-visible area */}
        <button
          onClick={() => setIsExpanded((v) => !v)}
          aria-expanded={isExpanded}
          className="mt-4 flex w-full items-center justify-center gap-1.5 border-t border-gray-100 px-5 py-3 text-xs font-medium text-gray-400 transition-colors hover:bg-gray-50/70 hover:text-gray-600"
        >
          <span>{isExpanded ? 'Hide detailed insights' : 'Show detailed insights'}</span>
          <svg
            className={`h-3.5 w-3.5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {/* Collapsible body: Business Intelligence category cards */}
        <div
          className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
        >
          <div className="overflow-hidden">
            <div className="space-y-4 px-5 pb-5 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Business Intelligence</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {result.categories.map((category) => (
                  <CategoryCard key={category.name} category={category} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type InitialAnalysisData = {
  analysis: OrdersAnalysisResult;
  generatedAt: string;
} | null;

export default function OrdersAnalysis({
  orders,
  storeDomain,
  initialAnalysis,
  history,
}: {
  orders: FlatOrder[];
  storeDomain: string;
  initialAnalysis: InitialAnalysisData;
  history: OrdersAnalysisHistoryItem[];
}) {
  // Read from module-level cache OR fall back to server-fetched initial data.
  // Never write to module-level vars during render — that happens in effects/callbacks.
  const [status, setStatus] = useState<Status>(() => {
    if (analysisCache != null) return 'complete';
    if (initialAnalysis !== null) return 'complete';
    return 'idle';
  });
  const [result, setResult] = useState<OrdersAnalysisResult | null>(() => {
    if (analysisCache != null) return analysisCache;
    if (initialAnalysis !== null) return initialAnalysis.analysis;
    return null;
  });
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(() => {
    if (cachedGeneratedAt) return cachedGeneratedAt;
    if (initialAnalysis) return initialAnalysis.generatedAt;
    return null;
  });
  const [nowMs, setNowMs] = useState(() => Date.now());

  // History state
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(() => {
    const hasCurrentAnalysis = analysisCache != null || initialAnalysis !== null;
    if (!hasCurrentAnalysis && history.length > 0) return history[0].id;
    return null;
  });
  const [isSwitching, setIsSwitching] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [expandTrigger, setExpandTrigger] = useState(0);
  const switchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear pending switch timer on unmount.
  useEffect(() => {
    return () => {
      if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
    };
  }, []);

  // Sync module-level cache from server-fetched data on first mount (once only).
  useEffect(() => {
    if (analysisCache === undefined) {
      analysisCache = initialAnalysis?.analysis ?? null;
      cachedGeneratedAt = initialAnalysis?.generatedAt;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick every minute so the "X ago" label stays fresh.
  useEffect(() => {
    if (!lastGeneratedAt) return;
    const t = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(t);
  }, [lastGeneratedAt]);

  // Derive what to actually display based on history selection vs. fresh result
  const selectedItem = selectedHistoryId
    ? history.find((h) => h.id === selectedHistoryId) ?? null
    : null;
  const displayResult = selectedItem?.analysis ?? result;
  const displayGeneratedAt = selectedItem?.generatedAt ?? lastGeneratedAt;
  const ageLabel = getAgeLabel(displayGeneratedAt, nowMs);

  const runAnalysis = useCallback(async () => {
    setStatus('loading');
    setResult(null);

    try {
      const response = await fetch('/api/orders/analyse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ storeDomain, orders }),
      });

      if (!response.ok || !response.body) {
        const errText = response.body
          ? await response.text().catch(() => '(unreadable)')
          : '(no body)';
        console.error(
          `[OrdersAnalysis] HTTP ${response.status} from /api/orders/analyse:`,
          errText.slice(0, 300),
        );
        analysisCache = null;
        setStatus('error');
        return;
      }

      // Read SSE stream: accumulate all `data:` values until `[DONE]`
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';
      let receivedDone = false;

      while (!receivedDone) {
        const { done: readerDone, value } = await reader.read();
        if (readerDone) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') {
            receivedDone = true;
            break;
          }
          accumulated += data;
        }
      }

      console.debug(
        '[OrdersAnalysis] accumulated SSE content (%d chars):',
        accumulated.length,
        accumulated.slice(0, 1000),
      );
      const parsed = parseOrdersAnalysis(accumulated);
      if (!parsed) {
        analysisCache = null;
        setStatus('error');
        return;
      }

      const generatedAt = new Date().toISOString();
      analysisCache = parsed;
      cachedGeneratedAt = generatedAt;
      setResult(parsed);
      setLastGeneratedAt(generatedAt);
      setNowMs(Date.now());
      setStatus('complete');
    } catch (err) {
      console.error('[OrdersAnalysis] Request failed:', err);
      analysisCache = null;
      setStatus('error');
    }
  }, [storeDomain, orders]);

  const handleHistorySelect = useCallback((item: OrdersAnalysisHistoryItem) => {
    if (item.id === selectedHistoryId) {
      setIsHistoryOpen(false);
      return;
    }
    setIsSwitching(true);
    setSelectedHistoryId(item.id);
    setIsHistoryOpen(false);
    if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
    switchTimerRef.current = setTimeout(() => setIsSwitching(false), 150);
  }, [selectedHistoryId]);

  const handleGenerate = useCallback(() => {
    setSelectedHistoryId(null);
    analysisCache = undefined;
    cachedGeneratedAt = undefined;
    setExpandTrigger((n) => n + 1);
    void runAnalysis();
  }, [runAnalysis]);

  const handleToggleHistory = useCallback(() => {
    setIsHistoryOpen((v) => !v);
  }, []);

  // Determine what to show in the content area
  const isLoading = isSwitching || status === 'loading';
  const showError = !isSwitching && status === 'error' && selectedHistoryId === null;
  const showIdle = !isLoading && !showError && !displayResult;

  function renderContent() {
    if (isLoading) return <LoadingState />;
    if (showError) return <ErrorState onRetry={() => void runAnalysis()} />;
    if (showIdle) return <IdleState onGenerate={() => void runAnalysis()} />;
    if (!displayResult) return <LoadingState />;
    return (
      <AnalysisResult
        result={displayResult}
        ageLabel={ageLabel}
        onGenerate={handleGenerate}
        history={history}
        selectedHistoryId={selectedHistoryId}
        isHistoryOpen={isHistoryOpen}
        onToggleHistory={handleToggleHistory}
        onHistorySelect={handleHistorySelect}
        expandTrigger={expandTrigger}
      />
    );
  }

  return <div className="min-w-0">{renderContent()}</div>;
}
