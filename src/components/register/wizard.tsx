"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  UploadCloud,
  Wallet,
  X,
} from "lucide-react";
import { parseEther } from "ethers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/contexts/wallet-context";
import { getContract } from "@/lib/contracts";
import { pinJson, pinFile, isIpfsConfigured } from "@/lib/ipfs";
import { isChainConfigured } from "@/config/chain";
import { PRICING_MODEL_TO_ENUM } from "@/lib/abis";
import { cn } from "@/lib/utils";
import type { AgentCategory, AgentDraft } from "@/types";
import type { AgentMetadata } from "@/data/chain-agents";

const CATEGORY_OPTIONS: AgentCategory[] = [
  "Writing", "Research", "Trading", "Education", "Healthcare",
  "Programming", "Marketing", "Customer Support", "Finance",
  "Crypto", "Productivity", "Image Generation", "Video", "Voice",
  "Automation", "Custom",
];

const STEPS = ["Basics", "Capabilities", "Pricing", "Media", "Mint"] as const;

const EMPTY_DRAFT: AgentDraft = {
  name: "",
  category: "",
  tagline: "",
  description: "",
  capabilities: [],
  apiEndpoint: "",
  pricingModel: "one-time",
  priceEth: 0.01,
  intervalDays: 30,
  logoFile: null,
  bannerFile: null,
};

type MintPhase = "idle" | "pinning" | "minting" | "listing" | "done" | "error";

