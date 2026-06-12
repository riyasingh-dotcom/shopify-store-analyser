import Link from 'next/link';
import { ArrowLeft, Clock, Sparkles } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import MobileMenuButton from '@/components/MobileMenuButton';
import CopyButton from '@/components/CopyButton';

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

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : score >= 60
        ? 'bg-blue-50 text-blue-700 ring-blue-200'
        : score >= 40
          ? 'bg-yellow-50 text-yellow-700 ring-yellow-200'
          : 'bg-red-50 text-red-700 ring-red-200';

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${color}`}>
      {score}/100
    </span>
  );
}

function FieldRow({
  label,
  value,
  original,
}: {
  label: string;
  value: string;
  original?: string | null;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      {original && (
        <p className="rounded bg-gray-50 px-3 py-2 text-xs text-gray-500 line-through decoration-gray-300">
          {original}
        </p>
      )}
      <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
        <p className="text-sm text-gray-800">{value}</p>
        <div className="shrink-0">
          <CopyButton value={value} />
        </div>
      </div>
    </div>
  );
}

export default async function ProductHistoryPage({ params }: Props) {
  const { id } = await params;

  // DEBUG — log what we query and what exists in the table
  const allRows = await prisma.productSuggestion.findMany({
    select: { id: true, productId: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  console.log('[history] URL id param:', id);
  console.log('[history] Recent productSuggestion rows:', JSON.stringify(allRows));

  const suggestions = await prisma.productSuggestion.findMany({
    where: { productId: { endsWith: `/${id}` } },
    orderBy: { createdAt: 'desc' },
  });
  console.log('[history] Matched suggestions count:', suggestions.length);

  const productTitle = suggestions[0]?.productTitle ?? 'Product';

  return (
    <>
      {/* Sticky header */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-gray-200 bg-white/95 px-4 backdrop-blur-sm sm:px-6">
        <div className="flex items-center gap-2.5">
          <MobileMenuButton />
          <Link
            href={`/products/${id}`}
            className="flex items-center gap-1 text-xs font-medium text-gray-400 transition-colors hover:text-indigo-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Product
          </Link>
          <span className="text-gray-200">/</span>
          <h1 className="max-w-45 truncate text-sm font-semibold text-gray-900 sm:max-w-xs">
            {productTitle}
          </h1>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Clock className="h-3.5 w-3.5" />
          {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6">
        <div className="mx-auto max-w-2xl">
          {/* Page title */}
          <div className="mb-6 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
              <Sparkles className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">AI Suggestion History</h2>
              <p className="text-xs text-gray-400">
                All suggestions generated for this product, newest first
              </p>
            </div>
          </div>

          {/* Empty state */}
          {suggestions.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 px-6 py-12 text-center">
              <Sparkles className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">No suggestions yet</p>
              <p className="mt-1 text-xs text-gray-400">
                Generate AI suggestions on the product page and they will appear here.
              </p>
              <Link
                href={`/products/${id}`}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Go to Product
              </Link>
            </div>
          )}

          {/* Timeline */}
          {suggestions.length > 0 && (
            <ol className="relative space-y-6 border-l border-gray-200 pl-6">
              {suggestions.map((s) => (
                <li key={s.id} className="relative">
                  {/* Timeline dot */}
                  <span className="absolute -left-[25px] flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-indigo-100 ring-1 ring-indigo-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  </span>

                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    {/* Card header */}
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                      <time
                        dateTime={s.createdAt.toISOString()}
                        className="text-xs text-gray-500"
                      >
                        {formatDate(s.createdAt)}
                      </time>
                      <ScoreBadge score={s.auditScore} />
                    </div>

                    {/* Always-visible: improved title */}
                    <div className="px-4 py-4">
                      <FieldRow
                        label="Improved Title"
                        value={s.improvedTitle}
                        original={s.originalTitle !== s.improvedTitle ? s.originalTitle : null}
                      />
                    </div>

                    {/* Expand for full suggestion */}
                    <details className="group border-t border-gray-100">
                      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-xs font-medium text-indigo-600 hover:bg-indigo-50/50 [&::-webkit-details-marker]:hidden">
                        <svg
                          className="h-3.5 w-3.5 transition-transform group-open:rotate-90"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                        View Full Suggestion
                      </summary>

                      <div className="space-y-4 px-4 pb-4 pt-1">
                        <FieldRow
                          label="Improved SEO Title"
                          value={s.improvedSeoTitle}
                          original={
                            s.originalSeoTitle && s.originalSeoTitle !== s.improvedSeoTitle
                              ? s.originalSeoTitle
                              : null
                          }
                        />
                        <FieldRow
                          label="Improved SEO Description"
                          value={s.improvedSeoDescription}
                          original={
                            s.originalSeoDescription &&
                            s.originalSeoDescription !== s.improvedSeoDescription
                              ? s.originalSeoDescription
                              : null
                          }
                        />
                        <div>
                          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            Reasoning
                          </p>
                          <p className="rounded-lg bg-gray-50 px-3 py-2.5 text-xs italic leading-relaxed text-gray-600">
                            {s.reasoning}
                          </p>
                        </div>
                      </div>
                    </details>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </main>
    </>
  );
}
