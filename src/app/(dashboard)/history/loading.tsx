function Pulse({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    />
  );
}

function StatCardSkeleton({ delay }: { delay: number }) {
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
      {/* Score badge */}
      <div className="flex shrink-0 flex-col items-center justify-center rounded-lg bg-gray-100 px-3 py-2 min-w-13">
        <Pulse className="h-5 w-7" delay={delay} />
        <Pulse className="mt-0.5 h-2 w-9" delay={delay} />
      </div>
      {/* Content */}
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

export default function Loading() {
  return (
    <>
      {/* Page heading — matches page.tsx structure */}
      <div className="px-6 pt-8 pb-0 lg:px-8">
        <Pulse className="h-8 w-44" />
        <Pulse className="mt-2 h-4 w-32" />
      </div>

      <div className="flex-1 p-6 lg:px-8 lg:pb-8">
        {/* Stats row */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 70, 140, 210].map((d, i) => (
            <StatCardSkeleton key={i} delay={d} />
          ))}
        </div>

        {/* Controls row */}
        <div className="mb-4 flex items-center justify-between">
          <Pulse className="h-4 w-32" delay={280} />
          <Pulse className="h-8 w-16 rounded-lg" delay={280} />
        </div>

        {/* List cards */}
        <ul className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i}>
              <ListCardSkeleton delay={i * 40} />
            </li>
          ))}
        </ul>

        {/* Pagination */}
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
