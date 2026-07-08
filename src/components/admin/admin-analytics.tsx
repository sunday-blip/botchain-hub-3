"use client";

import { useEffect, useMemo, useState } from "react";
import { formatEther } from "ethers";
import { Loader2, Coins, Activity, Users2, Percent } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/wallet-context";
import { getContract, getReadProvider } from "@/lib/contracts";
import type { Agent } from "@/types";

interface EventTotals {
  totalVolumeEth: number;
  totalFeesEth: number;
  txCount: number;
  byAgent: { agentId: string; name: string; volumeEth: number }[];
}

async function loadEventTotals(agents: Agent[]): Promise<EventTotals> {
  const payments = getContract("Payments", getReadProvider());
  const events = await payments.queryFilter(payments.filters.PaymentProcessed());

  const byAgentWei = new Map<string, bigint>();
  let totalVolume = 0n;
  let totalFees = 0n;

  for (const evt of events) {
    if (!("args" in evt) || !evt.args) continue;
    const { agentId, amount, fee } = evt.args as unknown as {
      agentId: bigint;
      amount: bigint;
      fee: bigint;
    };
    totalVolume += amount;
    totalFees += fee;
    const key = agentId.toString();
    byAgentWei.set(key, (byAgentWei.get(key) ?? 0n) + amount);
  }

  const nameByAgentId = new Map(agents.map((a) => [String(a.chainAgentId ?? ""), a.name]));

  const byAgent = Array.from(byAgentWei.entries())
    .map(([agentId, wei]) => ({
      agentId,
      name: nameByAgentId.get(agentId) ?? `Agent #${agentId}`,
      volumeEth: Number(formatEther(wei)),
    }))
    .sort((a, b) => b.volumeEth - a.volumeEth)
    .slice(0, 8);

  return {
    totalVolumeEth: Number(formatEther(totalVolume)),
    totalFeesEth: Number(formatEther(totalFees)),
    txCount: events.length,
    byAgent,
  };
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Coins; label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-xs text-ink-faint">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-2 font-display text-xl font-semibold text-ink">{value}</div>
    </div>
  );
}

export function AdminAnalytics({ agents }: { agents: Agent[] }) {
  const { getSigner } = useWallet();
  const [totals, setTotals] = useState<EventTotals | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feeBps, setFeeBpsState] = useState<number | null>(null);
  const [feeInput, setFeeInput] = useState("");
  const [feeStatus, setFeeStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [feeMessage, setFeeMessage] = useState<string | null>(null);

  const chainAgents = useMemo(() => agents.filter((a) => a.source === "chain"), [agents]);

  useEffect(() => {
    loadEventTotals(chainAgents)
      .then(setTotals)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load analytics."));

    getContract("Payments", getReadProvider())
      .feeBps()
      .then((v: bigint) => setFeeBpsState(Number(v)))
      .catch(() => setFeeBpsState(null));
  }, [chainAgents]);

  async function saveFee() {
    const bps = Number(feeInput);
    if (!Number.isFinite(bps) || bps < 0 || bps > 1000) {
      setFeeStatus("error");
      setFeeMessage("Fee must be between 0 and 1000 basis points (10% max, enforced on-chain).");
      return;
    }
    setFeeStatus("saving");
    setFeeMessage(null);
    try {
      const signer = await getSigner();
      const payments = getContract("Payments", signer);
      const tx = await payments.setFeeBps(bps);
      await tx.wait();
      setFeeBpsState(bps);
      setFeeStatus("done");
      setFeeMessage(`Platform fee updated to ${(bps / 100).toFixed(2)}%.`);
    } catch (err) {
      const anyErr = err as { shortMessage?: string; message?: string };
      setFeeStatus("error");
      setFeeMessage(anyErr.shortMessage || anyErr.message || "Failed to update fee.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Users2} label="Registered agents" value={String(chainAgents.length)} />
        <StatCard
          icon={Activity}
          label="On-chain transactions"
          value={totals ? String(totals.txCount) : "…"}
        />
        <StatCard
          icon={Coins}
          label="Total volume"
          value={totals ? `${totals.totalVolumeEth.toFixed(4)} Ξ` : "…"}
        />
        <StatCard
          icon={Percent}
          label="Platform fees collected"
          value={totals ? `${totals.totalFeesEth.toFixed(4)} Ξ` : "…"}
        />
      </div>
      {loadError && <p className="text-xs text-red-300">{loadError}</p>}

      <div className="glass rounded-2xl p-5">
        <h3 className="font-display text-sm font-semibold text-ink">Revenue by agent (top 8)</h3>
        {totals && totals.byAgent.length > 0 ? (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={totals.byAgent}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fill: "#a29fb0", fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fill: "#a29fb0", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#16142d", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 8 }}
                  labelStyle={{ color: "#f4f2fa" }}
                  formatter={(value: number) => [`${value.toFixed(4)} Ξ`, "Volume"]}
                />
                <Bar dataKey="volumeEth" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-dim">
            {totals ? "No paid transactions yet." : "Loading…"}
          </p>
        )}
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="font-display text-sm font-semibold text-ink">Platform fee</h3>
        <p className="mt-1 text-xs text-ink-faint">
          Current: {feeBps === null ? "…" : `${(feeBps / 100).toFixed(2)}% (${feeBps} bps)`} · 10% hard cap, enforced by <code>Payments.MAX_FEE_BPS</code>.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <input
            value={feeInput}
            onChange={(e) => setFeeInput(e.target.value)}
            placeholder="e.g. 250 for 2.5%"
            className="input w-40"
          />
          <Button size="sm" onClick={saveFee} disabled={feeStatus === "saving"}>
            {feeStatus === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Update fee"}
          </Button>
        </div>
        {feeMessage && (
          <p className={`mt-2 text-xs ${feeStatus === "error" ? "text-red-300" : "text-signal-cyan"}`}>{feeMessage}</p>
        )}
      </div>
    </div>
  );
}
