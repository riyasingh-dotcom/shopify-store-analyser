// Pulse skeleton that matches the visual weight of AIInsightsSection
export default function InsightsSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-gray-200" />
        <div className="space-y-1.5">
          <div className="h-4 w-40 rounded bg-gray-200" />
          <div className="h-3 w-28 rounded bg-gray-200" />
        </div>
      </div>

      {/* Score card + quick wins row */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Score card (2/3) */}
        <div className="xl:col-span-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <div className="h-24 w-24 shrink-0 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-3">
              <div className="h-5 w-48 rounded bg-gray-200" />
              <div className="h-2 w-full rounded-full bg-gray-200" />
              <div className="space-y-1.5">
                <div className="h-3 w-full rounded bg-gray-200" />
                <div className="h-3 w-5/6 rounded bg-gray-200" />
                <div className="h-3 w-4/6 rounded bg-gray-200" />
              </div>
            </div>
          </div>
          {/* Legend row */}
          <div className="mt-6 flex gap-4 border-t border-gray-100 pt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-3 w-16 rounded bg-gray-200" />
            ))}
          </div>
        </div>

        {/* Quick wins (1/3) */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="h-5 w-28 rounded bg-gray-200" />
            <div className="mt-1.5 h-3 w-40 rounded bg-gray-200" />
          </div>
          <ol className="divide-y divide-gray-50 px-5 py-3">
            {[1, 2, 3].map((i) => (
              <li key={i} className="flex items-start gap-3 py-3">
                <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-full rounded bg-gray-200" />
                  <div className="h-3 w-3/4 rounded bg-gray-200" />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Insight cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex gap-2">
              <div className="h-5 w-20 rounded-md bg-gray-200" />
              <div className="h-5 w-24 rounded-full bg-gray-200" />
            </div>
            <div className="mb-4 h-4 w-3/4 rounded bg-gray-200" />
            <div className="mb-4 rounded-lg bg-gray-50 p-3 space-y-1.5">
              <div className="h-2.5 w-16 rounded bg-gray-200" />
              <div className="h-3 w-full rounded bg-gray-200" />
              <div className="h-3 w-5/6 rounded bg-gray-200" />
            </div>
            <div className="flex gap-3">
              <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-full rounded bg-gray-200" />
                <div className="h-3 w-4/5 rounded bg-gray-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
