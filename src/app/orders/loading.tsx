function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

export default function Loading() {
  return (
    <>
      <div className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Pulse className="h-7 w-7 rounded-lg lg:hidden" />
          <div className="space-y-1.5">
            <Pulse className="h-4 w-20" />
            <Pulse className="hidden h-3 w-20 sm:block" />
          </div>
        </div>
        <Pulse className="h-6 w-14 rounded-full" />
      </div>
      <div className="flex-1 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-3">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm xl:col-span-2">
            <div className="border-b border-gray-100 px-6 py-5">
              <Pulse className="h-5 w-20" />
            </div>
            <div className="divide-y divide-gray-50">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <Pulse className="h-4 w-24" />
                  <Pulse className="h-4 flex-1" />
                  <Pulse className="h-5 w-16 rounded-full" />
                  <Pulse className="hidden h-4 w-20 sm:block" />
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4">
              <Pulse className="h-4 w-28" />
            </div>
            <div className="h-32 animate-pulse bg-gray-200" />
            <div className="space-y-4 p-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Pulse key={i} className="h-8 w-full rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
