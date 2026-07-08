import { Sparkles } from "lucide-react";

export function ComingSoon({
  title,
  description,
  session,
  bullets,
}: {
  title: string;
  description: string;
  session: string;
  bullets: string[];
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6 lg:px-8">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-signal-gradient">
        <Sparkles className="h-5 w-5 text-white" />
      </div>
      <h1 className="mt-5 font-display text-3xl font-semibold text-ink">{title}</h1>
      <p className="mt-3 text-sm text-ink-dim">{description}</p>
      <div className="glass mt-8 rounded-2xl p-6 text-left">
        <div className="text-xs font-medium uppercase tracking-wide text-signal-purple">{session}</div>
        <ul className="mt-3 space-y-2 text-sm text-ink-dim">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-signal-cyan" />
              {b}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