export function RegisterWizard() {
  const router = useRouter();
  const { address, connect, connecting, getSigner, isWrongNetwork, switchToExpectedNetwork } = useWallet();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<AgentDraft>(EMPTY_DRAFT);
  const [capabilityInput, setCapabilityInput] = useState("");
  const [phase, setPhase] = useState<MintPhase>("idle");
  const [phaseMessage, setPhaseMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{ agentId?: string; slug?: string; demo: boolean } | null>(null);

  function update<K extends keyof AgentDraft>(key: K, value: AgentDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  const canAdvance: Record<number, boolean> = {
    0: Boolean(draft.name.trim() && draft.category && draft.tagline.trim() && draft.description.trim()),
    1: draft.capabilities.length > 0,
    2: draft.pricingModel === "free" || draft.priceEth > 0,
    3: true, // media is optional
    4: false, // final step submits instead of advancing
  };

  function addCapability() {
    const value = capabilityInput.trim();
    if (!value || draft.capabilities.includes(value)) return;
    update("capabilities", [...draft.capabilities, value]);
    setCapabilityInput("");
  }

  async function handleMint() {
    setPhase("pinning");
    setPhaseMessage("Pinning logo, banner, and metadata to IPFS…");
    try {
      const [logo, banner] = await Promise.all([
        draft.logoFile ? pinFile(draft.logoFile) : Promise.resolve(null),
        draft.bannerFile ? pinFile(draft.bannerFile) : Promise.resolve(null),
      ]);

      const metadata: AgentMetadata = {
        name: draft.name,
        tagline: draft.tagline,
        description: draft.description,
        category: draft.category as AgentCategory,
        capabilities: draft.capabilities,
        apiEndpoint: draft.apiEndpoint || undefined,
        logoCid: logo?.cid,
        bannerCid: banner?.cid,
      };
      const pinned = await pinJson(metadata);
      const demo = pinned.demo || !isChainConfigured();

      if (!isChainConfigured()) {
        // No deployed contracts to talk to — simulate the mint so the
        // wizard still demonstrates the full flow end to end.
        setPhase("minting");
        setPhaseMessage("Demo mode: no contracts configured — simulating the mint transaction…");
        await new Promise((r) => setTimeout(r, 900));
        setResult({ demo: true, slug: draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") });
        setPhase("done");
        return;
      }

      if (!address) {
        await connect();
      }
      if (isWrongNetwork) {
        await switchToExpectedNetwork();
        setPhase("error");
        setPhaseMessage("Switch to the right network in your wallet, then try minting again.");
        return;
      }

      setPhase("minting");
      setPhaseMessage("Confirm the registration transaction in your wallet…");
      const signer = await getSigner();
      const registry = getContract("AgentRegistry", signer);
      const tx = await registry.register(pinned.cid, draft.category);
      const receipt = await tx.wait();

      const registeredEvent = receipt.logs
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((log: any) => {
          try {
            return registry.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .find((parsed: any) => parsed?.name === "AgentRegistered");
      const agentId: string | undefined = registeredEvent?.args?.agentId?.toString();

      if (agentId && draft.pricingModel) {
        setPhase("listing");
        setPhaseMessage("Creating the marketplace listing…");
        const marketplace = getContract("Marketplace", signer);
        const listingTx = await marketplace.createOrUpdateListing(
          agentId,
          PRICING_MODEL_TO_ENUM[draft.pricingModel],
          draft.pricingModel === "free" ? 0n : parseEther(draft.priceEth.toString()),
          draft.pricingModel === "subscription" ? draft.intervalDays : 0
        );
        await listingTx.wait();
      }

      setResult({ demo, agentId, slug: draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") });
      setPhase("done");
    } catch (err) {
      const anyErr = err as { shortMessage?: string; message?: string };
      setPhase("error");
      setPhaseMessage(anyErr.shortMessage || anyErr.message || "Something went wrong. Please try again.");
    }
  }

  if (phase === "done" && result) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-signal-gradient">
          <Check className="h-6 w-6 text-white" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-semibold text-ink">
          {result.demo ? "Registration simulated" : "Agent registered on-chain"}
        </h1>
        <p className="mt-3 text-sm text-ink-dim">
          {result.demo
            ? "This ran in demo mode — no contracts are deployed/configured, so nothing was actually written on-chain. Deploy the contracts and set the addresses in .env.local to mint for real."
            : `${draft.name} now has an on-chain identity${result.agentId ? ` (agent #${result.agentId})` : ""}, with its metadata pinned to IPFS and a live marketplace listing.`}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button variant="secondary" onClick={() => router.push("/marketplace")}>
            Browse marketplace
          </Button>
          <Button onClick={() => { setDraft(EMPTY_DRAFT); setResult(null); setPhase("idle"); setStep(0); }}>
            Register another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="font-display text-3xl font-semibold text-ink">Register your agent</h1>
        <p className="mt-2 text-sm text-ink-dim">
          A 5-step wizard that mints your agent&apos;s on-chain identity and pins its metadata to IPFS.
        </p>
        {!isChainConfigured() && (
          <p className="mx-auto mt-3 max-w-md rounded-lg border border-signal-purple/30 bg-signal-purple/10 px-3 py-2 text-xs text-signal-purple">
            Demo mode — no contracts configured. You can still walk through every step; the final mint will be simulated.
          </p>
        )}
        {isChainConfigured() && !isIpfsConfigured() && (
          <p className="mx-auto mt-3 max-w-md rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-ink-dim">
            No Pinata key configured — metadata will be pinned with a demo CID instead of real IPFS.
          </p>
        )}
      </div>

      {/* Step indicator */}
      <div className="mt-8 flex items-center justify-between">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium",
                  i < step
                    ? "border-signal-cyan bg-signal-cyan/15 text-signal-cyan"
                    : i === step
                    ? "border-signal-purple bg-signal-purple/15 text-white"
                    : "border-border text-ink-faint"
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn("text-[11px]", i === step ? "text-ink" : "text-ink-faint")}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("mx-2 h-px flex-1", i < step ? "bg-signal-cyan/40" : "bg-border")} />
            )}
          </div>
        ))}
      </div>

      <div className="glass mt-8 rounded-2xl p-6">
        {step === 0 && (
          <div className="space-y-4">
            <Field label="Agent name">
              <input
                value={draft.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Scribe Prime"
                className="input"
              />
            </Field>
            <Field label="Category">
              <select
                value={draft.category}
                onChange={(e) => update("category", e.target.value as AgentCategory)}
                className="input"
              >
                <option value="">Select a category…</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Tagline">
              <input
                value={draft.tagline}
                onChange={(e) => update("tagline", e.target.value)}
                placeholder="One line describing what it does"
                maxLength={80}
                className="input"
              />
            </Field>
            <Field label="Description">
              <textarea
                value={draft.description}
                onChange={(e) => update("description", e.target.value)}
                rows={4}
                placeholder="What does this agent do, and why should someone hire it?"
                className="input resize-none"
              />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Field label="Capabilities">
              <div className="flex gap-2">
                <input
                  value={capabilityInput}
                  onChange={(e) => setCapabilityInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCapability())}
                  placeholder="e.g. Streaming responses"
                  className="input"
                />
                <Button type="button" variant="secondary" onClick={addCapability}>Add</Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {draft.capabilities.map((c) => (
                  <Badge key={c} className="cursor-pointer" >
                    {c}
                    <button
                      onClick={() => update("capabilities", draft.capabilities.filter((x) => x !== c))}
                      aria-label={`Remove ${c}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {draft.capabilities.length === 0 && (
                  <p className="text-xs text-ink-faint">Add at least one capability.</p>
                )}
              </div>
            </Field>
            <Field label="API endpoint (optional)">
              <input
                value={draft.apiEndpoint}
                onChange={(e) => update("apiEndpoint", e.target.value)}
                placeholder="https://api.yourservice.com/v1/run"
                className="input"
              />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Field label="Pricing model">
              <div className="grid grid-cols-2 gap-2">
                {(["one-time", "subscription", "free", "donation"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => update("pricingModel", m)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-left text-sm capitalize transition-colors",
                      draft.pricingModel === m
                        ? "border-signal-purple bg-signal-purple/15 text-white"
                        : "border-border text-ink-dim hover:text-white"
                    )}
                  >
                    {m.replace("-", " ")}
                  </button>
                ))}
              </div>
            </Field>
            {draft.pricingModel !== "free" && (
              <Field label={draft.pricingModel === "donation" ? "Suggested amount (Ξ)" : "Price (Ξ)"}>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={draft.priceEth}
                  onChange={(e) => update("priceEth", Number(e.target.value))}
                  className="input"
                />
              </Field>
            )}
            {draft.pricingModel === "subscription" && (
              <Field label="Billing interval (days)">
                <input
                  type="number"
                  min="1"
                  value={draft.intervalDays}
                  onChange={(e) => update("intervalDays", Number(e.target.value))}
                  className="input"
                />
              </Field>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <FileField label="Logo" file={draft.logoFile} onChange={(f) => update("logoFile", f)} />
            <FileField label="Banner" file={draft.bannerFile} onChange={(f) => update("bannerFile", f)} />
            <p className="text-xs text-ink-faint">
              Both are optional — agents without one get a generated placeholder image.
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div className="rounded-xl bg-white/5 p-4 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-ink-faint">Name</span>
                <span className="text-ink">{draft.name}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-ink-faint">Category</span>
                <span className="text-ink">{draft.category}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-ink-faint">Capabilities</span>
                <span className="text-ink">{draft.capabilities.length}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-ink-faint">Pricing</span>
                <span className="text-ink capitalize">
                  {draft.pricingModel === "free" ? "Free" : `${draft.priceEth} Ξ · ${draft.pricingModel}`}
                </span>
              </div>
            </div>

            {!address && isChainConfigured() && (
              <Button className="w-full" onClick={connect} disabled={connecting}>
                <Wallet className="h-4 w-4" /> {connecting ? "Connecting…" : "Connect wallet to mint"}
              </Button>
            )}

            <Button className="w-full" size="lg" onClick={handleMint} disabled={phase === "pinning" || phase === "minting" || phase === "listing"}>
              {phase === "pinning" || phase === "minting" || phase === "listing" ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> {phaseMessage}</>
              ) : (
                <><UploadCloud className="h-4 w-4" /> Pin metadata &amp; mint agent</>
              )}
            </Button>

            {phase === "error" && phaseMessage && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {phaseMessage}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-between">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {step < STEPS.length - 1 && (
          <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={!canAdvance[step]}>
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-dim">{label}</span>
      {children}
    </label>
  );
}

function FileField({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  const preview = file ? URL.createObjectURL(file) : null;
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        {preview && (
          <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-white/10">
            <Image src={preview} alt="" fill unoptimized className="object-cover" />
          </div>
        )}
        <label className="glass glass-hover flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl text-sm text-ink-dim">
          <UploadCloud className="h-4 w-4" />
          {file ? file.name : `Upload ${label.toLowerCase()}`}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>
    </Field>
  );
}
