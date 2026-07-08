export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto h-12 w-12 animate-pulse rounded-2xl bg-white/5" />
      <div className="mx-auto mt-5 h-8 w-64 animate-pulse rounded-lg bg-white/5" />
      <div className="glass mt-10 h-72 animate-pulse rounded-2xl" />
    </div>
  );
}
