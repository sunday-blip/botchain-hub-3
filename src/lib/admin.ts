"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/contexts/wallet-context";
import { getContract, getReadProvider } from "@/lib/contracts";
import { isChainConfigured } from "@/config/chain";

export type AdminStatus = "checking" | "not-connected" | "not-configured" | "unauthorized" | "authorized";

/**
 * Every Ownable contract in this stack (AgentRegistry, Reputation, Review,
 * Payments) shares the same deployer address as `owner()` — see
 * scripts/deploy.ts. AgentRegistry is used here as the canonical check
 * since it's the identity contract everything else reads from.
 */
export function useAdminStatus(): { status: AdminStatus; ownerAddress: string | null } {
  const { address } = useWallet();
  const [ownerAddress, setOwnerAddress] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isChainConfigured()) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    getContract("AgentRegistry", getReadProvider())
      .owner()
      .then((owner: string) => {
        if (!cancelled) setOwnerAddress(owner);
      })
      .catch(() => {
        if (!cancelled) setOwnerAddress(null);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isChainConfigured()) return { status: "not-configured", ownerAddress: null };
  if (checking) return { status: "checking", ownerAddress };
  if (!address) return { status: "not-connected", ownerAddress };
  if (!ownerAddress || ownerAddress.toLowerCase() !== address.toLowerCase()) {
    return { status: "unauthorized", ownerAddress };
  }
  return { status: "authorized", ownerAddress };
}
