'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import StoreScoreCard from './StoreScoreCard';
import InsightCard from './InsightCard';
import QuickWins from './QuickWins';
import InsightsSkeleton from '@/components/ui/InsightsSkeleton';
import type { StoreAnalysis, Insight } from '@/types/analysis';

// Survives client-side route changes; cleared when the user clicks Regenerate.
// undefined = not yet checked | null = no result / error | StoreAnalysis = loaded
let analysisCache: StoreAnalysis | null | undefined = undefined;
let cachedAt: string | undefined = undefined; // ISO timestamp of the cached analysis

interface PartialAnalysis {
  overallScore: number;
  summary: string;
  insights: Insight[];
  quickWins: string[];
}

function isValidAnalysis(v: unknown): v is StoreAnalysis {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.overallScore === 'number' &&
    obj.overallScore >= 1 &&
    obj.overallScore <= 10 &&
    typeof obj.summary === 'string' &&
    obj.summary.length > 0 &&
    Array.isArray(obj.insights) &&
    obj.insights.length > 0 &&
    Array.isArray(obj.quickWins) &&
    obj.quickWins.length > 0
  );
}

function isInsight(v: unknown): v is Insight {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.category === 'string' &&
    typeof o.title === 'string' &&
    typeof o.finding === 'string' &&
    typeof o.recommendation === 'string' &&
    (o.priority === 'high' || o.priority === 'medium' || o.priority === 'low')
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StreamingPlaceholder() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100">
          <svg
            className="h-4 w-4 text-violet-600 animate-pulse"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">AI-Powered Insights</p>
          <p className="text-xs text-gray-500">Powered by Groq · Analysing your store…</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-violet-100 bg-violet-50 p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 rounded-full bg-violet-400 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
          <p className="text-sm font-medium text-violet-700">Analysing your store…</p>
        </div>
      </div>

      <InsightsSkeleton />
    </div>
  );
}

function ErrorBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
      <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-400" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
          clipRule="evenodd"
        />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-red-800">Analysis failed</p>
        <p className="mt-0.5 text-xs text-red-600">
          Could not generate insights. Check your GROQ_API_KEY and try again.
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

function RegenerateButton({ onClick, ageLabel }: { onClick: () => void; ageLabel: string }) {
  return (
    <div className="flex items-center gap-2">
      {ageLabel && (
        <span className="text-xs text-gray-400">{ageLabel}</span>
      )}
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 active:scale-95"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16" />
          <path d="M8 16H3v5" />
        </svg>
        Regenerate Analysis
      </button>
    </div>
  );
}

