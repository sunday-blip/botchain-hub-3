/**
 * Chain configuration for Session 3.
 *
 * BotChain Hub can run in two modes, and every part of the data/contract
 * layer built this session checks `isChainConfigured()` before touching
 * the network:
 *
 *  - DEMO MODE (default, nothing below configured): the app runs entirely
 *    off the deterministic mock catalog from Session 1
 *    (`src/data/mock-agents.ts`). This is what a hackathon judge sees if
 *    they clone the repo and run `npm run dev` with no wallet, no RPC, and
 *    no deployed contracts.
 *  - LIVE MODE: once `npm run deploy:local` (or a real testnet deploy) has
 *    written a file into `deployments/`, drop those seven addresses into
 *    `.env.local` (see `.env.example`) and the exact same UI reads/writes
 *    through `src/lib/contracts.ts` instead.
 *
 * Nothing in the component tree needs to know which mode it's in — that's
 * the whole point of keeping this check in one place.
 */

export const CONTRACT_NAMES = [
  "AgentNFT",
  "AgentRegistry",
  "VersionControl",
  "Reputation",
  "Payments",
  "Marketplace",
  "Review",
] as const;

export type ContractName = (typeof CONTRACT_NAMES)[number];

export type ContractAddresses = Record<ContractName, string>;

const RAW_ADDRESSES: Record<ContractName, string | undefined> = {
  AgentNFT: process.env.NEXT_PUBLIC_AGENT_NFT_ADDRESS,
  AgentRegistry: process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS,
  VersionControl: process.env.NEXT_PUBLIC_VERSION_CONTROL_ADDRESS,
  Reputation: process.env.NEXT_PUBLIC_REPUTATION_ADDRESS,
  Payments: process.env.NEXT_PUBLIC_PAYMENTS_ADDRESS,
  Marketplace: process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS,
  Review: process.env.NEXT_PUBLIC_REVIEW_ADDRESS,
};

/** RPC endpoint used for read-only chain calls (server components + client fallback). */
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";

/** Chain the app expects the wallet to be connected to. Defaults to the local Hardhat node. */
export const EXPECTED_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 31337);

export const EXPECTED_CHAIN_NAME = process.env.NEXT_PUBLIC_CHAIN_NAME || "Hardhat Local";

/**
 * True only when every contract address is set. Session 3 treats this as
 * an all-or-nothing switch since the seven contracts are only useful
 * wired together (see CONTRACTS.md deployment order).
 */
export function isChainConfigured(): boolean {
  return CONTRACT_NAMES.every((name) => Boolean(RAW_ADDRESSES[name]));
}

export function getContractAddresses(): ContractAddresses {
  if (!isChainConfigured()) {
    throw new Error(
      "BotChain Hub is running in demo mode — no contract addresses are configured. " +
        "Deploy the contracts (npm run deploy:local) and set the NEXT_PUBLIC_*_ADDRESS " +
        "vars in .env.local to switch to live mode."
    );
  }
  return RAW_ADDRESSES as ContractAddresses;
}

export function getContractAddress(name: ContractName): string {
  return getContractAddresses()[name];
}
