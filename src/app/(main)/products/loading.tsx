function Pulse({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    />
  );
}

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

export default function Loading() {
  return (
    <main className="flex-1 p-6 lg:px-8 lg:py-8">
      {/* Heading */}
      <div className="mb-6 space-y-1.5">
        <Pulse className="h-8 w-28" />
        <Pulse className="h-4 w-52" />
      </div>

      {/* Products table card */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Card header: title + summary pills */}
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

        {/* Table header */}
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

        {/* Rows */}
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRowSkeleton key={i} delay={i * 35} />
          ))}
        </div>

        {/* Pagination */}
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
