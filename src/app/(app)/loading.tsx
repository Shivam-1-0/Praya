// Shared loading skeleton for every (app) tab. Its existence is what makes
// <Link> prefetch dynamic routes and gives instant visual feedback on tab
// switch — the actual data fetch still runs, but the shell paints immediately.
export default function AppTabLoading() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-secondary/60" />
        <div className="h-8 w-56 rounded bg-secondary/60" />
        <div className="h-4 w-72 rounded bg-secondary/40" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl border border-border bg-card" />
        ))}
      </div>
      <div className="h-40 rounded-2xl border border-border bg-card" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl border border-border bg-card" />
        ))}
      </div>
    </div>
  );
}
