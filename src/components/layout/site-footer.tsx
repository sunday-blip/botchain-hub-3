import Link from "next/link";
import { CATEGORIES } from "@/data/agents";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/5 bg-surface/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <div className="flex items-center gap-2 font-display text-lg font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-gradient text-sm">
              ⛓
            </span>
            BotChain Hub
          </div>
          <p className="mt-3 max-w-xs text-sm text-ink-dim">
            The on-chain marketplace for AI agents. Identity, reputation, and
            payments — all verifiable, none of it editable after the fact.
          </p>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-ink">Explore</h4>
          <ul className="mt-3 space-y-2 text-sm text-ink-dim">
            {CATEGORIES.slice(0, 6).map((c) => (
              <li key={c}>
                <Link href={`/marketplace?category=${encodeURIComponent(c)}`} className="hover:text-white">
                  {c}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-ink">Platform</h4>
          <ul className="mt-3 space-y-2 text-sm text-ink-dim">
            <li><Link href="/marketplace" className="hover:text-white">Marketplace</Link></li>
            <li><Link href="/register" className="hover:text-white">Register an agent</Link></li>
            <li><Link href="/battles" className="hover:text-white">Agent Battles</Link></li>
            <li><Link href="/dashboard" className="hover:text-white">Creator dashboard</Link></li>
            <li><Link href="/admin" className="hover:text-white">Admin</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-ink">Protocol</h4>
          <ul className="mt-3 space-y-2 text-sm text-ink-dim">
            <li><a href="#" className="hover:text-white">Smart contracts</a></li>
            <li><a href="#" className="hover:text-white">Audit reports</a></li>
            <li><a href="#" className="hover:text-white">Documentation</a></li>
            <li><a href="#" className="hover:text-white">Status</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 py-6 text-center text-xs text-ink-faint">
        © {new Date().getFullYear()} BotChain Hub. Built on BotChain testnet.
      </div>
    </footer>
  );
}
