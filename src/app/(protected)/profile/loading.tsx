export default function ProfileLoading() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full animate-in fade-in duration-500">
      {/* Header */}
      <div className="space-y-3">
        <div className="h-8 w-56 bg-muted rounded-lg animate-pulse" />
        <div className="h-4 w-80 bg-muted/60 rounded-md animate-pulse" />
      </div>

      {/* Account Info Card Skeleton */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-6 animate-pulse">
        <div className="space-y-2">
          <div className="h-5 w-40 bg-muted rounded-md" />
          <div className="h-3 w-64 bg-muted/60 rounded-sm" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-20 bg-muted/50 rounded-sm" />
              <div className="h-4 w-48 bg-muted rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* WhatsApp Card Skeleton */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-6 animate-pulse">
        <div className="space-y-2">
          <div className="h-5 w-52 bg-muted rounded-md" />
          <div className="h-3 w-72 bg-muted/60 rounded-sm" />
        </div>
        <div className="h-14 w-full bg-muted/40 rounded-lg" />
        <div className="space-y-3">
          <div className="h-4 w-32 bg-muted/50 rounded-sm" />
          <div className="h-10 w-64 bg-muted rounded-md" />
          <div className="h-10 w-40 bg-muted rounded-lg" />
        </div>
      </div>
    </div>
  );
}
