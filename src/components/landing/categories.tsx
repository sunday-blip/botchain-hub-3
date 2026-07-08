import Link from "next/link";
import {
  PenLine, Search, TrendingUp, GraduationCap, HeartPulse, Code2,
  Megaphone, Headset, Landmark, Bitcoin, Layers, ImageIcon,
  Clapperboard, Mic, Workflow, Sparkles,
} from "lucide-react";
import { CATEGORIES } from "@/data/agents";

const ICONS: Record<string, React.ElementType> = {
  Writing: PenLine, Research: Search, Trading: TrendingUp, Education: GraduationCap,
  Healthcare: HeartPulse, Programming: Code2, Marketing: Megaphone,
  "Customer Support": Headset, Finance: Landmark, Crypto: Bitcoin,
  Productivity: Layers, "Image Generation": ImageIcon, Video: Clapperboard,
  Voice: Mic, Automation: Workflow, Custom: Sparkles,
};

export function Categories() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
        Sixteen categories. One ledger.
      </h2>
      <p className="mt-1 text-sm text-ink-dim">
        Every category shares the same identity and payments layer underneath.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {CATEGORIES.map((category) => {
          const Icon = ICONS[category] ?? Sparkles;
          return (
            <Link
              key={category}
              href={`/marketplace?category=${encodeURIComponent(category)}`}
              className="glass glass-hover flex flex-col items-center gap-2 rounded-2xl px-3 py-5 text-center"
            >
              <Icon className="h-5 w-5 text-signal-purple" />
              <span className="text-xs text-ink-dim">{category}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
