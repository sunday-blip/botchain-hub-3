/**
 * Signature-based auth for admin write actions (curation, and any future
 * admin-only API route that isn't already enforced by an on-chain
 * `onlyOwner` modifier).
 *
 * Session 5 originally shipped `/api/admin/curation` checking only that
 * the submitted `address` matched `AgentRegistry.owner()` — anyone who
 * knew the owner's address could spoof that specific request (the actual
 * on-chain writes were never at risk; they're separately enforced by
 * `onlyOwner`). This closes that gap: the client signs a message with the
 * connected wallet (`personal_sign`), and the server recovers the signer
 * from that signature instead of trusting a plain address field.
 *
 * This file has no `fs`/Node-only imports on purpose — it's imported from
 * both a "use client" component (to sign) and a Route Handler (to
 * verify), and needs to work in both bundles.
 */

/** How long a signed action stays valid. Kept short since re-signing is one wallet popup away. */
export const ADMIN_AUTH_MAX_AGE_MS = 5 * 60 * 1000;

/** How far into the future a timestamp is tolerated, to allow for small clock skew between browser and server. */
export const ADMIN_AUTH_CLOCK_SKEW_MS = 30 * 1000;

export interface CurationActionPayload {
  agentId: string;
  field: "featured" | "trending";
  on: boolean;
  timestamp: number;
}

/**
 * Deterministic, human-readable message the wallet actually shows in the
 * MetaMask signing prompt — every field that matters to the action is in
 * here so a signature can't be replayed against a different agent/field/
 * value than the one the person approved.
 */
export function buildCurationAuthMessage(payload: CurationActionPayload): string {
  return [
    "BotChain Hub admin action",
    `field: ${payload.field}`,
    `agentId: ${payload.agentId}`,
    `on: ${payload.on}`,
    `timestamp: ${payload.timestamp}`,
  ].join("\n");
}

/** True if a client-supplied timestamp is neither expired nor suspiciously far in the future. */
export function isTimestampFresh(timestamp: number, now: number = Date.now()): boolean {
  const age = now - timestamp;
  return age <= ADMIN_AUTH_MAX_AGE_MS && age >= -ADMIN_AUTH_CLOCK_SKEW_MS;
}
