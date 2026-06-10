'use client';

// Module-level cache — survives client-side route changes, resets on full page refresh.
// undefined = not yet fetched | null = fetched but no key / error | StoreAnalysis = success
import { useState, useEffect } from 'react';
import { analyseCurrentStore } from '@/app/actions/analyse';
import StoreScoreCard from './StoreScoreCard';
import InsightCard from './InsightCard';
import QuickWins from './QuickWins';
import InsightsSkeleton from './InsightsSkeleton';
import type { StoreAnalysis } from '@/types/analysis';

let analysisCache: StoreAnalysis | null | undefined = undefined;

// ── no-key / error banner ─────────────────────────────────────────────────────

function AnalysisMissingBanner() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 sm:items-center">
      <svg className="mt-0.5 h-4 w-4 shrink-0 text-gray-400 sm:mt-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
      </svg>
      <span>
        <strong>AI analysis unavailable</strong> — Add{' '}
        <code className="rounded bg-gray-200 px-1 font-mono text-xs">KEY</code> to .env.local to enable store insights.
      </span>
    </div>
  );
}

// ── insights renderer ─────────────────────────────────────────────────────────

function InsightsContent({ analysis }: { analysis: StoreAnalysis }) {
  const order = { high: 0, medium: 1, low: 2 } as const;
  const sorted = [...analysis.insights].sort((a, b) => {
    const ap = (order as Record<string, number>)[a.priority] ?? 1;
    const bp = (order as Record<string, number>)[b.priority] ?? 1;
    return ap - bp;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100">
          <svg className="h-4 w-4 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">AI-Powered Insights</h2>
          <p className="text-xs text-gray-500">Powered by Gemini · {sorted.length} insight{sorted.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <StoreScoreCard analysis={analysis} />
        </div>
        <div>
          <QuickWins items={analysis.quickWins} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.map((insight, i) => (
          <InsightCard key={i} insight={insight} />
        ))}
      </div>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function AIInsightsSection() {
  const [analysis, setAnalysis] = useState<StoreAnalysis | null | undefined>(analysisCache);
  const [loading, setLoading] = useState(analysisCache === undefined);

  useEffect(() => {
    // Cache hit — nothing to do, render immediately
    if (analysisCache !== undefined) return;

    analyseCurrentStore()
      .then((result) => {
        analysisCache = result;
        setAnalysis(result);
      })
      .catch(() => {
        analysisCache = null;
        setAnalysis(null);
      })
      .finally(() => setLoading(false));
  // storeData intentionally omitted — we only fetch once per browser session
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <InsightsSkeleton />;
  if (!analysis) return <AnalysisMissingBanner />;
  return <InsightsContent analysis={analysis} />;
}
