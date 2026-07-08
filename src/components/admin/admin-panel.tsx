"use client";

import { useState } from "react";
import { ShieldAlert, Wallet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/wallet-context";
import { useAdminStatus } from "@/lib/admin";
import { truncateAddress } from "@/lib/utils";
import { AdminAnalytics } from "@/components/admin/admin-analytics";
import { AgentModeration } from "@/components/admin/agent-moderation";
import type { Agent } from "@/types";
import type { Curation } from "@/data/curation-store";

export function AdminPanel({ agents, initialCuration }: { agents: Agent[]; initialCuration: Curation }) {
  const { connect, connecting } = useWallet();
  const { status, ownerAddress } = useAdminStatus();
  const [tab, setTab] = useState<"analytics" | "moderation">("analytics");

  if (status === "not-configured") {
    return (
      <div className="mx-auto max-w-md px-4 py-28 text-center sm:px-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-signal-gradient">
          <ShieldAlert className="h-5 w-5 text-white" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-semibold text-ink">Demo mode</h1>
        <p className="mt-2 text-sm text-ink-dim">
          No contracts are configured, so there's no on-chain owner to authorize. Deploy the contracts
          and set the addresses in <code>.env.local</code> to unlock the admin panel.
        </p>
      </div>
    );
  }

  if (status === "checking") {
    return (
      <div className="mx-auto max-w-md px-4 py-28 text-center sm:px-6">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-ink-faint" />
      </div>
    );
  }

  if (status === "not-connected") {
    return (
      <div className="mx-auto max-w-md px-4 py-28 text-center sm:px-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-signal-gradient">
          <Wallet className="h-5 w-5 text-white" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-semibold text-ink">Connect the admin wallet</h1>
        <p className="mt-2 text-sm text-ink-dim">
          The admin panel is restricted to the address that deployed the contracts.
        </p>
        <Button className="mt-6" size="lg" onClick={connect} disabled={connecting}>
          <Wallet className="h-4 w-4" /> {connecting ? "Connecting…" : "Connect wallet"}
        </Button>
      </div>
    );
  }

  if (status === "unauthorized") {
    return (
      <div className="mx-auto max-w-md px-4 py-28 text-center sm:px-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-signal-gradient">
          <ShieldAlert className="h-5 w-5 text-white" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-semibold text-ink">Not authorized</h1>
        <p className="mt-2 text-sm text-ink-dim">
          Your connected wallet isn&apos;t the contracts&apos; owner.
          {ownerAddress && (
            <>
              {" "}Switch to <span className="font-mono text-ink">{truncateAddress(ownerAddress, 6)}</span> to
              access moderation and platform controls.
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Admin</h1>
          <p className="mt-1 font-mono text-xs text-ink-faint">
            Owner wallet — {truncateAddress(ownerAddress ?? "", 6)}
          </p>
        </div>
        <div className="flex gap-2 rounded-xl border border-border p-1">
          {(["analytics", "moderation"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-sm capitalize transition-colors ${
                tab === t ? "bg-signal-purple/15 text-white" : "text-ink-dim hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        {tab === "analytics" ? (
          <AdminAnalytics agents={agents} />
        ) : (
          <AgentModeration agents={agents} initialCuration={initialCuration} />
        )}
      </div>
    </div>
  );
}
