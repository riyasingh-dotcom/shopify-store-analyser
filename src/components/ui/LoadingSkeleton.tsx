type PulseProps = { className: string; delay?: number };

function Pulse({ className, delay = 0 }: PulseProps) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    />
  );
}

// ─── Dashboard variant ────────────────────────────────────────────────────────

function KpiCardSkeleton({ delay }: { delay: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="h-0.5 w-full bg-gray-200" />
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2.5">
            <Pulse className="h-3.5 w-20" delay={delay} />
            <Pulse className="h-8 w-16" delay={delay} />
          </div>
          <Pulse className="h-11 w-11 rounded-xl" delay={delay} />
        </div>
        <Pulse className="mt-4 h-3 w-28" delay={delay + 60} />
      </div>
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="h-1 w-full bg-gray-200" />
      <div className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Pulse className="h-5 w-5 rounded-full" delay={300} />
            <Pulse className="h-4 w-36" delay={300} />
          </div>
          <Pulse className="h-8 w-32 rounded-lg" delay={300} />
        </div>
        <div className="flex items-start gap-4">
          <Pulse className="h-16 w-16 shrink-0 rounded-2xl" delay={350} />
          <div className="flex-1 space-y-2">
            <Pulse className="h-4 w-3/4" delay={375} />
            <Pulse className="h-3 w-full" delay={400} />
            <Pulse className="h-3 w-5/6" delay={425} />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[450, 500, 550].map((d, i) => (
            <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2">
              <Pulse className="h-3.5 w-24" delay={d} />
              <Pulse className="h-3 w-full" delay={d + 30} />
              <Pulse className="h-3 w-4/5" delay={d + 60} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <main className="flex-1 space-y-6 p-4 sm:p-6 lg:px-8">
      <div className="space-y-1.5">
        <Pulse className="h-7 w-24" />
        <Pulse className="h-4 w-40" />
      </div>
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {[0, 80, 160, 240].map((delay, i) => (
          <KpiCardSkeleton key={i} delay={delay} />
        ))}
      </div>
      <AnalysisSkeleton />
    </main>
  );
}

// ─── Products variant ─────────────────────────────────────────────────────────

function TableRowSkeleton({ delay }: { delay: number }) {
  return (
    <div className="flex items-center gap-4 px-6 py-4">
      <Pulse className="hidden h-12 w-12 shrink-0 rounded-lg sm:block" delay={delay} />
      <Pulse className="h-4 w-32 sm:w-44" delay={delay} />
      <Pulse className="h-5 w-14 rounded-full" delay={delay + 20} />
      <Pulse className="hidden h-4 w-20 sm:block" delay={delay + 40} />
      <Pulse className="hidden h-4 w-16 sm:block" delay={delay + 40} />
      <Pulse className="hidden h-4 w-20 sm:block" delay={delay + 40} />
      <div className="ml-auto flex items-center gap-3">
        <Pulse className="hidden h-4 w-16 sm:block" delay={delay + 60} />
        <Pulse className="h-7 w-12 rounded-lg" delay={delay + 60} />
      </div>
    </div>
  );
}

function ProductsSkeleton() {
  return (
    <main className="flex-1 p-6 lg:px-8 lg:py-8">
      <div className="mb-6 space-y-1.5">
        <Pulse className="h-8 w-28" />
        <Pulse className="h-4 w-52" />
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-5">
          <div className="space-y-1.5">
            <Pulse className="h-4 w-20" />
            <Pulse className="h-3 w-44" />
          </div>
          <div className="flex flex-wrap gap-2">
            {[0, 50, 100, 150, 200].map((d, i) => (
              <Pulse key={i} className="h-6 w-14 rounded-lg" delay={d} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4 border-b border-gray-100 bg-gray-50/70 px-6 py-3">
          <Pulse className="hidden h-3 w-10 sm:block" />
          <Pulse className="h-3 w-16" />
          <Pulse className="h-3 w-12" />
          <Pulse className="hidden h-3 w-14 sm:block" />
          <Pulse className="hidden h-3 w-12 sm:block" />
          <Pulse className="hidden h-3 w-12 sm:block" />
          <Pulse className="hidden h-3 w-16 sm:block" />
          <Pulse className="h-3 w-10" />
          <Pulse className="h-3 w-8" />
        </div>
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRowSkeleton key={i} delay={i * 35} />
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
          <Pulse className="h-3 w-40" delay={350} />
          <div className="flex items-center gap-2">
            <Pulse className="hidden h-1.5 w-20 rounded-full sm:block" delay={350} />
            <Pulse className="mx-2 h-3 w-10" delay={350} />
            <Pulse className="h-7 w-16 rounded-lg" delay={375} />
            <Pulse className="h-7 w-16 rounded-lg" delay={400} />
          </div>
        </div>
      </div>
    </main>
  );
}

// ─── Orders variant ───────────────────────────────────────────────────────────

function MetricCardSkeleton({ delay }: { delay: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="h-0.5 w-full bg-gray-200" />
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Pulse className="h-3 w-20" delay={delay} />
            <Pulse className="h-7 w-24" delay={delay} />
          </div>
          <Pulse className="h-9 w-9 rounded-xl" delay={delay} />
        </div>
        <Pulse className="mt-3 h-3 w-28" delay={delay + 50} />
      </div>
    </div>
  );
}

function SectionLabelSkeleton({ delay }: { delay: number }) {
  return <Pulse className="mb-4 h-3 w-24" delay={delay} />;
}

function OrdersSkeleton() {
  return (
    <main className="flex-1 space-y-10 p-6 lg:px-8 lg:py-8">
      <div className="space-y-1.5">
        <Pulse className="h-8 w-48" />
        <Pulse className="h-4 w-44" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[0, 70, 140, 210].map((d, i) => (
          <MetricCardSkeleton key={i} delay={d} />
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="h-1 w-full bg-gray-200" />
        <div className="px-5 pt-5 pb-4 space-y-4">
          <div className="flex items-center gap-3">
            <Pulse className="h-10 w-10 shrink-0 rounded-lg" delay={280} />
            <Pulse className="h-6 w-16 rounded-full" delay={280} />
            <Pulse className="h-4 w-28" delay={280} />
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-2">
            <Pulse className="h-3 w-28" delay={320} />
            <Pulse className="h-4 w-3/4" delay={340} />
            <Pulse className="h-3 w-full" delay={360} />
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-2">
            <Pulse className="h-3 w-32" delay={380} />
            <Pulse className="h-3 w-full" delay={400} />
            <Pulse className="h-3 w-5/6" delay={420} />
          </div>
        </div>
        <div className="flex justify-center border-t border-gray-100 py-3">
          <Pulse className="h-3 w-32" delay={440} />
        </div>
      </div>
      <section>
        <SectionLabelSkeleton delay={460} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[480, 510].map((d, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-4">
                <Pulse className="h-4 w-32" delay={d} />
              </div>
              <div className="flex items-center justify-center p-6">
                <Pulse className="h-32 w-32 rounded-full" delay={d + 30} />
              </div>
              <div className="space-y-2 px-5 pb-5">
                {[0, 1, 2].map((j) => (
                  <div key={j} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Pulse className="h-2.5 w-2.5 rounded-full" delay={d + 60 + j * 20} />
                      <Pulse className="h-3 w-20" delay={d + 60 + j * 20} />
                    </div>
                    <Pulse className="h-3 w-8" delay={d + 60 + j * 20} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <SectionLabelSkeleton delay={560} />
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <Pulse className="h-4 w-28" delay={580} />
          </div>
          <div className="p-5">
            <Pulse className="h-55 w-full rounded-lg" delay={600} />
          </div>
        </div>
      </section>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <Pulse className="h-4 w-32" delay={640} />
        </div>
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <Pulse className="h-5 w-5 rounded shrink-0" delay={660 + i * 30} />
              <Pulse className="h-4 flex-1" delay={660 + i * 30} />
              <Pulse className="hidden h-4 w-20 sm:block" delay={680 + i * 30} />
              <Pulse className="h-4 w-16" delay={680 + i * 30} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

// ─── History list variant ─────────────────────────────────────────────────────

function HistoryStatCardSkeleton({ delay }: { delay: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2">
          <Pulse className="h-3 w-20" delay={delay} />
          <Pulse className="h-7 w-16" delay={delay} />
          <Pulse className="h-3 w-24" delay={delay + 40} />
        </div>
        <Pulse className="h-7 w-7 shrink-0 rounded-md" delay={delay} />
      </div>
    </div>
  );
}

function ListCardSkeleton({ delay }: { delay: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex shrink-0 flex-col items-center justify-center rounded-lg bg-gray-100 px-3 py-2 min-w-13">
        <Pulse className="h-5 w-7" delay={delay} />
        <Pulse className="mt-0.5 h-2 w-9" delay={delay} />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <Pulse className="h-3.5 w-36" delay={delay} />
          <Pulse className="ml-auto h-3 w-28" delay={delay} />
        </div>
        <Pulse className="h-3 w-full max-w-sm" delay={delay + 30} />
        <div className="flex gap-1.5 pt-0.5">
          {[0, 1, 2].map((j) => (
            <Pulse key={j} className="h-4 w-16 rounded-full" delay={delay + 50 + j * 20} />
          ))}
        </div>
      </div>
      <Pulse className="h-4 w-4 shrink-0 rounded" delay={delay} />
    </div>
  );
}

function HistorySkeleton() {
  return (
    <>
      <div className="px-6 pt-8 pb-0 lg:px-8">
        <Pulse className="h-8 w-44" />
        <Pulse className="mt-2 h-4 w-32" />
      </div>
      <div className="flex-1 p-6 lg:px-8 lg:pb-8">
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 70, 140, 210].map((d, i) => (
            <HistoryStatCardSkeleton key={i} delay={d} />
          ))}
        </div>
        <div className="mb-4 flex items-center justify-between">
          <Pulse className="h-4 w-32" delay={280} />
          <Pulse className="h-8 w-16 rounded-lg" delay={280} />
        </div>
        <ul className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i}>
              <ListCardSkeleton delay={i * 40} />
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between">
          <Pulse className="h-3 w-20" delay={360} />
          <div className="flex items-center gap-2">
            <Pulse className="hidden h-1.5 w-12 rounded-full sm:block" delay={360} />
            <Pulse className="mx-2 h-3 w-8" delay={360} />
            <Pulse className="h-7 w-16 rounded-lg" delay={380} />
            <Pulse className="h-7 w-16 rounded-lg" delay={400} />
          </div>
        </div>
      </div>
    </>
  );
}

// ─── History detail variant ───────────────────────────────────────────────────

function InsightCardSkeleton({ delay }: { delay: number }) {
  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <Pulse className="h-5 w-20 rounded-full" delay={delay} />
        <Pulse className="h-5 w-14 rounded-full" delay={delay} />
      </div>
      <Pulse className="h-4 w-3/4" delay={delay + 30} />
      <Pulse className="h-3 w-full" delay={delay + 50} />
      <Pulse className="h-3 w-5/6" delay={delay + 70} />
      <div className="border-t border-gray-100 pt-3 space-y-1.5">
        <Pulse className="h-3 w-28" delay={delay + 90} />
        <Pulse className="h-3 w-full" delay={delay + 110} />
        <Pulse className="h-3 w-4/5" delay={delay + 130} />
      </div>
    </div>
  );
}

function HistoryDetailSkeleton() {
  return (
    <>
      <main className="flex-1 space-y-5 p-6 lg:px-8 lg:py-8">
        <div>
          <Pulse className="mb-2 h-3.5 w-16" />
          <Pulse className="h-8 w-44" />
          <Pulse className="mt-1.5 h-4 w-56" />
        </div>
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="h-1.5 w-full bg-gray-200" />
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start">
            <Pulse className="h-24 w-24 shrink-0 rounded-2xl" delay={80} />
            <div className="flex-1 space-y-2.5">
              <div className="flex flex-wrap items-center gap-3">
                <Pulse className="h-4 w-36" delay={100} />
                <Pulse className="h-3 w-32" delay={100} />
              </div>
              <Pulse className="h-3 w-full" delay={130} />
              <Pulse className="h-3 w-11/12" delay={155} />
              <Pulse className="h-3 w-4/5" delay={180} />
            </div>
          </div>
        </section>
        <section className="grid grid-cols-3 gap-3 sm:gap-4">
          {[200, 230, 260].map((d, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm text-center">
              <Pulse className="mx-auto h-5 w-14" delay={d} />
              <Pulse className="mx-auto mt-1.5 h-3 w-10" delay={d + 30} />
            </div>
          ))}
        </section>
        <section>
          <Pulse className="mb-3 h-4 w-16" delay={300} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[320, 380, 440, 500].map((d, i) => (
              <InsightCardSkeleton key={i} delay={d} />
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <Pulse className="mb-3 h-4 w-24" delay={560} />
          <div className="space-y-3">
            {[580, 610, 640].map((d, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <Pulse className="mt-0.5 h-4 w-4 shrink-0 rounded-full" delay={d} />
                <Pulse className="h-3 flex-1" delay={d + 20} />
              </div>
            ))}
          </div>
        </section>
      </main>
      <div className="border-t border-gray-200 bg-white px-6 py-3 lg:px-8">
        <Pulse className="h-3 w-56" delay={660} />
      </div>
    </>
  );
}

// ─── Generic fallback ─────────────────────────────────────────────────────────

function GenericSkeleton({ rows, showHeader }: { rows: number; showHeader: boolean }) {
  return (
    <div className="space-y-3 p-6">
      {showHeader && <Pulse className="mb-2 h-6 w-48" />}
      {Array.from({ length: rows }).map((_, i) => (
        <Pulse key={i} className="h-4 w-full" delay={i * 50} />
      ))}
    </div>
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type LoadingSkeletonVariant =
  | 'dashboard'
  | 'products'
  | 'orders'
  | 'history'
  | 'history-detail';

type LoadingSkeletonProps = {
  variant?: LoadingSkeletonVariant;
  rows?: number;
  showHeader?: boolean;
};

export default function LoadingSkeleton({
  variant,
  rows = 3,
  showHeader = false,
}: LoadingSkeletonProps) {
  if (variant === 'dashboard') return <DashboardSkeleton />;
  if (variant === 'products') return <ProductsSkeleton />;
  if (variant === 'orders') return <OrdersSkeleton />;
  if (variant === 'history') return <HistorySkeleton />;
  if (variant === 'history-detail') return <HistoryDetailSkeleton />;
  return <GenericSkeleton rows={rows} showHeader={showHeader} />;
}
