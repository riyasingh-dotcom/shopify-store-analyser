function Pulse({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    />
  );
}

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

export default function Loading() {
  return (
    <>
      <main className="flex-1 space-y-5 p-6 lg:px-8 lg:py-8">
        {/* Back link + heading */}
        <div>
          <Pulse className="mb-2 h-3.5 w-16" />
          <Pulse className="h-8 w-44" />
          <Pulse className="mt-1.5 h-4 w-56" />
        </div>

        {/* Score + summary card */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="h-1.5 w-full bg-gray-200" />
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start">
            {/* Score badge */}
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

        {/* Snapshot meta — 3 cols */}
        <section className="grid grid-cols-3 gap-3 sm:gap-4">
          {[200, 230, 260].map((d, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm text-center">
              <Pulse className="mx-auto h-5 w-14" delay={d} />
              <Pulse className="mx-auto mt-1.5 h-3 w-10" delay={d + 30} />
            </div>
          ))}
        </section>

        {/* Insights */}
        <section>
          <Pulse className="mb-3 h-4 w-16" delay={300} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[320, 380, 440, 500].map((d, i) => (
              <InsightCardSkeleton key={i} delay={d} />
            ))}
          </div>
        </section>

        {/* Quick wins */}
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
