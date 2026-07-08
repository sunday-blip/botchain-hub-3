"use client";

import { useState } from "react";
import { parseEther } from "ethers";
import { Wallet, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/wallet-context";
import { getContract } from "@/lib/contracts";
import { isChainConfigured } from "@/config/chain";
import { formatEth } from "@/lib/utils";
import type { Agent } from "@/types";

type Status = "idle" | "pending" | "success" | "error";

export function HireButton({ agent }: { agent: Agent }) {
  const { address, connect, connecting, getSigner, isWrongNetwork, switchToExpectedNetwork } = useWallet();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const isLive = agent.source === "chain" && agent.chainAgentId !== undefined && isChainConfigured();

  async function handleHire() {
    if (!address) {
      await connect();
      return;
    }
    if (isWrongNetwork) {
      await switchToExpectedNetwork();
      return;
    }
    if (!isLive) {
      setMessage(
        "This is a demo-mode agent (no deployed contracts configured), so there's nothing to actually hire yet. Register a live agent, or deploy the contracts and set the addresses in .env.local."
      );
      setStatus("error");
      return;
    }

    setStatus("pending");
    setMessage(null);
    try {
      const signer = await getSigner();
      const marketplace = getContract("Marketplace", signer);
      const agentId = agent.chainAgentId as number;

      let tx;
      if (agent.pricing.model === "free") {
        tx = await marketplace.useFreeAgent(agentId);
      } else if (agent.pricing.model === "subscription") {
        tx = await marketplace.subscribe(agentId, { value: parseEther(agent.pricing.amountEth.toString()) });
      } else {
        // one-time or donation
        tx = await marketplace.purchase(agentId, { value: parseEther(agent.pricing.amountEth.toString()) });
      }
      await tx.wait();
      setStatus("success");
      setMessage("Access granted — this transaction is now on-chain.");
    } catch (err) {
      setStatus("error");
      const anyErr = err as { shortMessage?: string; message?: string };
      setMessage(anyErr.shortMessage || anyErr.message || "Transaction failed.");
    }
  }

  return (
    <div className="relative">
      <Button size="lg" onClick={handleHire} disabled={status === "pending" || connecting}>
        {status === "pending" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Confirming…
          </>
        ) : status === "success" ? (
          <>
            <CheckCircle2 className="h-4 w-4" /> Access granted
          </>
        ) : !address ? (
          <>
            <Wallet className="h-4 w-4" /> Connect to hire · {formatEth(agent.pricing.amountEth)}
          </>
        ) : isWrongNetwork ? (
          "Switch network to hire"
        ) : (
          `Hire agent · ${formatEth(agent.pricing.amountEth)}`
        )}
      </Button>
      {message && (
        <div
          className={`absolute right-0 top-full mt-2 w-72 rounded-lg border px-3 py-2 text-xs shadow-glow ${
            status === "error"
              ? "border-red-500/30 bg-red-500/10 text-red-200"
              : "border-white/10 bg-surface text-ink-dim"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
