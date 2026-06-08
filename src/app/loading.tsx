function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

function StatCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="h-0.5 w-full bg-gray-200" />
      <div className="flex items-start justify-between p-6">
        <div className="space-y-2">
          <Pulse className="h-3.5 w-24" />
          <Pulse className="h-9 w-16" />
        </div>
        <Pulse className="h-11 w-11 rounded-xl" />
      </div>
      <div className="px-6 pb-6">
        <Pulse className="h-3 w-32" />
      </div>
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
            <Pulse className="h-4 w-24" />
            <Pulse className="hidden h-3 w-36 sm:block" />
          </div>
        </div>
        <Pulse className="h-6 w-16 rounded-full" />
      </div>
      <div className="flex-1 space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="h-52 animate-pulse rounded-xl border border-gray-200 bg-white shadow-sm" />
      </div>
    </>
  );
}
