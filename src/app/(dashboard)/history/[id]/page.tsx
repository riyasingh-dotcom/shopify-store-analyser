import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import InsightCard from '@/components/dashboard/InsightCard';
import QuickWins from '@/components/dashboard/QuickWins';
import type { Insight } from '@/types/analysis';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreLabel(score: number) {
  if (score >= 8) return { text: 'Strong',     ring: 'ring-emerald-200', bg: 'bg-emerald-50', fg: 'text-emerald-700', accent: 'bg-emerald-400' };
  if (score >= 6) return { text: 'Adequate',   ring: 'ring-blue-200',    bg: 'bg-blue-50',    fg: 'text-blue-700',    accent: 'bg-blue-400' };
  if (score >= 4) return { text: 'Needs Work', ring: 'ring-amber-200',   bg: 'bg-amber-50',   fg: 'text-amber-700',   accent: 'bg-amber-400' };
  return            { text: 'Critical',         ring: 'ring-red-200',     bg: 'bg-red-50',     fg: 'text-red-700',     accent: 'bg-red-400' };
}

// ---------------------------------------------------------------------------
// Data fetch
// ---------------------------------------------------------------------------

async function getAnalysis(id: string) {
  try {
    return await prisma.storeAnalysis.findUnique({
      where: { id },
      include: { snapshot: true },
    });
  } catch (err) {
    console.error('[/history/[id]] DB query failed:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function HistoryDetailPage({ params }: PageProps) {
  const { id } = await params;
  const analysis = await getAnalysis(id);

  if (!analysis) notFound();

  const insights = analysis.rawInsights as unknown as Insight[];
  const quickWins = analysis.quickWins as unknown as string[];
  const { snapshot } = analysis;
  const rawData = snapshot?.rawData as unknown as Record<string, unknown> | undefined;
  const currency = (rawData?.currency as string | undefined) ?? 'USD';

  const { text, ring, bg, fg, accent } = scoreLabel(analysis.overallScore);
  const formattedDate = analysis.createdAt.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formattedTime = analysis.createdAt.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      <main className="flex-1 space-y-5 p-6 lg:px-8 lg:py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              href="/history"
              className="mb-1.5 inline-flex items-center gap-1 text-xs font-medium text-gray-400 transition-colors hover:text-gray-700"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 19l-7-7 7-7" />
              </svg>
              History
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Analysis Detail</h1>
            <p className="mt-0.5 text-sm text-gray-500">{analysis.storeDomain} · {formattedDate}</p>
          </div>
        </div>
        {/* Score + summary */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className={`h-1.5 w-full ${accent}`} />
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start">
            <div className={`flex shrink-0 flex-col items-center justify-center rounded-2xl px-5 py-4 ring-2 ${ring} ${bg}`}>
              <span className={`text-4xl font-bold leading-none ${fg}`}>{analysis.overallScore}</span>
              <span className={`mt-1 text-xs font-semibold uppercase tracking-widest ${fg}`}>{text}</span>
              <span className="mt-0.5 text-[10px] text-gray-400">out of 10</span>
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-sm font-semibold text-gray-800">{analysis.storeDomain}</span>
                <time className="text-xs text-gray-400">{formattedDate}, {formattedTime}</time>
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-gray-600">{analysis.summary}</p>
            </div>
          </div>
        </section>

        {/* Snapshot metadata */}
        {snapshot && (
          <section className="grid grid-cols-3 gap-3 sm:gap-4">
            <MetaCard label="Products" value={snapshot.productCount.toString()} />
            <MetaCard label="Orders"   value={snapshot.orderCount.toString()} />
            <MetaCard
              label="Revenue"
              value={new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(snapshot.totalRevenue)}
            />
          </section>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Insights</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {insights.map((insight) => (
                <InsightCard key={insight.title} insight={insight} />
              ))}
            </div>
          </section>
        )}

        {/* Quick wins */}
        {quickWins.length > 0 && <QuickWins items={quickWins} />}
      </main>

      <footer className="border-t border-gray-200 bg-white px-6 py-3 text-xs text-gray-400 lg:px-8">
        Shopify Store Analyser · Analysis saved {formattedDate}
      </footer>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm text-center">
      <p className="text-base font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

