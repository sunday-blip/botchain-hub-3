"use client";

import { useMemo, useState } from "react";
import { Swords, Trophy, Loader2, Check, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/contexts/wallet-context";
import { simulateAgentResponse } from "@/lib/simulate-agent";
import { timeAgo } from "@/lib/utils";
import type { Agent, Battle, AgentCategory } from "@/types";
import type { LeaderboardEntry } from "@/data/battles-store";

function useTypewriter(fullText: string, active: boolean, speed = 12) {
  const [shown, setShown] = useState("");
  useMemo(() => {
    if (!active) return;
    setShown("");
    let i = 0;
    const interval = setInterval(() => {
      i += 3;
      setShown(fullText.slice(0, i));
      if (i >= fullText.length) clearInterval(interval);
    }, speed);
    // no cleanup return here — this is a best-effort demo animation, not a real subscription
  }, [fullText, active, speed]);
  return shown;
}

function AgentOutputPanel({ agent, task, running }: { agent: Agent; task: string; running: boolean }) {
  const full = useMemo(() => simulateAgentResponse(agent, task), [agent, task]);
  const shown = useTypewriter(full, running);
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 overflow-hidden rounded-lg bg-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={agent.logoUrl} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="font-display text-sm font-semibold text-ink">{agent.name}</div>
      </div>
      <pre className="mt-3 whitespace-pre-wrap font-body text-xs leading-relaxed text-ink-dim">
        {shown}
        {running && shown.length < full.length && <span className="animate-pulse">▍</span>}
      </pre>
    </div>
  );
}

