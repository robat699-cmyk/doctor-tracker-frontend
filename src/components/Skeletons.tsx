export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading dashboard analytics">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-lg p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0" />
            <div className="flex-1 space-y-2.5">
              <div className="h-3.5 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
              <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-3 w-28 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
          <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-6" />
          <div className="h-64 w-full bg-slate-100 dark:bg-slate-800 rounded" />
        </div>
        <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
          <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded mb-6" />
          <div className="h-64 w-full bg-slate-100 dark:bg-slate-800 rounded" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
          <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-6" />
          <div className="h-64 w-full bg-slate-100 dark:bg-slate-800 rounded" />
        </div>
        <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
          <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded mb-6" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 w-full bg-slate-100 dark:bg-slate-800 rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden animate-pulse" aria-busy="true">
      <div className="h-10 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center gap-4">
        {Array.from({ length: cols }).map((_, idx) => (
          <div key={idx} className="h-3 bg-slate-200 dark:bg-slate-700 rounded flex-1" />
        ))}
      </div>
      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="h-14 px-4 flex items-center gap-4">
            {Array.from({ length: cols }).map((__, cIdx) => (
              <div key={cIdx} className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse" aria-busy="true">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
          <div className="space-y-2">
            <div className="h-4 w-44 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3 w-28 bg-slate-100 dark:bg-slate-800 rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-52 bg-slate-100 dark:bg-slate-800 rounded" />
            <div className="h-3 w-36 bg-slate-100 dark:bg-slate-800 rounded" />
          </div>
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded" />
            <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
