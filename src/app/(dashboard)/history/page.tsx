import { prisma } from '@/lib/prisma';
import HistoryClient from '@/components/history/HistoryClient';
import type { AnalysisCardData, StatsData } from '@/components/history/HistoryClient';
import type { Insight } from '@/types/analysis';

export const dynamic = 'force-dynamic';

// ── Row types returned from DB ────────────────────────────────────────────

interface SnapshotRow {
  productCount: number;
  orderCount: number;
  totalRevenue: number;
  rawData: unknown;
}

interface AnalysisRow {
  id: string;
  storeDomain: string;
  overallScore: number;
  summary: string;
  rawInsights: unknown;
  createdAt: Date;
  snapshot: SnapshotRow | null;
}

// ── Data fetch ────────────────────────────────────────────────────────────

async function getAnalyses(): Promise<AnalysisRow[]> {
  try {
    const rows = await prisma.storeAnalysis.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        storeDomain: true,
        overallScore: true,
        summary: true,
        rawInsights: true,
        createdAt: true,
        snapshot: {
          select: {
            productCount: true,
            orderCount: true,
            totalRevenue: true,
            rawData: true,
          },
        },
      },
    });
    return rows as AnalysisRow[];
  } catch (err) {
    console.error('[/history] DB query failed:', err);
    return [];
  }
}

// ── Data transforms ───────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function buildCards(rows: AnalysisRow[]): AnalysisCardData[] {
  return rows.map((a, i) => {
    const prev = rows[i + 1] ?? null; // rows are newest-first; prev is the older entry

    // Extract top highlights from rawInsights, sorted high→medium→low
    const rawInsights = Array.isArray(a.rawInsights)
      ? (a.rawInsights as unknown as Insight[])
      : [];
    const sortedInsights = [...rawInsights].sort(
      (x, y) => (PRIORITY_ORDER[x.priority] ?? 3) - (PRIORITY_ORDER[y.priority] ?? 3),
    );
    const highlights = sortedInsights.slice(0, 5).map((ins) => ({
      title: ins.title,
      category: ins.category as string,
      priority: ins.priority as string,
    }));

    // Currency stored in snapshot.rawData.currency
    const rawData = a.snapshot?.rawData as Record<string, unknown> | undefined;
    const currency = (rawData?.currency as string) ?? 'USD';

    // Delta: current minus previous (null when there is no previous entry)
    const delta: AnalysisCardData['delta'] =
      prev != null
        ? {
            score: a.overallScore - prev.overallScore,
            revenue:
              a.snapshot != null && prev.snapshot != null
                ? Math.round((a.snapshot.totalRevenue - prev.snapshot.totalRevenue) * 100) / 100
                : null,
            orders:
              a.snapshot != null && prev.snapshot != null
                ? a.snapshot.orderCount - prev.snapshot.orderCount
                : null,
            products:
              a.snapshot != null && prev.snapshot != null
                ? a.snapshot.productCount - prev.snapshot.productCount
                : null,
          }
        : null;

    return {
      id: a.id,
      storeDomain: a.storeDomain,
      overallScore: a.overallScore,
      summary: a.summary,
      createdAt: a.createdAt.toISOString(),
      highlights,
      snapshot: a.snapshot
        ? {
            productCount: a.snapshot.productCount,
            orderCount: a.snapshot.orderCount,
            totalRevenue: a.snapshot.totalRevenue,
            currency,
          }
        : null,
      delta,
    };
  });
}

function buildStats(rows: AnalysisRow[]): StatsData {
  if (rows.length === 0) {
    return { total: 0, avgScore: 0, highestScore: 0, latestDate: null };
  }
  const scores = rows.map((r) => r.overallScore);
  const avg = scores.reduce((sum, v) => sum + v, 0) / scores.length;
  return {
    total: rows.length,
    avgScore: Math.round(avg * 10) / 10,
    highestScore: Math.max(...scores),
    latestDate: rows[0].createdAt.toISOString(), // rows[0] is the newest
  };
}

// ── Page ──────────────────────────────────────────────────────────────────

export default async function HistoryPage() {
  const rows = await getAnalyses();
  const stats = buildStats(rows);
  const cards = buildCards(rows);

  return (
    <>
      <div className="px-6 pt-8 pb-0 lg:px-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Analysis History</h1>
        <p className="mt-1 text-sm text-gray-500">
          {rows.length > 0 ? `${rows.length} saved analyses` : 'No analyses yet'}
        </p>
      </div>

      <HistoryClient stats={stats} cards={cards} />

      <footer className="border-t border-gray-200 bg-white px-4 py-3 text-xs text-gray-400 sm:px-6 lg:px-8">
        Shopify Store Analyser · Showing up to 20 most recent analyses
      </footer>
    </>
  );
}
