import { prisma } from '@/lib/prisma';
import type {
  OrdersAnalysisResult,
  OrdersAnalysisSnapshot,
  OrdersAnalysisHistoryItem,
  CategoryStatus,
} from '@/types/ordersAnalysis';

// Raw Groq output can use synonyms for status — normalise to the canonical enum.
// Mirrors normaliseCategoryStatus in OrdersAnalysis.tsx.
function normaliseStatus(status: unknown, score: number): CategoryStatus {
  if (typeof status === 'string') {
    const s = status.toLowerCase().trim();
    if (s === 'good' || s === 'strong' || s === 'adequate') return 'good';
    if (s === 'warning' || s === 'needs work' || s === 'needs_work') return 'warning';
    if (s === 'critical') return 'critical';
  }
  return score <= 3 ? 'critical' : score <= 6 ? 'warning' : 'good';
}

export async function persistOrdersAnalysis(
  storeDomain: string,
  analysis: Record<string, unknown>,
  metricsSnapshot: OrdersAnalysisSnapshot,
): Promise<void> {
  await prisma.ordersAnalysis.create({
    data: {
      storeDomain,
      analysisJson: JSON.parse(JSON.stringify(analysis)),
      metricsSnapshot: JSON.parse(JSON.stringify(metricsSnapshot)),
    },
  });
}

export type LatestOrdersAnalysis = {
  id: string;
  analysis: OrdersAnalysisResult;
  metricsSnapshot: OrdersAnalysisSnapshot | null;
  generatedAt: string;
};

export async function getOrdersAnalysisHistory(limit = 10): Promise<OrdersAnalysisHistoryItem[]> {
  const rows = await prisma.ordersAnalysis.findMany({
    orderBy: { generatedAt: 'desc' },
    take: limit,
    select: { id: true, generatedAt: true, analysisJson: true },
  });

  return rows.map((row) => {
    const raw = row.analysisJson as unknown as OrdersAnalysisResult;
    const analysis: OrdersAnalysisResult = {
      ...raw,
      categories: Array.isArray(raw.categories)
        ? raw.categories.map((cat) => ({
            ...cat,
            status: normaliseStatus(cat.status, cat.score),
          }))
        : [],
    };
    return {
      id: row.id,
      generatedAt: row.generatedAt.toISOString(),
      overallHealthScore: typeof raw.overallHealthScore === 'number' ? raw.overallHealthScore : 0,
      analysis,
    };
  });
}

export async function getLatestOrdersAnalysis(): Promise<LatestOrdersAnalysis | null> {
  const row = await prisma.ordersAnalysis.findFirst({
    orderBy: { generatedAt: 'desc' },
    select: { id: true, analysisJson: true, metricsSnapshot: true, generatedAt: true },
  });

  if (!row) return null;

  const raw = row.analysisJson as unknown as OrdersAnalysisResult;

  // Normalise each category's status in case the stored Groq output used synonyms.
  const analysis: OrdersAnalysisResult = {
    ...raw,
    categories: raw.categories.map((cat) => ({
      ...cat,
      status: normaliseStatus(cat.status, cat.score),
    })),
  };

  return {
    id: row.id,
    analysis,
    metricsSnapshot:
      row.metricsSnapshot !== null
        ? (row.metricsSnapshot as unknown as OrdersAnalysisSnapshot)
        : null,
    generatedAt: row.generatedAt.toISOString(),
  };
}
