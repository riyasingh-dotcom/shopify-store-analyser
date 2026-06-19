function Pulse({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    />
  );
}

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
        {/* toolbar */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Pulse className="h-5 w-5 rounded-full" delay={300} />
            <Pulse className="h-4 w-36" delay={300} />
          </div>
          <Pulse className="h-8 w-32 rounded-lg" delay={300} />
        </div>
        {/* score + summary */}
        <div className="flex items-start gap-4">
          <Pulse className="h-16 w-16 shrink-0 rounded-2xl" delay={350} />
          <div className="flex-1 space-y-2">
            <Pulse className="h-4 w-3/4" delay={375} />
            <Pulse className="h-3 w-full" delay={400} />
            <Pulse className="h-3 w-5/6" delay={425} />
          </div>
        </div>
        {/* insight chips */}
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

export default function Loading() {
  return (
    <main className="flex-1 space-y-6 p-4 sm:p-6 lg:px-8">
      {/* Heading */}
      <div className="space-y-1.5">
        <Pulse className="h-7 w-24" />
        <Pulse className="h-4 w-40" />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        {[0, 80, 160, 240].map((delay, i) => (
          <KpiCardSkeleton key={i} delay={delay} />
        ))}
      </div>

      {/* Analysis */}
      <AnalysisSkeleton />
    </main>
  );
}
