export default function Loading() {
  return (
    <div className="pb-20">
      <div className="h-48 w-full animate-pulse bg-white/5 sm:h-64" />
      <div className="mx-auto -mt-16 max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end gap-4">
          <div className="h-24 w-24 animate-pulse rounded-2xl border-4 border-void bg-white/10" />
          <div className="space-y-2">
            <div className="h-6 w-48 animate-pulse rounded-lg bg-white/10" />
            <div className="h-4 w-64 animate-pulse rounded-lg bg-white/5" />
          </div>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="glass h-64 animate-pulse rounded-2xl lg:col-span-2" />
          <div className="glass h-64 animate-pulse rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
