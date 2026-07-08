/**
 * Admin curation overrides — which agents show in the "Featured" and
 * "Trending" rails.
 *
 * Same rationale as `battles-store.ts`: there's no on-chain hook for
 * curation (a `featured` flag would need a contract write per agent per
 * curation change, for a purely editorial decision — not worth the gas or
 * the extra contract), so this is an fs-backed JSON file the admin panel
 * writes to. When nothing is curated yet, the landing page's featured/
 * trending rails keep falling back to sorting by trust score / usage,
 * exactly like they did before Session 5.
 *
 * **Server-only** — this file imports `fs`, so only import it from Server
 * Components (`app/page.tsx`, `app/admin/page.tsx`) or Route Handlers
 * (`app/api/admin/*`), never from `data/agents.ts` or anything a Client
 * Component imports (that includes `marketplace-grid.tsx` and
 * `dashboard/page.tsx`, both of which import `data/agents.ts`) — Next.js
 * fails the client bundle if `fs` ends up reachable from a "use client" file.
 */
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "curation.json");

export interface Curation {
  featuredAgentIds: string[];
  trendingAgentIds: string[];
}

const EMPTY: Curation = { featuredAgentIds: [], trendingAgentIds: [] };

function ensureStore(): Curation {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(EMPTY, null, 2), "utf-8");
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<Curation>) };
  } catch {
    return { ...EMPTY };
  }
}

function saveStore(curation: Curation) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(curation, null, 2), "utf-8");
}

export function getCuration(): Curation {
  return ensureStore();
}

function toggleId(list: string[], agentId: string, on: boolean): string[] {
  const set = new Set(list);
  if (on) set.add(agentId);
  else set.delete(agentId);
  return Array.from(set);
}

export function setFeatured(agentId: string, on: boolean): Curation {
  const curation = ensureStore();
  curation.featuredAgentIds = toggleId(curation.featuredAgentIds, agentId, on);
  saveStore(curation);
  return curation;
}

export function setTrending(agentId: string, on: boolean): Curation {
  const curation = ensureStore();
  curation.trendingAgentIds = toggleId(curation.trendingAgentIds, agentId, on);
  saveStore(curation);
  return curation;
}
