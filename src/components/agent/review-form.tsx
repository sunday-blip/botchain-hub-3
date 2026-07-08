"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/wallet-context";
import { getContract, getReadProvider } from "@/lib/contracts";
import { isChainConfigured } from "@/config/chain";
import type { Agent } from "@/types";

type Eligibility = "checking" | "eligible" | "already-reviewed" | "no-access" | "not-connected" | "demo";

export function ReviewForm({ agent }: { agent: Agent }) {
  const router = useRouter();
  const { address, connect, connecting, getSigner } = useWallet();
  const [eligibility, setEligibility] = useState<Eligibility>("checking");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const isLive = agent.source === "chain" && agent.chainAgentId !== undefined && isChainConfigured();

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!isLive) {
        setEligibility("demo");
        return;
      }
      if (!address) {
        setEligibility("not-connected");
        return;
      }
      setEligibility("checking");
      try {
        const provider = getReadProvider();
        const marketplace = getContract("Marketplace", provider);
        const review = getContract("Review", provider);
        const agentId = agent.chainAgentId as number;
        const [hasAccess, already] = await Promise.all([
          marketplace.hasActiveAccess(address, agentId),
          review.hasReviewed(agentId, address),
        ]);
        if (cancelled) return;
        if (already) setEligibility("already-reviewed");
        else if (!hasAccess) setEligibility("no-access");
        else setEligibility("eligible");
      } catch {
        if (!cancelled) setEligibility("no-access");
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [address, agent.chainAgentId, isLive]);

  async function submit() {
    if (!comment.trim()) {
      setStatus("error");
      setMessage("Say a little about your experience before submitting.");
      return;
    }
    setStatus("submitting");
    setMessage(null);
    try {
      const signer = await getSigner();
      const review = getContract("Review", signer);
      const tx = await review.submitReview(agent.chainAgentId, rating, comment.trim());
      await tx.wait();
      setStatus("done");
      setComment("");
      setEligibility("already-reviewed");
      router.refresh();
    } catch (err) {
      const anyErr = err as { shortMessage?: string; message?: string };
      setStatus("error");
      setMessage(anyErr.shortMessage || anyErr.message || "Couldn't submit that review.");
    }
  }

  if (eligibility === "demo") {
    return (
      <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-ink-faint">
        This is a demo-catalog agent, so there's nothing on-chain to review. Hire (or register) a live
        agent to leave a real review.
      </p>
    );
  }

  if (eligibility === "not-connected") {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <p className="text-xs text-ink-dim">Connect your wallet to leave a review.</p>
        <Button size="sm" className="mt-2" onClick={connect} disabled={connecting}>
          {connecting ? "Connecting…" : "Connect wallet"}
        </Button>
      </div>
    );
  }

  if (eligibility === "checking") {
    return (
      <p className="flex items-center gap-2 text-xs text-ink-faint">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking review eligibility…
      </p>
    );
  }

  if (eligibility === "already-reviewed") {
    return (
      <p className="rounded-xl border border-signal-cyan/30 bg-signal-cyan/10 px-4 py-3 text-xs text-signal-cyan">
        {status === "done" ? "Review submitted — thanks!" : "You've already reviewed this agent."}
      </p>
    );
  }

  if (eligibility === "no-access") {
    return (
      <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-ink-faint">
        Only wallets with active access to this agent (a completed purchase or an active
        subscription) can leave a review.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 p-4">
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setRating(i + 1)}
            aria-label={`${i + 1} star${i === 0 ? "" : "s"}`}
          >
            <Star className={`h-5 w-5 ${i < rating ? "fill-signal-cyan text-signal-cyan" : "text-white/15"}`} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="How did this agent do?"
        className="input mt-3 resize-none"
      />
      <div className="mt-3 flex items-center justify-between">
        <Button size="sm" onClick={submit} disabled={status === "submitting"}>
          {status === "submitting" ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting…</>
          ) : (
            <><Send className="h-3.5 w-3.5" /> Submit review</>
          )}
        </Button>
        {status === "error" && message && <span className="text-xs text-red-300">{message}</span>}
      </div>
    </div>
  );
}
