"use client";

import { useState } from "react";
import { Loader2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/wallet-context";
import { getContract } from "@/lib/contracts";
import { pinJson } from "@/lib/ipfs";
import type { Agent } from "@/types";

export function VersionPublishForm({ agent, onPublished }: { agent: Agent; onPublished: () => void }) {
  const { getSigner } = useWallet();
  const [version, setVersion] = useState("");
  const [changelog, setChangelog] = useState("");
  const [status, setStatus] = useState<"idle" | "pinning" | "publishing" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handlePublish() {
    if (!version.trim() || !changelog.trim()) {
      setStatus("error");
      setMessage("Version and changelog are both required.");
      return;
    }
    if (agent.chainAgentId === undefined) {
      setStatus("error");
      setMessage("This is a demo-catalog agent — there's nothing on-chain to publish a version to.");
      return;
    }

    try {
      setStatus("pinning");
      setMessage("Pinning version metadata to IPFS…");
      const pinned = await pinJson({ version: version.trim(), changelog: changelog.trim(), publishedAt: new Date().toISOString() });

      setStatus("publishing");
      setMessage("Confirm the transaction in your wallet…");
      const signer = await getSigner();
      const versionControl = getContract("VersionControl", signer);
      const tx = await versionControl.pushVersion(agent.chainAgentId, version.trim(), changelog.trim(), pinned.cid);
      await tx.wait();

      setStatus("done");
      setMessage(`v${version.trim()} published.`);
      setVersion("");
      setChangelog("");
      onPublished();
    } catch (err) {
      const anyErr = err as { shortMessage?: string; message?: string };
      setStatus("error");
      setMessage(anyErr.shortMessage || anyErr.message || "Publish failed.");
    }
  }

  const busy = status === "pinning" || status === "publishing";

  return (
    <div className="space-y-3 rounded-xl border border-white/10 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder={`e.g. ${bumpSuggestion(agent.version)}`}
          className="input sm:col-span-1"
        />
        <input
          value={changelog}
          onChange={(e) => setChangelog(e.target.value)}
          placeholder="What changed in this version?"
          className="input sm:col-span-2"
        />
      </div>
      <div className="flex items-center justify-between">
        <Button size="sm" onClick={handlePublish} disabled={busy}>
          {busy ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {message}</> : <><Rocket className="h-3.5 w-3.5" /> Publish version</>}
        </Button>
        {status === "done" && <span className="text-xs text-signal-cyan">{message}</span>}
        {status === "error" && <span className="text-xs text-red-300">{message}</span>}
      </div>
    </div>
  );
}

function bumpSuggestion(current: string): string {
  const parts = current.split(".").map(Number);
  if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
    return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
  }
  return "1.0.1";
}