function BattleCard({
  battle,
  onVoted,
}: {
  battle: Battle;
  onVoted: (updated: Battle) => void;
}) {
  const { address, connect } = useWallet();
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alreadyVoted = Boolean(address && battle.voters.includes(address.toLowerCase()));
  const total = battle.votesA + battle.votesB;

  async function vote(choice: "a" | "b") {
    if (!address) {
      await connect();
      return;
    }
    setVoting(true);
    setError(null);
    try {
      const res = await fetch(`/api/battles/${battle.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, choice }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Vote failed.");
        return;
      }
      onVoted(json.battle);
    } catch {
      setError("Vote failed — check your connection and try again.");
    } finally {
      setVoting(false);
    }
  }

  const pctA = total > 0 ? Math.round((battle.votesA / total) * 100) : 50;

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <Badge>{battle.category}</Badge>
        <span className="text-xs text-ink-faint">{timeAgo(battle.createdAt)}</span>
      </div>
      <p className="mt-2 text-sm text-ink">&ldquo;{battle.task}&rdquo;</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {(["a", "b"] as const).map((side) => {
          const agent = side === "a" ? battle.agentA : battle.agentB;
          const votes = side === "a" ? battle.votesA : battle.votesB;
          return (
            <button
              key={side}
              disabled={alreadyVoted || voting || battle.status === "concluded"}
              onClick={() => vote(side)}
              className="rounded-xl border border-border p-3 text-left transition-colors hover:border-signal-purple/60 disabled:cursor-default disabled:hover:border-border"
            >
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={agent.logoUrl} alt="" className="h-6 w-6 rounded object-cover" />
                <span className="text-sm text-ink">{agent.name}</span>
              </div>
              {(alreadyVoted || battle.status === "concluded") && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full bg-signal-gradient"
                    style={{ width: `${side === "a" ? pctA : 100 - pctA}%` }}
                  />
                </div>
              )}
              <div className="mt-1 text-xs text-ink-faint">{votes} votes</div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-ink-faint">
          {battle.status === "concluded" ? "Voting closed" : `${total} vote${total === 1 ? "" : "s"} so far`}
        </span>
        {!address && !alreadyVoted && battle.status === "voting" && (
          <button onClick={() => connect()} className="flex items-center gap-1 text-signal-cyan hover:underline">
            <Wallet className="h-3 w-3" /> Connect to vote
          </button>
        )}
        {alreadyVoted && <span className="flex items-center gap-1 text-signal-cyan"><Check className="h-3 w-3" /> You voted</span>}
      </div>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  );
}

export function BattleArena({
  agents,
  initialBattles,
  leaderboard,
}: {
  agents: Agent[];
  initialBattles: Battle[];
  leaderboard: LeaderboardEntry[];
}) {
  const [battles, setBattles] = useState(initialBattles);
  const [task, setTask] = useState("");
  const [category, setCategory] = useState<AgentCategory | "">("");
  const [agentAId, setAgentAId] = useState("");
  const [agentBId, setAgentBId] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeBattle, setActiveBattle] = useState<Battle | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(agents.map((a) => a.category))).sort(),
    [agents]
  );
  const eligibleAgents = useMemo(
    () => (category ? agents.filter((a) => a.category === category) : agents),
    [agents, category]
  );

  const agentA = agents.find((a) => a.id === agentAId);
  const agentB = agents.find((a) => a.id === agentBId);

  async function startBattle() {
    setError(null);
    if (!task.trim() || !category || !agentA || !agentB) {
      setError("Pick a task, a category, and two different agents.");
      return;
    }
    if (agentA.id === agentB.id) {
      setError("Pick two different agents.");
      return;
    }
    setRunning(true);
    try {
      const res = await fetch("/api/battles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: task.trim(),
          category,
          agentA: { id: agentA.id, name: agentA.name, logoUrl: agentA.logoUrl, slug: agentA.slug },
          agentB: { id: agentB.id, name: agentB.name, logoUrl: agentB.logoUrl, slug: agentB.slug },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Couldn't start that battle.");
        return;
      }
      setActiveBattle(json.battle as Battle);
      setBattles((prev) => [json.battle, ...prev]);
    } finally {
      setRunning(false);
    }
  }

  function handleVoted(updated: Battle) {
    setBattles((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    if (activeBattle?.id === updated.id) setActiveBattle(updated);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-signal-gradient">
          <Swords className="h-5 w-5 text-white" />
        </div>
        <h1 className="mt-5 font-display text-3xl font-semibold text-ink">Agent Battles</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-ink-dim">
          Pick a task, pick two agents, and let the community vote. Battle outcomes are
          tracked here rather than on-chain — see the note at the bottom of this page.
        </p>
      </div>

      {/* Setup */}
      <div className="glass mt-10 rounded-2xl p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-ink-dim">Task</span>
            <input
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="e.g. Write a launch tweet for a new productivity app"
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-dim">Category</span>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as AgentCategory);
                setAgentAId("");
                setAgentBId("");
              }}
              className="input"
            >
              <option value="">Select a category…</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <div />
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-dim">Agent A</span>
            <select value={agentAId} onChange={(e) => setAgentAId(e.target.value)} className="input">
              <option value="">Select…</option>
              {eligibleAgents.map((a) => (
                <option key={a.id} value={a.id} disabled={a.id === agentBId}>{a.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-dim">Agent B</span>
            <select value={agentBId} onChange={(e) => setAgentBId(e.target.value)} className="input">
              <option value="">Select…</option>
              {eligibleAgents.map((a) => (
                <option key={a.id} value={a.id} disabled={a.id === agentAId}>{a.name}</option>
              ))}
            </select>
          </label>
        </div>
        <Button className="mt-5 w-full" size="lg" onClick={startBattle} disabled={running}>
          {running ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting…</> : <><Swords className="h-4 w-4" /> Start battle</>}
        </Button>
        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      </div>

      {/* Active run */}
      {activeBattle && agentA && agentB && (
        <div className="mt-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AgentOutputPanel agent={agentA} task={activeBattle.task} running />
            <AgentOutputPanel agent={agentB} task={activeBattle.task} running />
          </div>
          <div className="mt-4">
            <BattleCard battle={battles.find((b) => b.id === activeBattle.id) ?? activeBattle} onVoted={handleVoted} />
          </div>
        </div>
      )}

      {/* History */}
      <div className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="font-display text-lg font-semibold text-ink">Recent battles</h2>
          <div className="mt-4 space-y-4">
            {battles.length === 0 && (
              <p className="text-sm text-ink-dim">No battles yet — start the first one above.</p>
            )}
            {battles
              .filter((b) => b.id !== activeBattle?.id)
              .map((b) => (
                <BattleCard key={b.id} battle={b} onVoted={handleVoted} />
              ))}
          </div>
        </div>

        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <Trophy className="h-4 w-4 text-signal-cyan" /> Leaderboard
          </h2>
          <div className="glass mt-4 rounded-2xl p-4">
            {leaderboard.length === 0 ? (
              <p className="text-sm text-ink-dim">No concluded battles yet.</p>
            ) : (
              <ol className="space-y-3">
                {leaderboard.slice(0, 8).map((entry, i) => (
                  <li key={entry.agentId} className="flex items-center gap-3">
                    <span className="w-4 text-xs text-ink-faint">{i + 1}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={entry.logoUrl} alt="" className="h-7 w-7 rounded-lg object-cover" />
                    <div className="flex-1">
                      <div className="text-sm text-ink">{entry.name}</div>
                      <div className="text-xs text-ink-faint">{entry.wins}W · {entry.losses}L</div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>

      <p className="mx-auto mt-16 max-w-2xl text-center text-xs text-ink-faint">
        Agent outputs above are a labeled simulation — this demo doesn&apos;t call each
        agent&apos;s real API endpoint. Votes are one-per-wallet and stored server-side;
        a production version would settle winners through a dedicated Battle contract
        instead of this JSON store.
      </p>
    </div>
  );
}
