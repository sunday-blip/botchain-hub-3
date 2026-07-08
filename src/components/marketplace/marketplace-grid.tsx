"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CATEGORIES } from "@/data/agents";
import { AgentCard } from "@/components/marketplace/agent-card";
import { cn } from "@/lib/utils";
import type { Agent } from "@/types";

type Sort = "trending" | "newest" | "rating" | "price-asc";

export function MarketplaceGrid({
  agents,
  initialCategory,
}: {
  agents: Agent[];
  initialCategory?: string;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | undefined>(initialCategory);
  const [sort, setSort] = useState<Sort>("trending");

  const results = useMemo(() => {
    let list = [...agents];
    if (category) list = list.filter((a) => a.category === category);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          (a.creatorEns ?? "").toLowerCase().includes(q)
      );
    }
    switch (sort) {
      case "newest":
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "rating":
        list.sort((a, b) => b.trustScore.averageRating - a.trustScore.averageRating);
        break;
      case "price-asc":
        list.sort((a, b) => a.pricing.amountEth - b.pricing.amountEth);
        break;
      default:
        list.sort((a, b) => Number(b.trending) - Number(a.trending) || b.usageCount - a.usageCount);
    }
    return list;
  }, [agents, query, category, sort]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">Marketplace</h1>
          <p className="mt-1 text-sm text-ink-dim">{results.length} agents match your filters</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, creator, category…"
            className="glass w-full rounded-xl py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCategory(undefined)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs transition-colors",
            !category
              ? "border-signal-purple bg-signal-purple/15 text-white"
              : "border-border text-ink-dim hover:text-white"
          )}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              category === c
                ? "border-signal-purple bg-signal-purple/15 text-white"
                : "border-border text-ink-dim hover:text-white"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 text-xs text-ink-dim">
        <span>Sort by</span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="rounded-lg border border-border bg-surface px-2 py-1.5 text-ink focus:outline-none"
        >
          <option value="trending">Trending</option>
          <option value="newest">Newest</option>
          <option value="rating">Highest rated</option>
          <option value="price-asc">Price: low to high</option>
        </select>
      </div>

      {results.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-2 text-center">
          <p className="font-display text-lg text-ink">No agents match yet</p>
          <p className="text-sm text-ink-dim">
            Try a different category, or clear your search to see everything live.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
