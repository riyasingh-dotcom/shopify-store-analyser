import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Sparkles, TrendingUp, Calendar, Hash } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import CopyButton from '@/components/ui/CopyButton';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs work';
}

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 80
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : score >= 60
        ? 'bg-blue-50 text-blue-700 ring-blue-200'
        : score >= 40
          ? 'bg-amber-50 text-amber-700 ring-amber-200'
          : 'bg-red-50 text-red-700 ring-red-200';

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${cls}`}>
      {score}/100
    </span>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3.5 shadow-sm">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
        <p className="truncate text-sm font-bold text-gray-900">{value}</p>
        {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((t): t is string => typeof t === 'string');
  return [];
}

function TagsField({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
        Suggested Tags
      </p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function DiffField({
  label,
  before,
  after,
}: {
  label: string;
  before?: string | null;
  after: string;
}) {
  const changed = Boolean(before && before !== after);
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      <div className="overflow-hidden rounded-lg border border-gray-200">
        {changed && (
          <div className="flex items-start gap-2.5 border-b border-dashed border-gray-200 bg-gray-50 px-3 py-2.5">
            <span className="mt-0.5 shrink-0 text-sm font-bold leading-none text-gray-300">−</span>
            <p className="text-xs leading-relaxed text-gray-400 line-through decoration-gray-300">
              {before}
            </p>
          </div>
        )}
        <div
          className={`flex items-start justify-between gap-3 px-3 py-2.5 ${changed ? 'bg-emerald-50/50' : 'bg-white'}`}
        >
          <div className="flex min-w-0 items-start gap-2.5">
            {changed && (
              <span className="mt-0.5 shrink-0 text-sm font-bold leading-none text-emerald-500">+</span>
            )}
            <p className="text-xs leading-relaxed text-gray-800">{after}</p>
          </div>
          <div className="shrink-0">
            <CopyButton value={after} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function ProductHistoryPage({ params }: Props) {
  const { id } = await params;

  const suggestions = await prisma.productSuggestion.findMany({
    where: { productId: { endsWith: `/${id}` } },
    orderBy: { createdAt: 'desc' },
  });

  const productTitle = suggestions[0]?.productTitle ?? 'Product';
  const latestScore = suggestions[0]?.auditScore ?? 0;
  const latestDate = suggestions[0]?.createdAt;

  return (
    <>
      {/* Sticky header */}
      <header className="sticky top-16 z-20 flex h-14 items-center justify-between border-b border-gray-200 bg-white/95 px-4 backdrop-blur-sm sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <Link
            href={`/products/${id}`}
            className="flex items-center gap-1 text-xs font-medium text-gray-400 transition-colors hover:text-indigo-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Product
          </Link>
          <span className="text-gray-200">/</span>
          <h1 className="min-w-0 truncate text-sm font-semibold text-gray-900">
            {productTitle}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-xs text-gray-400">
          <Clock className="h-3.5 w-3.5" />
          {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Page heading */}
          <div>
            <h2 className="text-base font-semibold text-gray-900">AI Suggestion History</h2>
            <p className="mt-0.5 text-xs text-gray-400">
              All AI-generated optimizations for this product, newest first.
            </p>
          </div>

          {/* Stats row — only when there are suggestions */}
          {suggestions.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard
                icon={<Hash className="h-4 w-4 text-gray-400" />}
                label="Total Suggestions"
                value={String(suggestions.length)}
              />
              <StatCard
                icon={<TrendingUp className="h-4 w-4 text-indigo-400" />}
                label="Current Audit Score"
                value={`${latestScore} / 100`}
                sub={scoreLabel(latestScore)}
              />
              <StatCard
                icon={<Calendar className="h-4 w-4 text-gray-400" />}
                label="Latest Suggestion"
                value={latestDate ? formatDateShort(latestDate) : '—'}
              />
            </div>
          )}

          {/* Empty state */}
          {suggestions.length === 0 && (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-200 px-6 py-16 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50">
                <Sparkles className="h-6 w-6 text-indigo-400" />
              </div>
              <p className="text-sm font-semibold text-gray-700">No suggestions yet</p>
              <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-gray-400">
                Generate AI-powered suggestions on the product page. They&apos;ll appear here with
                full before &amp; after comparisons.
              </p>
              <Link
                href={`/products/${id}`}
                className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Go generate suggestions
              </Link>
            </div>
          )}

          {/* Suggestion accordion cards */}
          {suggestions.length > 0 && (
            <div className="space-y-3">
              {suggestions.map((s, i) => {
                const isLatest = i === 0;
                const versionNum = suggestions.length - i;
                return (
                  <details
                    key={s.id}
                    className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                    open={isLatest}
                  >
                    {/* Accordion trigger */}
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 transition-colors hover:bg-gray-50/70 [&::-webkit-details-marker]:hidden">
                      {/* Chevron */}
                      <svg
                        className="h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform group-open:rotate-90"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>

                      {/* Version number */}
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-gray-100 text-[10px] font-bold text-gray-500">
                        {versionNum}
                      </span>

                      {/* Timestamp + Latest badge */}
                      <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
                        <time
                          dateTime={s.createdAt.toISOString()}
                          className="truncate text-xs text-gray-500"
                        >
                          {formatDate(s.createdAt)}
                        </time>
                        {isLatest && (
                          <span className="shrink-0 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600 ring-1 ring-indigo-200">
                            Latest
                          </span>
                        )}
                      </div>

                      {/* Score: before → after (projected) */}
                      {s.expectedScore !== null && s.expectedScore !== undefined ? (
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className="text-[11px] tabular-nums text-gray-400">
                            {s.auditScore}/100
                          </span>
                          <span className="text-gray-300 text-xs">→</span>
                          <ScoreBadge score={s.expectedScore} />
                          {s.expectedScore > s.auditScore && (
                            <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 ring-1 ring-emerald-200">
                              +{s.expectedScore - s.auditScore}
                            </span>
                          )}
                        </div>
                      ) : (
                        <ScoreBadge score={s.auditScore} />
                      )}
                    </summary>

                    {/* Card body */}
                    <div className="space-y-4 border-t border-gray-100 px-5 pb-5 pt-4">
                      <DiffField
                        label="Product Title"
                        before={s.originalTitle}
                        after={s.improvedTitle}
                      />

                      <DiffField
                        label="SEO Title"
                        before={s.originalSeoTitle}
                        after={s.improvedSeoTitle}
                      />

                      <DiffField
                        label="SEO Description"
                        before={s.originalSeoDescription}
                        after={s.improvedSeoDescription}
                      />

                      <DiffField
                        label="Product Description"
                        before={s.originalDescription}
                        after={s.improvedDescription}
                      />

                      <TagsField tags={parseTags(s.suggestedTags)} />

                      {/* Reasoning */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                          AI Reasoning
                        </p>
                        <p className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs italic leading-relaxed text-gray-500">
                          {s.reasoning}
                        </p>
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
