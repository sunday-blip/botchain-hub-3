export type AgentCategory =
  | "Writing"
  | "Research"
  | "Trading"
  | "Education"
  | "Healthcare"
  | "Programming"
  | "Marketing"
  | "Customer Support"
  | "Finance"
  | "Crypto"
  | "Productivity"
  | "Image Generation"
  | "Video"
  | "Voice"
  | "Automation"
  | "Custom";

export type PricingModel = "one-time" | "subscription" | "free" | "donation";

export interface PricingInfo {
  model: PricingModel;
  amountEth: number;
  intervalDays?: number;
}

export interface VersionEntry {
  version: string;
  publishedAt: string;
  changelog: string;
}

export interface Review {
  id: string;
  authorAddress: string;
  authorEns?: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
  likes: number;
  reported?: boolean;
}

export interface TrustScoreBreakdown {
  completedJobs: number;
  averageRating: number;
  walletAgeDays: number;
  verifiedCreator: boolean;
  uniqueUsers: number;
  score: number; // 0-100 computed
}

export interface Agent {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  creatorAddress: string;
  creatorEns?: string;
  category: AgentCategory;
  tags: string[];
  capabilities: string[];
  pricing: PricingInfo;
  version: string;
  versionHistory: VersionEntry[];
  usageCount: number;
  revenueEth: number;
  followers: number;
  verified: boolean;
  featured: boolean;
  trending: boolean;
  createdAt: string;
  updatedAt: string;
  status: "active" | "paused" | "unpublished";
  trustScore: TrustScoreBreakdown;
  reviews: Review[];
  contractAddress: string;
  ipfsHash: string;
  /**
   * Session 3: where this record came from. "chain" means every field on
   * this object was read from the deployed contracts + IPFS, and actions
   * like "Hire agent" will send a real transaction. "mock" means it's from
   * the Session 1 demo catalog — the UI still renders identically, but
   * write actions are disabled with an explanation instead of silently
   * doing nothing.
   */
  source: "chain" | "mock";
  /** Numeric id used on-chain (AgentRegistry/Marketplace/etc all key off this). Only present when source is "chain". */
  chainAgentId?: number;
}

export interface WalletState {
  address: string | null;
  chainId: number | null;
  balanceEth: string | null;
  connecting: boolean;
  /** True once we've checked for a wallet and there isn't one (MetaMask, etc). */
  hasProvider: boolean;
  /** Set when `connect()` throws — e.g. user rejects the request. */
  error: string | null;
}

export interface Transaction {
  id: string;
  agentId: string;
  agentName: string;
  type: "purchase" | "subscription" | "withdrawal" | "donation";
  amountEth: number;
  from: string;
  to: string;
  timestamp: string;
  txHash: string;
}

/** Working state for the 5-step register wizard (src/app/register). */
export interface AgentDraft {
  name: string;
  category: AgentCategory | "";
  tagline: string;
  description: string;
  capabilities: string[];
  apiEndpoint: string;
  pricingModel: PricingModel;
  priceEth: number;
  intervalDays: number;
  logoFile: File | null;
  bannerFile: File | null;
}

export interface NotificationItem {
  id: string;
  type:
    | "payment_received"
    | "review_received"
    | "version_updated"
    | "agent_purchased"
    | "new_follower";
  message: string;
  timestamp: string;
  read: boolean;
}

/**
 * Session 4: Agent Battles. There's no on-chain Battle contract in the
 * Session 2 scope, so battles/votes live in a small server-side JSON
 * store (`src/data/battles-store.ts`) rather than a contract — see
 * SESSION4.md for why, and what a real on-chain version would need.
 */
export interface Battle {
  id: string;
  task: string;
  category: AgentCategory;
  agentA: { id: string; name: string; logoUrl: string; slug: string };
  agentB: { id: string; name: string; logoUrl: string; slug: string };
  votesA: number;
  votesB: number;
  voters: string[]; // lowercased addresses that have voted, one entry per voter
  createdAt: string;
  status: "voting" | "concluded";
}

