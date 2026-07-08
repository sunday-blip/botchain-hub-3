"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Wallet,
  Coins,
  Loader2,
  Star,
  ThumbsUp,
  ChevronDown,
  ChevronUp,
  Rocket,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrustRing } from "@/components/ui/trust-ring";
import { VersionPublishForm } from "@/components/dashboard/version-publish-form";
import { useWallet } from "@/contexts/wallet-context";
import { getAllAgents } from "@/data/agents";
import { getContract, getReadProvider } from "@/lib/contracts";
import { isChainConfigured } from "@/config/chain";
import { formatCompactNumber, truncateAddress, timeAgo } from "@/lib/utils";
import { formatEther } from "ethers";
import type { Agent } from "@/types";

function AgentRow({ agent, onChanged }: { agent: Agent; onChanged: () => void }) {
  const { getSigner } = useWallet();
  const [expanded, setExpanded] = useState<"none" | "reviews" | "version">("none");
  const [likeBusy, setLikeBusy] = useState<number | null>(null);
  const [likeError, setLikeError] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  async function toggleStatus() {
    if (agent.chainAgentId === undefined) return;
    setStatusBusy(true);
    setStatusError(null);
    try {
      const signer = await getSigner();
      const registry = getContract("AgentRegistry", signer);
      const nextStatus = agent.status === "active" ? 1 : 0; // 1 = paused, 0 = active
      const tx = await registry.setStatus(agent.chainAgentId, nextStatus);
      await tx.wait();
      onChanged();
    } catch (err) {
      const anyErr = err as { shortMessage?: string; message?: string };
      setStatusError(anyErr.shortMessage || anyErr.message || "Status update failed.");
    } finally {
      setStatusBusy(false);
    }
  }

  async function likeReview(index: number) {
    if (agent.chainAgentId === undefined) return;
    setLikeBusy(index);
    setLikeError(null);
    try {
      const signer = await getSigner();
      const review = getContract("Review", signer);
      const tx = await review.likeReview(agent.chainAgentId, index);
      await tx.wait();
      onChanged();
    } catch (err) {
      const anyErr = err as { shortMessage?: string; message?: string };
      setLikeError(anyErr.shortMessage || anyErr.message || "Like failed.");
    } finally {
      setLikeBusy(null);
    }
  }

  const statusVariant = agent.status === "active" ? "verified" : agent.status === "paused" ? "trending" : "outline";

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-11 overflow-hidden rounded-xl border border-white/10">
            <Image src={agent.logoUrl} alt="" fill unoptimized className="object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Link href={`/agent/${agent.slug}`} className="font-display text-sm font-semibold text-ink hover:underline">
                {agent.name}
              </Link>
              <Badge variant={statusVariant as "verified" | "trending" | "outline"}>{agent.status}</Badge>
            </div>
            <div className="text-xs text-ink-faint">{agent.category} · v{agent.version}</div>
          </div>
        </div>
        <div className="flex items-center gap-5 text-sm">
          <div className="text-center">
            <div className="font-display font-semibold text-ink">{formatCompactNumber(agent.usageCount)}</div>
            <div className="text-xs text-ink-faint">Jobs</div>
          </div>
          <div className="text-center">
            <div className="font-display font-semibold text-ink">{agent.trustScore.averageRating.toFixed(1)}</div>
            <div className="text-xs text-ink-faint">Rating</div>
          </div>
          <TrustRing score={agent.trustScore.score} size={44} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <button
          onClick={() => setExpanded(expanded === "version" ? "none" : "version")}
          className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-ink-dim hover:text-white"
        >
          <Rocket className="h-3.5 w-3.5" /> Publish version
          {expanded === "version" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        <button
          onClick={() => setExpanded(expanded === "reviews" ? "none" : "reviews")}
          className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-ink-dim hover:text-white"
        >
          <Star className="h-3.5 w-3.5" /> Reviews ({agent.reviews.length})
          {expanded === "reviews" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        <Link
          href={`/agent/${agent.slug}`}
          className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-ink-dim hover:text-white"
        >
          <ExternalLink className="h-3.5 w-3.5" /> View listing
        </Link>
        {agent.status !== "unpublished" && (
          <button
            onClick={toggleStatus}
            disabled={statusBusy || agent.chainAgentId === undefined}
            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-ink-dim hover:text-white disabled:opacity-50"
          >
            {statusBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : agent.status === "active" ? (
              "Pause listing"
            ) : (
              "Resume listing"
            )}
          </button>
        )}
      </div>
      {statusError && <p className="mt-2 text-xs text-red-300">{statusError}</p>}

      {expanded === "version" && (
        <div className="mt-4">
          <VersionPublishForm agent={agent} onPublished={onChanged} />
        </div>
      )}

      {expanded === "reviews" && (
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
                <button
                  onClick={() => likeReview(idx)}
                  disabled={likeBusy === idx || agent.chainAgentId === undefined}
                  className="flex items-center gap-1 hover:text-white disabled:opacity-50"
                >
                  {likeBusy === idx ? <Loader2 className="h-3 w-3 animate-spin" /> : <ThumbsUp className="h-3 w-3" />} {r.likes}
                </button>
              </div>
            </div>
          ))}
          {likeError && <p className="text-xs text-red-300">{likeError}</p>}
          <p className="text-xs text-ink-faint">
            Reported reviews are moderated by BotChain admins (Session 5 admin panel) — creators can view and like, not remove.
          </p>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { address, connect, connecting, hasProvider, getSigner } = useWallet();
  const [allAgents, setAllAgents] = useState<Agent[] | null>(null);
  const [withdrawable, setWithdrawable] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawMessage, setWithdrawMessage] = useState<string | null>(null);

  async function refreshAgents() {
    const agents = await getAllAgents();
    setAllAgents(agents);
  }

  useEffect(() => {
    refreshAgents();
  }, []);

  useEffect(() => {
    if (!address || !isChainConfigured()) {
      setWithdrawable(null);
      return;
    }
    getContract("Payments", getReadProvider())
      .withdrawable(address)
      .then((v: bigint) => setWithdrawable(formatEther(v)))
      .catch(() => setWithdrawable(null));
  }, [address, allAgents]);

  const myAgents = useMemo(() => {
    if (!allAgents || !address) return [];
    return allAgents.filter((a) => a.source === "chain" && a.creatorAddress.toLowerCase() === address.toLowerCase());
  }, [allAgents, address]);

  const demoPreview = isChainConfigured() ? [] : (allAgents ?? []).slice(0, 3);

  async function handleWithdraw() {
    setWithdrawing(true);
    setWithdrawMessage(null);
    try {
      const signer = await getSigner();
      const payments = getContract("Payments", signer);
      const tx = await payments.withdraw();
      await tx.wait();
      setWithdrawMessage("Withdrawal confirmed.");
      setWithdrawable("0.0");
    } catch (err) {
      const anyErr = err as { shortMessage?: string; message?: string };
      setWithdrawMessage(anyErr.shortMessage || anyErr.message || "Withdrawal failed.");
    } finally {
      setWithdrawing(false);
    }
  }

  if (!address) {
    return (
      <div className="mx-auto max-w-md px-4 py-28 text-center sm:px-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-signal-gradient">
          <Wallet className="h-5 w-5 text-white" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-semibold text-ink">Connect your wallet</h1>
        <p className="mt-2 text-sm text-ink-dim">
          Your dashboard shows the agents you've registered, revenue you can withdraw,
          and your reviews — all keyed to your connected address.
        </p>
        <Button className="mt-6" size="lg" onClick={connect} disabled={connecting}>
          <Wallet className="h-4 w-4" /> {connecting ? "Connecting…" : hasProvider ? "Connect wallet" : "Install a wallet to continue"}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Creator dashboard</h1>
          <p className="mt-1 font-mono text-xs text-ink-faint">{truncateAddress(address, 6)}</p>
        </div>
        <Link href="/register">
          <Button size="sm" variant="secondary">Register another agent</Button>
        </Link>
      </div>

      {/* Withdrawable balance */}
      <div className="glass mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal-gradient/20">
            <Coins className="h-5 w-5 text-signal-cyan" />
          </div>
          <div>
            <div className="text-xs text-ink-faint">Withdrawable balance</div>
            <div className="font-display text-lg font-semibold text-ink">
              {!isChainConfigured() ? "—" : withdrawable === null ? "…" : `${Number(withdrawable).toFixed(4)} Ξ`}
            </div>
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleWithdraw}
          disabled={!isChainConfigured() || withdrawing || !withdrawable || Number(withdrawable) === 0}
        >
          {withdrawing ? <><Loader2 className="h-4 w-4 animate-spin" /> Withdrawing…</> : "Withdraw"}
        </Button>
      </div>
      {withdrawMessage && <p className="mt-2 text-xs text-ink-dim">{withdrawMessage}</p>}
      {!isChainConfigured() && (
        <p className="mt-2 text-xs text-ink-faint">
          Demo mode — no contracts configured, so there's no real balance to show or withdraw.
        </p>
      )}

      {/* My Agents */}
      <h2 className="mt-10 font-display text-lg font-semibold text-ink">My agents</h2>
      <div className="mt-4 space-y-4">
        {allAgents === null && (
          <div className="flex items-center gap-2 text-sm text-ink-dim">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your agents…
          </div>
        )}

        {allAgents !== null && myAgents.length === 0 && demoPreview.length === 0 && (
          <p className="text-sm text-ink-dim">
            No agents registered to this wallet yet.{" "}
            <Link href="/register" className="text-signal-cyan hover:underline">Register your first one.</Link>
          </p>
        )}

        {allAgents !== null && myAgents.length === 0 && demoPreview.length > 0 && (
          <>
            <p className="rounded-lg border border-signal-purple/30 bg-signal-purple/10 px-3 py-2 text-xs text-signal-purple">
              Demo mode — no contracts configured, so nothing here is actually tied to your wallet.
              Here's what this section looks like with agents in it:
            </p>
            {demoPreview.map((agent) => (
              <AgentRow key={agent.id} agent={agent} onChanged={refreshAgents} />
            ))}
          </>
        )}

        {myAgents.map((agent) => (
          <AgentRow key={agent.id} agent={agent} onChanged={refreshAgents} />
        ))}
      </div>
    </div>
  );
}
