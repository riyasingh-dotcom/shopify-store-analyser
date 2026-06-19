import { notFound } from 'next/navigation';
import Image from 'next/image';
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { getStoreDataCached } from '@/lib/shopify/cached';
import { auditProduct, computeChecksHash } from '@/lib/analysis/products/productAudit';
import { prisma } from '@/lib/prisma';
import type { ProductAuditCheck, AuditGrade } from '@/lib/analysis/products/productAudit';
import { extractNumericId } from '@/lib/shopify/utils';
import type { ProductStatus } from '@/types/shopify';
import AuditBreakdown from '@/components/products/AuditBreakdown';
import ProductSuggestions from '@/components/products/ProductSuggestions';

export const dynamic = 'force-dynamic';

// ── Score ring ─────────────────────────────────────────────────────────────────

const RING_R = 32;
const RING_CIRC = 2 * Math.PI * RING_R; // 201.062…

const GRADE_STROKE: Record<AuditGrade, string> = {
  A: '#10b981',
  B: '#3b82f6',
  C: '#eab308',
  D: '#f97316',
  F: '#ef4444',
};


function ScoreRing({ score, grade }: { score: number; grade: AuditGrade }) {
  const offset = RING_CIRC * (1 - score / 100);
  return (
    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
      <svg
        viewBox="0 0 80 80"
        className="absolute inset-0 -rotate-90"
        style={{ transformOrigin: '40px 40px' }}
        aria-hidden="true"
      >
        <circle cx="40" cy="40" r={RING_R} fill="none" stroke="#f3f4f6" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={RING_R}
          fill="none"
          stroke={GRADE_STROKE[grade]}
          strokeWidth="8"
          strokeDasharray={RING_CIRC}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="relative text-center">
        <span className="block text-xl font-bold leading-none tabular-nums text-gray-900">{score}</span>
        <span className="block text-[10px] font-medium leading-none text-gray-400 mt-0.5">/100</span>
      </div>
    </div>
  );
}

// ── Status pill ────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<ProductStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  DRAFT: 'bg-gray-100 text-gray-600 ring-gray-200',
  ARCHIVED: 'bg-red-50 text-red-600 ring-red-200',
};

