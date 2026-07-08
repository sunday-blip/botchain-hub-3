/**
 * Single entry point every page/component imports for agent data.
 *
 * Session 1 had this file return a synchronous mock array. Session 3
 * makes every read async (blockchain calls always are) and adds the
 * chain-or-mock switch described in CONTRACTS.md: if `isChainConfigured()`
 * is true, reads go through `chain-agents.ts` against the real contracts;
 * otherwise they come from the deterministic `mock-agents.ts` catalog.
 * If a configured chain read fails (RPC down, wrong network, etc.) we log
 * and fall back to mock data rather than showing a broken page — this
 * matters most for `generateStaticParams`, which runs at build time when
 * a local Hardhat node may not even be running yet.
 */
import { isChainConfigured } from "@/config/chain";
import { getAllChainAgents, getChainAgentBySlug } from "@/data/chain-agents";
import {
  AGENTS as MOCK_AGENTS,
  CATEGORIES as MOCK_CATEGORIES,
  getAgentBySlug as getMockAgentBySlug,
} from "@/data/mock-agents";
import type { Agent } from "@/types";

export const CATEGORIES = MOCK_CATEGORIES;

async function safeChainAgents(): Promise<Agent[] | null> {
  try {
    return await getAllChainAgents();
  } catch (err) {
    console.warn("[data/agents] chain read failed, falling back to mock catalog:", err);
    return null;
  }
}

/** Full catalog. Chain mode returns whatever's actually registered on-chain (may be empty on a fresh deploy). */
export async function getAllAgents(): Promise<Agent[]> {
  if (isChainConfigured()) {
    const chain = await safeChainAgents();
    if (chain !== null) return chain;
  }
  return MOCK_AGENTS;
}

export async function getAgentBySlug(slug: string): Promise<Agent | undefined> {
  if (isChainConfigured()) {
    try {
      const agent = await getChainAgentBySlug(slug);
      if (agent) return agent;
    } catch (err) {
      console.warn("[data/agents] chain read failed, falling back to mock catalog:", err);
    }
  }
  return getMockAgentBySlug(slug);
}

export async function getFeaturedAgents(): Promise<Agent[]> {
  const all = await getAllAgents();
  const featured = all.filter((a) => a.featured);
  // Chain mode has no curated "featured" flag on-chain — surface the
  // highest trust scores until an admin curates one via /admin (applied
  // in app/page.tsx, since curation-store.ts touches fs and can't be
  // imported from this file — see that file's header comment).
  if (featured.length === 0 && all.length > 0) {
    return [...all].sort((a, b) => b.trustScore.score - a.trustScore.score).slice(0, 6);
  }
  return featured.slice(0, 6);
}

export async function getTrendingAgents(): Promise<Agent[]> {
  const all = await getAllAgents();
  const trending = all.filter((a) => a.trending);
  if (trending.length === 0 && all.length > 0) {
    return [...all].sort((a, b) => b.usageCount - a.usageCount).slice(0, 8);
  }
  return trending.slice(0, 8);
}

export async function getNewestAgents(): Promise<Agent[]> {
  const all = await getAllAgents();
  return [...all]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);
}

export async function getSimilarAgents(agent: Agent): Promise<Agent[]> {
  const all = await getAllAgents();
  return all.filter((a) => a.category === agent.category && a.id !== agent.id).slice(0, 4);
}
