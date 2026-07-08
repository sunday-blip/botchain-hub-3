export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-white/5" />
      <div className="glass mt-6 h-20 animate-pulse rounded-2xl" />
      <div className="mt-10 space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="glass h-32 animate-pulse rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