function StatusPill({ status }: { status: ProductStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${STATUS_STYLE[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ── Top Issues card ────────────────────────────────────────────────────────────

type Severity = 'critical' | 'warning' | 'minor';

function getSeverity(maxScore: number): Severity {
  if (maxScore >= 7) return 'critical';
  if (maxScore >= 4) return 'warning';
  return 'minor';
}

const SEVERITY_ICON_CLASS: Record<Severity, string> = {
  critical: 'text-red-500',
  warning: 'text-amber-500',
  minor: 'text-gray-400',
};

const SEVERITY_LABEL_CLASS: Record<Severity, string> = {
  critical: 'bg-red-50 text-red-600 ring-red-100',
  warning: 'bg-amber-50 text-amber-600 ring-amber-100',
  minor: 'bg-gray-50 text-gray-500 ring-gray-100',
};

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  warning: 'Warning',
  minor: 'Minor',
};

function IssueIcon({ severity }: { severity: Severity }) {
  const cls = `h-4 w-4 shrink-0 mt-0.5 ${SEVERITY_ICON_CLASS[severity]}`;
  if (severity === 'critical') return <AlertCircle className={cls} />;
  if (severity === 'warning') return <AlertTriangle className={cls} />;
  return <Info className={cls} />;
}

function TopIssuesCard({ checks }: { checks: ProductAuditCheck[] }) {
  const failed = [...checks]
    .filter((c) => !c.passed)
    .sort((a, b) => b.maxScore - a.maxScore);

  if (failed.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
        <p className="text-sm font-medium text-emerald-800">
          All {checks.length} audit checks passed — great work!
        </p>
      </div>
    );
  }

  const critCount = failed.filter((c) => getSeverity(c.maxScore) === 'critical').length;
  const warnCount = failed.filter((c) => getSeverity(c.maxScore) === 'warning').length;
  const shown = failed.slice(0, 6);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
        <h3 className="text-sm font-semibold text-gray-900">Top Issues</h3>
        <div className="flex items-center gap-2.5 text-xs">
          {critCount > 0 && (
            <span className="flex items-center gap-1 font-medium text-red-600">
              <AlertCircle className="h-3 w-3" />
              {critCount} critical
            </span>
          )}
          {warnCount > 0 && (
            <span className="flex items-center gap-1 font-medium text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              {warnCount} warning
            </span>
          )}
        </div>
      </div>

      {/* Issue rows */}
      <ul className="divide-y divide-gray-50">
        {shown.map((check) => {
          const sev = getSeverity(check.maxScore);
          return (
            <li key={check.id} className="flex items-start gap-3 px-5 py-3.5">
              <IssueIcon severity={sev} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-800">{check.label}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ring-1 ${SEVERITY_LABEL_CLASS[sev]}`}
                    >
                      {SEVERITY_LABEL[sev]}
                    </span>
                    <span className="text-[11px] font-medium tabular-nums text-gray-400">
                      −{check.maxScore} pts
                    </span>
                  </div>
                </div>
                {check.suggestion && (
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{check.suggestion}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {failed.length > 6 && (
        <div className="border-t border-gray-50 px-5 py-2.5">
          <p className="text-xs text-gray-400">
            +{failed.length - 6} more issues — see full breakdown →
          </p>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const { products } = await getStoreDataCached();

  const product = products.find((p) => extractNumericId(p.id) === id);
  if (!product) notFound();

  const audit = auditProduct(product);
  const checksHash = computeChecksHash(audit.checks);

  // Find-or-create: only write a new ProductAuditLog row when the audit result
  // has actually changed. Two results are considered identical when their
  // checksHash matches — same pass/fail on every check means same issues,
  // same score, same grade. On a repeat page view with no product edits this
  // read returns a match and the write is skipped entirely.
  let auditLogId: string | null = null;
  try {
    const latest = await prisma.productAuditLog.findFirst({
      where: { productId: product.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, checksHash: true },
    });

    if (latest !== null && latest.checksHash === checksHash) {
      // Audit unchanged — reuse the existing record.
      auditLogId = latest.id;
    } else {
      // First visit, or audit composition changed — write a new record.
      const newLog = await prisma.productAuditLog.create({
        data: {
          productId: product.id,
          productTitle: product.title,
          totalScore: audit.totalScore,
          grade: audit.grade,
          checksJson: audit.checks,
          checksHash,
          storeDomain: process.env.SHOPIFY_STORE_DOMAIN ?? 'unknown',
        },
      });
      auditLogId = newLog.id;
    }
  } catch (err) {
    console.error('[ProductDetailPage] Failed to save audit log:', err);
  }

  const latestSuggestionRow = await prisma.productSuggestion
    .findFirst({
      where: { productId: { endsWith: `/${id}` } },
      orderBy: { createdAt: 'desc' },
      select: {
        improvedTitle: true,
        improvedDescription: true,
        improvedDescriptionHtml: true,
        improvedSeoTitle: true,
        improvedSeoDescription: true,
        suggestedTags: true,
        reasoning: true,
        expectedScore: true,
      },
    })
    .catch(() => null);

  const savedSuggestion = latestSuggestionRow
    ? {
        improvedTitle: latestSuggestionRow.improvedTitle,
        improvedDescription: latestSuggestionRow.improvedDescription,
        improvedDescriptionHtml:
          latestSuggestionRow.improvedDescriptionHtml ??
          `<p>${latestSuggestionRow.improvedDescription}</p>`,
        improvedSeoTitle: latestSuggestionRow.improvedSeoTitle,
        improvedSeoDescription: latestSuggestionRow.improvedSeoDescription,
        suggestedTags: Array.isArray(latestSuggestionRow.suggestedTags)
          ? (latestSuggestionRow.suggestedTags as string[])
          : [],
        reasoning: latestSuggestionRow.reasoning,
      }
    : null;

  const savedExpectedScore = latestSuggestionRow?.expectedScore ?? null;

  const featuredImage = product.images[0];
  const minP = product.priceRangeV2.minVariantPrice;
  const maxP = product.priceRangeV2.maxVariantPrice;
  const fmt = (a: string, c: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(parseFloat(a));
  const priceDisplay =
    minP.amount === maxP.amount
      ? fmt(minP.amount, minP.currencyCode)
      : `${fmt(minP.amount, minP.currencyCode)} – ${fmt(maxP.amount, maxP.currencyCode)}`;

  const failedCount = audit.checks.filter((c) => !c.passed).length;
  const metaLine = [product.vendor, product.productType].filter(Boolean).join(' · ');

  return (
    <>
      <main className="flex-1 p-4 sm:p-6 lg:px-8">

        {/* ── Hero band ─────────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:gap-6">

          {/* Product summary */}
          <div className="flex min-w-0 flex-1 items-start gap-4">
            {/* Thumbnail */}
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
              {featuredImage?.url ? (
                <Image
                  src={featuredImage.url}
                  alt={featuredImage.altText ?? product.title}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xl font-bold text-gray-300">
                  {product.title.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Meta */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-base font-bold text-gray-900">{product.title}</p>
                <StatusPill status={product.status} />
              </div>
              {metaLine && (
                <p className="mt-0.5 truncate text-sm text-gray-500">{metaLine}</p>
              )}
              <p className="mt-1 text-sm font-semibold text-gray-700">{priceDisplay}</p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px w-full bg-gray-100 sm:h-16 sm:w-px sm:shrink-0" />

          {/* Score */}
          <div className="flex shrink-0 items-center gap-4">
            <ScoreRing score={audit.totalScore} grade={audit.grade} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Audit Score
              </p>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold leading-none text-gray-900">{audit.grade}</span>
                <span className="text-sm text-gray-400">grade</span>
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                {failedCount === 0
                  ? 'All checks passed'
                  : `${failedCount} failing check${failedCount !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
        </div>

        {/* ── Main grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Left: issues + AI (2 of 3 cols) */}
          <div className="space-y-6 lg:col-span-2">
            <TopIssuesCard checks={audit.checks} />
            <ProductSuggestions
              product={product}
              auditResult={audit}
              savedSuggestion={savedSuggestion}
              savedExpectedScore={savedExpectedScore}
              auditLogId={auditLogId}
            />
          </div>

          {/* Right: audit breakdown */}
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Audit Breakdown
            </h2>
            <AuditBreakdown result={audit} />
          </div>
        </div>
      </main>
    </>
  );
}
