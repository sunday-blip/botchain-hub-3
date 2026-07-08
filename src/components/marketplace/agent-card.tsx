"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Heart, Zap } from "lucide-react";
import type { Agent } from "@/types";
import { Badge } from "@/components/ui/badge";
import { TrustRing } from "@/components/ui/trust-ring";
import { formatEth, formatCompactNumber, truncateAddress } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function AgentCard({ agent }: { agent: Agent }) {
  const [favorited, setFavorited] = useState(false);

  return (
    <div className="glass glass-hover group relative flex flex-col rounded-2xl p-4">
      <button
        aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
        onClick={(e) => {
          e.preventDefault();
          setFavorited((v) => !v);
        }}
        className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 backdrop-blur transition-colors hover:bg-black/60"
      >
        <Heart
          className={cn(
            "h-4 w-4 transition-colors",
            favorited ? "fill-signal-purple text-signal-purple" : "text-white/70"
          )}
        />
      </button>

      <Link href={`/agent/${agent.slug}`} className="flex flex-1 flex-col">
        <div className="flex items-start gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-surface">
            <Image src={agent.logoUrl} alt="" fill sizes="56px" unoptimized />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate font-display font-semibold text-ink">{agent.name}</h3>
              {agent.verified && (
                <span title="Verified creator" className="text-signal-cyan">✓</span>
              )}
            </div>
            <p className="truncate text-xs text-ink-dim">{agent.tagline}</p>
          </div>
        </div>

        <p className="mt-3 line-clamp-2 text-sm text-ink-dim">{agent.description}</p>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge>{agent.category}</Badge>
          <Badge variant="outline">v{agent.version}</Badge>
          {agent.trending && <Badge variant="trending">Trending</Badge>}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
          <TrustRing score={agent.trustScore.score} size={40} />
          <div className="text-right text-xs text-ink-faint">
            <div className="font-mono">{truncateAddress(agent.creatorAddress)}</div>
            <div>{formatCompactNumber(agent.usageCount)} runs</div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="font-display text-lg font-semibold text-ink">
            {formatEth(agent.pricing.amountEth)}
            {agent.pricing.model === "subscription" && (
              <span className="text-xs font-normal text-ink-faint">/mo</span>
            )}
          </span>
          <span className="flex items-center gap-1.5 rounded-lg bg-signal-gradient px-3 py-1.5 text-xs font-medium text-white transition-transform group-hover:scale-105">
            <Zap className="h-3.5 w-3.5" />
            Launch
          </span>
        </div>
      </Link>
    </div>
  );
}