function ProgressiveContent({
  partial,
  isStreaming,
  onRegenerate,
  ageLabel = '',
}: {
  partial: PartialAnalysis;
  isStreaming: boolean;
  onRegenerate: () => void;
  ageLabel?: string;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100">
            <svg
              className={`h-4 w-4 text-violet-600 ${isStreaming ? 'animate-pulse' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">AI-Powered Insights</h2>
            <p className="text-xs text-gray-500">
              Powered by Groq · {isStreaming ? 'Streaming…' : `${partial.insights.length} insights`}
            </p>
          </div>
        </div>
        {!isStreaming && (
          <RegenerateButton onClick={onRegenerate} ageLabel={ageLabel} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <StoreScoreCard analysis={{ ...partial, insights: partial.insights, quickWins: partial.quickWins }} />
        </div>
        <div>
          {partial.quickWins.length > 0
            ? <QuickWins items={partial.quickWins} />
            : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-violet-200 bg-violet-50 p-6">
                <p className="text-xs text-violet-400 animate-pulse">Quick wins arriving…</p>
              </div>
            )
          }
        </div>
      </div>

      {partial.insights.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {partial.insights.map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}
          {isStreaming && (
            <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InsightsContent({
  analysis,
  onRegenerate,
  ageLabel = '',
}: {
  analysis: StoreAnalysis;
  onRegenerate: () => void;
  ageLabel?: string;
}) {
  const priorityOrder = { high: 0, medium: 1, low: 2 } as const;
  const sorted = [...analysis.insights].sort((a, b) => {
    const ap = (priorityOrder as Record<string, number>)[a.priority] ?? 1;
    const bp = (priorityOrder as Record<string, number>)[b.priority] ?? 1;
    return ap - bp;
  });

  // Split sorted insights into complete 3-col rows and the remaining tail (0–2 items).
  // tailCards drives the orphan-spanning logic in the grid below.
  const rem = sorted.length % 3;
  const fullRows = rem === 0 ? sorted : sorted.slice(0, sorted.length - rem);
  const tailCards = rem === 0 ? [] : sorted.slice(sorted.length - rem);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100">
            <svg
              className="h-4 w-4 text-violet-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">AI-Powered Insights</h2>
            <p className="text-xs text-gray-500">
              Powered by Groq · {sorted.length} insight{sorted.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <RegenerateButton onClick={onRegenerate} ageLabel={ageLabel} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <StoreScoreCard analysis={analysis} />
        </div>
        <div>
          <QuickWins items={analysis.quickWins} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {fullRows.map((insight) => (
          <InsightCard key={`${insight.category}::${insight.title}`} insight={insight} />
        ))}

        {/* 1 orphan → span all 3 columns (full-width card) */}
        {tailCards.length === 1 && (
          <div className="sm:col-span-2 xl:col-span-3">
            <InsightCard insight={tailCards[0]} />
          </div>
        )}

        {/* 2 orphans → 2-col sub-grid spanning all 3 columns (evenly distributed) */}
        {tailCards.length === 2 && (
          <div className="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-2 xl:col-span-3">
            {tailCards.map((insight) => (
              <InsightCard key={`${insight.category}::${insight.title}`} insight={insight} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
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
    : new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

type Status = 'loading' | 'streaming' | 'done' | 'error';

export default function StreamingAnalysis() {
  const [status, setStatus] = useState<Status>(
    analysisCache !== undefined ? 'done' : 'loading',
  );
  const [analysis, setAnalysis] = useState<StoreAnalysis | null>(
    analysisCache ?? null,
  );
  const [partial, setPartial] = useState<PartialAnalysis | null>(null);
  const [lastAnalysedAt, setLastAnalysedAt] = useState<string | null>(
    cachedAt ?? null,
  );
  // Updated every minute so ageLabel re-derives with current Date.now()
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (!lastAnalysedAt) return;
    const t = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(t);
  }, [lastAnalysedAt]);
  const ageLabel = getAgeLabel(lastAnalysedAt, nowMs);

  const startAnalysis = useCallback(async () => {
    setStatus('streaming');
    setAnalysis(null);
    setPartial(null);

    try {
      const response = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });

      if (!response.ok || !response.body) {
        analysisCache = null;
        setStatus('error');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let lineBuffer = '';
      let current: PartialAnalysis = { overallScore: 0, summary: '', insights: [], quickWins: [] };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const text = decoder.decode(value, { stream: true });

        lineBuffer += text;

        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const obj = JSON.parse(trimmed) as Record<string, unknown>;

            if ('overallScore' in obj) {
              current = { ...current, overallScore: Number(obj.overallScore), summary: String(obj.summary ?? '') };
            } else if ('insight' in obj && isInsight(obj.insight)) {
              current = { ...current, insights: [...current.insights, obj.insight] };
            } else if ('quickWins' in obj) {
              const wins = obj.quickWins;
              if (Array.isArray(wins) && wins.every((w): w is string => typeof w === 'string')) {
                current = { ...current, quickWins: wins };
              }
            } else {
              console.warn('[Stream] unrecognised line shape:', obj);
            }

            setPartial({ ...current });
          } catch {
            console.warn('[Stream] malformed line (skipped):', trimmed);
          }
        }
      }

      // Flush trailing bytes not followed by a newline
      lineBuffer += decoder.decode();
      const trailing = lineBuffer.trim();
      if (trailing) {
        try {
          const obj = JSON.parse(trailing) as Record<string, unknown>;
          if ('quickWins' in obj) {
            const wins = obj.quickWins;
            if (Array.isArray(wins) && wins.every((w): w is string => typeof w === 'string')) {
              current = { ...current, quickWins: wins };
            }
            setPartial({ ...current });
          }
        } catch {
          console.warn('[Stream] trailing flush parse failed:', trailing);
        }
      }

      const result: StoreAnalysis = {
        overallScore: Math.min(10, Math.max(1, Math.round(current.overallScore))),
        summary: current.summary,
        insights: current.insights,
        quickWins: current.quickWins,
      };

      if (!isValidAnalysis(result)) {
        console.error('[Stream] validation failed — incomplete response:', result);
        analysisCache = null;
        setStatus('error');
        return;
      }

      analysisCache = result;
      cachedAt = new Date().toISOString();
      setLastAnalysedAt(cachedAt);
      setAnalysis(result);
      setStatus('done');
    } catch (err) {
      console.error('[StreamingAnalysis] Stream read failed:', err);
      analysisCache = null;
      setStatus('error');
    }
  }, []);

  // On first load: fetch the latest saved analysis from DB before calling Groq.
  // The module-level cache ensures this only runs once per browser session.
  const initAnalysis = useCallback(async () => {
    try {
      const res = await fetch('/api/analyse/latest');
      if (res.ok) {
        const json = await res.json() as {
          analysis: StoreAnalysis | null;
          meta?: { createdAt: string };
        };
        if (json.analysis && isValidAnalysis(json.analysis)) {
          analysisCache = json.analysis;
          cachedAt = json.meta?.createdAt;
          setAnalysis(json.analysis);
          setLastAnalysedAt(json.meta?.createdAt ?? null);
          setStatus('done');
          return;
        }
      }
    } catch (err) {
      console.warn('[Analysis] DB check failed, falling back to streaming:', err);
    }
    await startAnalysis();
  }, [startAnalysis]);

  const regenerate = useCallback(() => {
    analysisCache = undefined;
    cachedAt = undefined;
    setLastAnalysedAt(null);
    startAnalysis();
  }, [startAnalysis]);

  useEffect(() => {
    if (analysisCache !== undefined) return; // cache hit — skip DB check
    startTransition(initAnalysis);
  }, [initAnalysis]);

  if (status === 'streaming' && partial?.overallScore) {
    return <ProgressiveContent partial={partial} isStreaming={true} onRegenerate={regenerate} ageLabel={ageLabel} />;
  }
  if (status === 'loading' || status === 'streaming') {
    return <StreamingPlaceholder />;
  }
  if (status === 'error' || !analysis) {
    return <ErrorBanner onRetry={regenerate} />;
  }
  // Use partial to avoid a flash of reorder when streaming completes
  if (partial) {
    return <ProgressiveContent partial={partial} isStreaming={false} onRegenerate={regenerate} ageLabel={ageLabel} />;
  }
  return <InsightsContent analysis={analysis} onRegenerate={regenerate} ageLabel={ageLabel} />;
}
