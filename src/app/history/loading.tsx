function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

function AnalysisCardSkeleton() {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <Pulse className="h-16 w-[4.5rem] rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Pulse className="h-4 w-32" />
          <Pulse className="h-3 w-24" />
        </div>
        <Pulse className="h-3 w-full max-w-lg" />
        <Pulse className="h-3 w-3/4 max-w-sm" />
      </div>
      <Pulse className="mt-0.5 h-5 w-5 shrink-0 rounded" />
    </div>
  );
}

export default function Loading() {
  return (
    <>
      <div className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Pulse className="h-7 w-7 rounded-lg lg:hidden" />
          <div className="space-y-1.5">
            <Pulse className="h-4 w-32" />
            <Pulse className="hidden h-3 w-24 sm:block" />
          </div>
        </div>
        <Pulse className="h-7 w-20 rounded-lg" />
      </div>
      <div className="flex-1 space-y-3 p-4 sm:p-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <AnalysisCardSkeleton key={i} />
        ))}
      </div>
    </>
  );
}
