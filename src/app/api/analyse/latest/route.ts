import { prisma } from '@/lib/prisma';
import type { Insight } from '@/types/analysis';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const row = await prisma.storeAnalysis.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        overallScore: true,
        summary: true,
        rawInsights: true,
        quickWins: true,
        createdAt: true,
        storeDomain: true,
      },
    });

    if (!row) return Response.json({ analysis: null });

    const insights = Array.isArray(row.rawInsights)
      ? (row.rawInsights as unknown as Insight[])
      : [];
    const quickWins = Array.isArray(row.quickWins)
      ? (row.quickWins as unknown as string[])
      : [];

    return Response.json({
      analysis: {
        overallScore: row.overallScore,
        summary: row.summary,
        insights,
        quickWins,
      },
      meta: {
        id: row.id,
        storeDomain: row.storeDomain,
        createdAt: row.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error('[GET /api/analyse/latest] failed:', err);
    return Response.json({ analysis: null });
  }
}
