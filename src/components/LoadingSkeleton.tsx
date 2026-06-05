// Animated skeleton matching the new sidebar + content layout
function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

function StatCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="h-0.5 w-full bg-gray-200" />
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Pulse className="h-3.5 w-24" />
            <Pulse className="h-9 w-16" />
          </div>
          <Pulse className="h-11 w-11 rounded-xl" />
        </div>
        <Pulse className="mt-4 h-3 w-32" />
      </div>
    </div>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-5">
        <Pulse className="h-5 w-32 mb-1" />
        <Pulse className="h-3 w-20 mt-2" />
      </div>
      <div className="divide-y divide-gray-50">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4">
            <Pulse className="h-8 w-8 rounded-lg shrink-0" />
            <Pulse className="h-4 flex-1" />
            <Pulse className="h-5 w-16 rounded-full" />
            <Pulse className="h-4 w-20" />
            <Pulse className="h-3 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-gray-950 border-r border-gray-800 flex flex-col p-4 gap-3">
      <div className="flex items-center gap-3 px-1 py-3 border-b border-gray-800 mb-2">
        <div className="h-8 w-8 rounded-lg bg-gray-800 animate-pulse" />
        <div className="space-y-1.5">
          <div className="h-3 w-24 rounded bg-gray-800 animate-pulse" />
          <div className="h-2.5 w-16 rounded bg-gray-800 animate-pulse" />
        </div>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-9 rounded-lg bg-gray-800 animate-pulse" />
      ))}
    </div>
  );
}

export default function LoadingSkeleton() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <SidebarSkeleton />
      <div className="flex flex-1 flex-col lg:ml-64">
        {/* top bar */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
          <Pulse className="h-5 w-32" />
          <Pulse className="h-7 w-24 rounded-full" />
        </div>

        <div className="flex-1 space-y-6 p-6">
          {/* stat cards */}
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>

          {/* products + summary */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2"><TableSkeleton rows={5} /></div>
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-gray-100 px-5 py-4"><Pulse className="h-4 w-28" /></div>
              <div className="h-32 bg-gray-200 animate-pulse" />
              <div className="space-y-4 p-5">
                {Array.from({ length: 3 }).map((_, i) => <Pulse key={i} className="h-8 w-full rounded" />)}
              </div>
            </div>
          </div>

          {/* orders */}
          <TableSkeleton rows={4} />
        </div>
      </div>
    </div>
  );
}
