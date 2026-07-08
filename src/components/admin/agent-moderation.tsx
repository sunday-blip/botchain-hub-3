"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, Flag, Star, ChevronDown, ChevronUp, Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/contexts/wallet-context";
import { getContract } from "@/lib/contracts";
import { buildCurationAuthMessage } from "@/lib/admin-auth";
import { truncateAddress, timeAgo } from "@/lib/utils";
import type { Agent } from "@/types";
import type { Curation } from "@/data/curation-store";

async function postCuration(
  signer: { signMessage: (message: string) => Promise<string> },
  agentId: string,
  field: "featured" | "trending",
  on: boolean
) {
  const timestamp = Date.now();
  const message = buildCurationAuthMessage({ agentId, field, on, timestamp });
  const signature = await signer.signMessage(message);

  const res = await fetch("/api/admin/curation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId, field, on, timestamp, signature }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Curation update failed.");
  return json.curation as Curation;
}

function AgentModerationRow({
  agent,
  curation,
  onCurationChanged,
}: {
  agent: Agent;
  curation: Curation;
  onCurationChanged: (c: Curation) => void;
}) {
  const { address, getSigner } = useWallet();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [verifiedBusy, setVerifiedBusy] = useState(false);
  const [curationBusy, setCurationBusy] = useState<"featured" | "trending" | null>(null);
  const [reportBusy, setReportBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isFeatured = curation.featuredAgentIds.includes(agent.id);
  const isTrending = curation.trendingAgentIds.includes(agent.id);

  async function toggleVerified() {
    if (agent.chainAgentId === undefined) return;
    setVerifiedBusy(true);
    setError(null);
    try {
      const signer = await getSigner();
      const reputation = getContract("Reputation", signer);
      const tx = await reputation.setVerified(agent.chainAgentId, !agent.verified);
      await tx.wait();
      router.refresh();
    } catch (err) {
      const anyErr = err as { shortMessage?: string; message?: string };
      setError(anyErr.shortMessage || anyErr.message || "Failed to update verified status.");
    } finally {
      setVerifiedBusy(false);
    }
  }

  async function toggleCuration(field: "featured" | "trending") {
    if (!address) return;
    setCurationBusy(field);
    setError(null);
    try {
      const currentlyOn = field === "featured" ? isFeatured : isTrending;
      const signer = await getSigner();
      if (!signer) throw new Error("Connect your wallet to sign this action.");
      const updated = await postCuration(signer, agent.id, field, !currentlyOn);
      onCurationChanged(updated);
    } catch (err) {
      const anyErr = err as { code?: number; shortMessage?: string; message?: string };
      const message =
        anyErr.code === 4001
          ? "Signature request rejected."
          : anyErr.shortMessage || anyErr.message || "Curation update failed.";
      setError(message);
    } finally {
      setCurationBusy(null);
    }
  }

  async function flagReview(index: number) {
    if (agent.chainAgentId === undefined) return;
    setReportBusy(index);
    setError(null);
    try {
      const signer = await getSigner();
      const review = getContract("Review", signer);
      const tx = await review.reportReview(agent.chainAgentId, index);
      await tx.wait();
      router.refresh();
    } catch (err) {
      const anyErr = err as { shortMessage?: string; message?: string };
      setError(anyErr.shortMessage || anyErr.message || "Failed to flag review.");
    } finally {
      setReportBusy(null);
    }
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-white/10">
            <Image src={agent.logoUrl} alt="" fill unoptimized className="object-cover" />
          </div>
          <div>
            <div className="text-sm font-semibold text-ink">{agent.name}</div>
            <div className="text-xs text-ink-faint">
              {agent.category} · agent #{agent.chainAgentId} · {truncateAddress(agent.creatorAddress)}
            </div>
          </div>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-ink-dim hover:text-white"
        >
          Reviews ({agent.reviews.length}) {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <button
          onClick={toggleVerified}
          disabled={verifiedBusy}
          className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 disabled:opacity-50 ${
            agent.verified ? "border-signal-cyan/40 text-signal-cyan" : "border-border text-ink-dim hover:text-white"
          }`}
        >
          {verifiedBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          {agent.verified ? "Verified" : "Mark verified"}
        </button>
        <button
          onClick={() => toggleCuration("featured")}
          disabled={curationBusy === "featured"}
          className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 disabled:opacity-50 ${
            isFeatured ? "border-signal-purple/40 text-signal-purple" : "border-border text-ink-dim hover:text-white"
          }`}
        >
          {curationBusy === "featured" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {isFeatured ? "Featured" : "Feature on homepage"}
        </button>
        <button
          onClick={() => toggleCuration("trending")}
          disabled={curationBusy === "trending"}
          className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 disabled:opacity-50 ${
            isTrending ? "border-signal-purple/40 text-signal-purple" : "border-border text-ink-dim hover:text-white"
          }`}
        >
          {curationBusy === "trending" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5" />}
          {isTrending ? "Trending" : "Mark trending"}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3">
          {agent.reviews.length === 0 && <p className="text-xs text-ink-faint">No reviews yet.</p>}
          {agent.reviews.map((r, idx) => (
            <div key={r.id} className="rounded-xl bg-white/5 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-ink-faint">{truncateAddress(r.authorAddress)}</span>
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3 w-3 ${i < r.rating ? "fill-signal-cyan text-signal-cyan" : "text-white/15"}`} />
                  ))}
                </span>
              </div>
              <p className="mt-1.5 text-ink-dim">{r.comment}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-ink-faint">
                <span>{timeAgo(r.createdAt)}</span>
                {r.reported ? (
                  <span className="flex items-center gap-1 text-red-300">
                    <Flag className="h-3 w-3" /> Flagged — hidden from public page
                  </span>
                ) : (
                  <button
                    onClick={() => flagReview(idx)}
                    disabled={reportBusy === idx}
                    className="flex items-center gap-1 text-red-300 hover:text-red-200 disabled:opacity-50"
                  >
                    {reportBusy === idx ? <Loader2 className="h-3 w-3 animate-spin" /> : <Flag className="h-3 w-3" />} Flag
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  );
}

export function AgentModeration({
  agents,
  initialCuration,
}: {
  agents: Agent[];
  initialCuration: Curation;
}) {
  const [curation, setCuration] = useState(initialCuration);
  const chainAgents = agents.filter((a) => a.source === "chain");

  if (chainAgents.length === 0) {
    return <p className="text-sm text-ink-dim">No on-chain agents registered yet.</p>;
  }

  return (
    <div className="space-y-4">
      {chainAgents.map((agent) => (
        <AgentModerationRow key={agent.id} agent={agent} curation={curation} onCurationChanged={setCuration} />
      ))}
    </div>
  );
}
