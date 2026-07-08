import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Agent } from "@/types";
import { AgentCard } from "@/components/marketplace/agent-card";

export function AgentRail({
  title,
  subtitle,
  agents,
  href,
}: {
  title: string;
  subtitle: string;
  agents: Agent[];
  href: string;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{title}</h2>
          <p className="mt-1 text-sm text-ink-dim">{subtitle}</p>
        </div>
        <Link
          href={href}
          className="hidden items-center gap-1 text-sm text-signal-purple hover:text-signal-cyan sm:flex"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </section>
  );
}
