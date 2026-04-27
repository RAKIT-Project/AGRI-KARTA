export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header skeleton */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-md bg-muted animate-pulse" />
        <div className="space-y-3 flex-1">
          <div className="h-8 w-64 bg-muted rounded-lg animate-pulse" />
          <div className="h-4 w-96 bg-muted/60 rounded-md animate-pulse" />
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="flex flex-col md:grid md:grid-cols-3 gap-6">
        {/* Chart skeleton (sidebar) */}
        <div className="md:col-span-1 md:order-last">
          <div className="h-5 w-40 bg-muted rounded-md mb-4 animate-pulse" />
          <div className="bg-card p-4 rounded-xl border border-border">
            <div className="h-[200px] w-full bg-muted/50 rounded-lg animate-pulse flex items-center justify-center">
              <svg className="w-10 h-10 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Cards skeleton */}
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl p-6 space-y-4 animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="h-5 w-3/4 bg-muted rounded-md" />
                  <div className="h-3 w-1/2 bg-muted/60 rounded-sm" />
                </div>
                <div className="h-6 w-14 bg-muted rounded" />
              </div>
              <div className="flex items-end gap-3 mt-2">
                <div className="h-7 w-32 bg-muted rounded-md" />
                <div className="h-5 w-16 bg-muted/60 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
