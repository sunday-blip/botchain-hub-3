export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-white/5" />
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass h-20 animate-pulse rounded-2xl" />
        ))}
      </div>
      <div className="glass mt-6 h-64 animate-pulse rounded-2xl" />
    </div>
  );
}
