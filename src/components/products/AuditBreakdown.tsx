import type { ProductAuditResult, AuditCategory, ProductAuditCheck } from '@/lib/analysis/products/productAudit';

const CATEGORY_META: Record<AuditCategory, { label: string }> = {
  title:       { label: 'Title'       },
  description: { label: 'Description' },
  seo:         { label: 'SEO'         },
  media:       { label: 'Media'       },
  metadata:    { label: 'Metadata'    },
};

const CATEGORIES: AuditCategory[] = ['title', 'description', 'seo', 'media', 'metadata'];

// ── icons ──────────────────────────────────────────────────────────────────────

function PassIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-emerald-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function FailIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-red-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// ── check row ──────────────────────────────────────────────────────────────────

function CheckRow({ check }: { check: ProductAuditCheck }) {
  return (
    <li className="py-2.5">
      <div className="flex items-start gap-2.5">
        {check.passed ? <PassIcon /> : <FailIcon />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-xs font-medium ${check.passed ? 'text-gray-700' : 'text-gray-500'}`}
            >
              {check.label}
            </span>
            <span
              className={`shrink-0 text-xs font-semibold tabular-nums ${
                check.passed ? 'text-emerald-600' : 'text-red-400'
              }`}
            >
              {check.score}/{check.maxScore}
            </span>
          </div>
          {!check.passed && check.suggestion && (
            <p className="mt-0.5 text-[11px] leading-relaxed text-gray-400">{check.suggestion}</p>
          )}
        </div>
      </div>
    </li>
  );
}

// ── main component ─────────────────────────────────────────────────────────────

interface AuditBreakdownProps {
  result: ProductAuditResult;
}

export default function AuditBreakdown({ result }: AuditBreakdownProps) {
  const scorePercent = result.totalScore;

  const progressColor =
    scorePercent >= 90
      ? 'bg-emerald-500'
      : scorePercent >= 75
        ? 'bg-blue-500'
        : scorePercent >= 60
          ? 'bg-yellow-400'
          : scorePercent >= 45
            ? 'bg-orange-400'
            : 'bg-red-400';

  return (
    <div className="space-y-3">
      {/* Overall progress bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-800">Overall Score</span>
          <span className="text-sm font-bold tabular-nums text-gray-900">
            {result.totalScore}<span className="text-xs font-normal text-gray-400">/100</span>
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-2 rounded-full transition-all ${progressColor}`}
            style={{ width: `${scorePercent}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const { score, maxScore } = result.categoryScores[cat];
            return (
              <span
                key={cat}
                className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-500"
              >
                {CATEGORY_META[cat].label}
                <span className="font-semibold text-gray-700">{score}/{maxScore}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Per-category collapsible breakdowns */}
      {CATEGORIES.map((cat) => {
        const catChecks = result.checks.filter((c) => c.category === cat);
        const { score, maxScore } = result.categoryScores[cat];
        const allPassed = catChecks.every((c) => c.passed);

        return (
          <details key={cat} open={cat === 'title' || cat === 'description'} className="group rounded-xl border border-gray-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 hover:bg-gray-50/60">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    allPassed ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span className="text-sm font-semibold text-gray-800">
                  {CATEGORY_META[cat].label}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium tabular-nums text-gray-500">
                  {score}/{maxScore} pts
                </span>
                <ChevronIcon />
              </div>
            </summary>
            <ul className="divide-y divide-gray-50 border-t border-gray-100 px-4">
              {catChecks.map((c) => (
                <CheckRow key={c.id} check={c} />
              ))}
            </ul>
          </details>
        );
      })}
    </div>
  );
}
