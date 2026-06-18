function Pulse({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    />
  );
}

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

export default function Loading() {
  return (
    <main className="flex-1 space-y-10 p-6 lg:px-8 lg:py-8">
      {/* Heading */}
      <div className="space-y-1.5">
        <Pulse className="h-8 w-48" />
        <Pulse className="h-4 w-44" />
      </div>

      {/* KPI metrics row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[0, 70, 140, 210].map((d, i) => (
          <MetricCardSkeleton key={i} delay={d} />
        ))}
      </div>

      {/* AI Analysis accordion card */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="h-1 w-full bg-gray-200" />
        <div className="px-5 pt-5 pb-4 space-y-4">
          {/* Score row */}
          <div className="flex items-center gap-3">
            <Pulse className="h-10 w-10 shrink-0 rounded-lg" delay={280} />
            <Pulse className="h-6 w-16 rounded-full" delay={280} />
            <Pulse className="h-4 w-28" delay={280} />
          </div>
          {/* Top priority box */}
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-2">
            <Pulse className="h-3 w-28" delay={320} />
            <Pulse className="h-4 w-3/4" delay={340} />
            <Pulse className="h-3 w-full" delay={360} />
          </div>
          {/* What's going well box */}
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-2">
            <Pulse className="h-3 w-32" delay={380} />
            <Pulse className="h-3 w-full" delay={400} />
            <Pulse className="h-3 w-5/6" delay={420} />
          </div>
        </div>
        {/* Toggle button placeholder */}
        <div className="flex justify-center border-t border-gray-100 py-3">
          <Pulse className="h-3 w-32" delay={440} />
        </div>
      </div>

      {/* Operations */}
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

      {/* Revenue Trend */}
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

      {/* Top Products */}
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
