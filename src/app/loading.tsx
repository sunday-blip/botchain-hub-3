export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="h-10 w-2/3 max-w-lg animate-pulse rounded-lg bg-white/5" />
      <div className="mt-4 h-5 w-1/2 max-w-md animate-pulse rounded-lg bg-white/5" />
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass h-56 animate-pulse rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
