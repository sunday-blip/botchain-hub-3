/**
 * Agent Battles storage.
 *
 * There is no Battle.sol — the 7 contracts from Session 2 (AgentNFT,
 * AgentRegistry, VersionControl, Reputation, Payments, Marketplace,
 * Review) don't include one, and bolting battle votes onto Reputation
 * directly isn't a clean fit: `recordRating` is `onlyReview`, and
 * `Review.submitReview` requires `Marketplace.hasActiveAccess`, which most
 * voters on a Free agent battle would have, but most voters on a paid
 * agent's battle would not. Rather than fake that wiring, battles here
 * are an off-chain feature — one JSON file on the server, one vote per
 * wallet address per battle. See SESSION4.md for what a real on-chain
 * version would need (a dedicated Battle contract authorized to call
 * `Reputation.recordJobCompletion`/a battle-specific rating path).
 *
 * This is a genuine server-side store (an fs-backed JSON file, not
 * localStorage) so votes are shared across everyone hitting this Next.js
 * server — good enough for a local demo or a single deployed instance.
 * It won't survive a serverless redeploy or scale across instances; a
 * production version would swap this file for a real database with the
 * exact same function signatures below.
 */
import fs from "fs";
import path from "path";
import type { Battle, AgentCategory } from "@/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "battles.json");

function ensureStore(): Battle[] {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]", "utf-8");
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw) as Battle[];
  } catch {
    return [];
  }
}

function saveStore(battles: Battle[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(battles, null, 2), "utf-8");
}

export function listBattles(): Battle[] {
  return ensureStore().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getBattle(id: string): Battle | undefined {
  return ensureStore().find((b) => b.id === id);
}

export function createBattle(input: {
  task: string;
  category: AgentCategory;
  agentA: Battle["agentA"];
  agentB: Battle["agentB"];
}): Battle {
  const battles = ensureStore();
  const battle: Battle = {
    id: `battle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    task: input.task,
    category: input.category,
    agentA: input.agentA,
    agentB: input.agentB,
    votesA: 0,
    votesB: 0,
    voters: [],
    createdAt: new Date().toISOString(),
    status: "voting",
  };
  battles.push(battle);
  saveStore(battles);
  return battle;
}

export function castVote(
  id: string,
  address: string,
  choice: "a" | "b"
): { battle: Battle; error?: string } | { battle: null; error: string } {
  const battles = ensureStore();
  const idx = battles.findIndex((b) => b.id === id);
  if (idx === -1) return { battle: null, error: "Battle not found." };

  const battle = battles[idx];
  const lower = address.toLowerCase();
  if (battle.voters.includes(lower)) {
    return { battle, error: "This wallet already voted on this battle." };
  }

  battle.voters.push(lower);
  if (choice === "a") battle.votesA += 1;
  else battle.votesB += 1;
  // Simple auto-conclude threshold so battles don't stay open forever in a demo.
  if (battle.votesA + battle.votesB >= 20) battle.status = "concluded";

  battles[idx] = battle;
  saveStore(battles);
  return { battle };
}

export function concludeBattle(id: string): Battle | null {
  const battles = ensureStore();
  const idx = battles.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  battles[idx].status = "concluded";
  saveStore(battles);
  return battles[idx];
}

export interface LeaderboardEntry {
  agentId: string;
  name: string;
  logoUrl: string;
  slug: string;
  wins: number;
  losses: number;
  totalVotesReceived: number;
}

export function computeLeaderboard(): LeaderboardEntry[] {
  const battles = ensureStore().filter((b) => b.status === "concluded");
  const table = new Map<string, LeaderboardEntry>();

  function ensure(agent: Battle["agentA"]): LeaderboardEntry {
    if (!table.has(agent.id)) {
      table.set(agent.id, {
        agentId: agent.id,
        name: agent.name,
        logoUrl: agent.logoUrl,
        slug: agent.slug,
        wins: 0,
        losses: 0,
        totalVotesReceived: 0,
      });
    }
    return table.get(agent.id)!;
  }

  for (const b of battles) {
    const a = ensure(b.agentA);
    const c = ensure(b.agentB);
    a.totalVotesReceived += b.votesA;
    c.totalVotesReceived += b.votesB;
    if (b.votesA > b.votesB) {
      a.wins += 1;
      c.losses += 1;
    } else if (b.votesB > b.votesA) {
      c.wins += 1;
      a.losses += 1;
    }
  }

  return Array.from(table.values()).sort(
    (x, y) => y.wins - x.wins || y.totalVotesReceived - x.totalVotesReceived
  );
}
