function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

function InsightSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <Pulse className="h-5 w-20 rounded-full" />
        <Pulse className="h-5 w-14 rounded-full" />
      </div>
      <Pulse className="h-4 w-3/4" />
      <Pulse className="h-3 w-full" />
      <Pulse className="h-3 w-5/6" />
      <div className="border-t border-gray-100 pt-3">
        <Pulse className="h-3 w-full" />
        <Pulse className="mt-1.5 h-3 w-4/5" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <>
      <div className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-gray-200 bg-white px-4 sm:px-6">
        <Pulse className="h-7 w-7 rounded-lg lg:hidden" />
        <Pulse className="h-4 w-32" />
      </div>
      <div className="flex-1 space-y-6 p-4 sm:p-6">
        {/* Score + summary */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-5">
            <Pulse className="h-20 w-20 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Pulse className="h-4 w-40" />
              <Pulse className="h-3 w-full" />
              <Pulse className="h-3 w-5/6" />
            </div>
          </div>
        </div>
        {/* Insights */}
        <div>
          <Pulse className="mb-3 h-4 w-24" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <InsightSkeleton key={i} />
            ))}
          </div>
        </div>
        {/* Quick wins */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
          <Pulse className="h-4 w-28" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Pulse className="h-4 w-4 shrink-0 rounded-full" />
              <Pulse className="h-3 w-full" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
