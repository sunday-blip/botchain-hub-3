/**
 * Live equivalent of `mock-agents.ts`. Reads the seven deployed contracts
 * plus each agent's pinned IPFS metadata and assembles the exact same
 * `Agent` shape the mock catalog produces, so every existing component
 * (AgentCard, the marketplace grid, the agent profile page) renders either
 * data source with zero changes — only `src/data/agents.ts`'s top-level
 * switch needs to know which one is active.
 *
 * `computeTrustScore`/`buildTrustScore` (src/lib/utils.ts) is untouched —
 * per CONTRACTS.md, Reputation.sol deliberately stores only the raw
 * counters (completedJobs, ratingSum/Count, uniqueUsers, verifiedCreator)
 * so that log-scaled formula keeps living here instead of costing gas
 * on-chain.
 */
import { getContract, getReadProvider } from "@/lib/contracts";
import { getContractAddress } from "@/config/chain";
import { fetchIpfsJson, ipfsGatewayUrl } from "@/lib/ipfs";
import { PRICING_ENUM_TO_MODEL, STATUS_ENUM_TO_LABEL } from "@/lib/abis";
import { buildTrustScore } from "@/lib/utils";
import type { Agent, AgentCategory, PricingModel, Review, VersionEntry } from "@/types";

/** Shape of the JSON pinned to IPFS by the register wizard (see src/app/register). */
export interface AgentMetadata {
  name: string;
  tagline: string;
  description: string;
  category: AgentCategory;
  capabilities: string[];
  apiEndpoint?: string;
  logoCid?: string;
  bannerCid?: string;
}

function slugify(name: string, id: number): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${id}`;
}

async function daysSince(timestampSeconds: bigint | number): Promise<number> {
  const ms = Number(timestampSeconds) * 1000;
  return Math.max(1, Math.floor((Date.now() - ms) / 86_400_000));
}

/** Assemble one full `Agent` from on-chain state + its IPFS metadata. */
export async function buildChainAgent(agentId: number): Promise<Agent | null> {
  const provider = getReadProvider();
  const registry = getContract("AgentRegistry", provider);
  const marketplace = getContract("Marketplace", provider);
  const reputation = getContract("Reputation", provider);
  const review = getContract("Review", provider);
  const versionControl = getContract("VersionControl", provider);

  const record = await registry.getAgent(agentId);
  if (!record || record.creator === "0x0000000000000000000000000000000000000000") return null;

  const [metadata, listing, stats, avgRatingScaled, chainReviews, versions] = await Promise.all([
    fetchIpfsJson<AgentMetadata>(record.ipfsHash).catch(() => null),
    marketplace.getListing(agentId).catch(() => null),
    reputation.getStats(agentId),
    reputation.averageRatingScaled(agentId),
    review.getReviews(agentId).catch(() => []),
    versionControl.getVersions(agentId).catch(() => []),
  ]);

  if (!metadata) return null; // metadata not reachable — skip rather than render a broken card

  const walletAgeDays = await daysSince(record.createdAt);
  const averageRating = Number(avgRatingScaled) / 100;
  const completedJobs = Number(stats.completedJobs);
  const uniqueUsers = Number(stats.uniqueUsers);

  const trustScore = buildTrustScore({
    completedJobs,
    averageRating,
    walletAgeDays,
    verifiedCreator: stats.verifiedCreator,
    uniqueUsers,
  });

  const pricingModel: PricingModel = listing?.exists
    ? PRICING_ENUM_TO_MODEL[Number(listing.model) as 0 | 1 | 2 | 3]
    : "free";
  const priceEth = listing?.exists ? Number(listing.priceWei) / 1e18 : 0;

  const versionHistory: VersionEntry[] = versions.length
    ? versions.map((v: { version: string; changelog: string; publishedAt: bigint }) => ({
        version: v.version,
        changelog: v.changelog,
        publishedAt: new Date(Number(v.publishedAt) * 1000).toISOString(),
      }))
    : [{ version: "1.0.0", changelog: "Initial registration.", publishedAt: new Date(Number(record.createdAt) * 1000).toISOString() }];

  const reviews: Review[] = chainReviews.map(
    (r: { author: string; rating: number; comment: string; createdAt: bigint; likes: bigint; reported: boolean }, idx: number) => ({
      id: `${agentId}-review-${idx}`,
      authorAddress: r.author,
      rating: Number(r.rating),
      comment: r.comment,
      createdAt: new Date(Number(r.createdAt) * 1000).toISOString(),
      likes: Number(r.likes),
      reported: r.reported,
    })
  );
  // Not filtered here on purpose: the admin moderation panel and the
  // creator dashboard both need to see flagged reviews (to audit/respond
  // to them), so `agent.reviews` carries everything. Public-facing
  // surfaces (the agent profile page) filter `reported` out at render
  // time instead — see src/app/agent/[slug]/page.tsx.

  const name = metadata.name;
  const slug = slugify(name, agentId);

  return {
    id: `agent-${agentId}`,
    slug,
    name,
    tagline: metadata.tagline,
    description: metadata.description,
    logoUrl: metadata.logoCid
      ? ipfsGatewayUrl(metadata.logoCid)
      : `https://api.dicebear.com/9.x/shapes/svg?seed=${slug}&backgroundColor=1a1730,241f42`,
    bannerUrl: metadata.bannerCid
      ? ipfsGatewayUrl(metadata.bannerCid)
      : `https://api.dicebear.com/9.x/glass/svg?seed=${slug}-banner`,
    creatorAddress: record.creator,
    category: metadata.category,
    tags: [metadata.category, stats.verifiedCreator ? "Verified" : "New Creator", pricingModel],
    capabilities: metadata.capabilities ?? [],
    pricing: {
      model: pricingModel,
      amountEth: priceEth,
      intervalDays: pricingModel === "subscription" ? Number(listing?.intervalDays ?? 0) : undefined,
    },
    version: versionHistory[versionHistory.length - 1].version,
    versionHistory,
    usageCount: completedJobs,
    revenueEth: 0, // requires summing PaymentProcessed events — session 4 dashboard territory
    followers: uniqueUsers,
    verified: stats.verifiedCreator,
    featured: false,
    trending: false,
    createdAt: new Date(Number(record.createdAt) * 1000).toISOString(),
    updatedAt: new Date(Number(record.updatedAt) * 1000).toISOString(),
    status: STATUS_ENUM_TO_LABEL[Number(record.status) as 0 | 1 | 2],
    trustScore,
    reviews,
    contractAddress: getContractAddress("AgentNFT"),
    ipfsHash: record.ipfsHash,
    source: "chain",
    chainAgentId: agentId,
  };
}

export async function getAllChainAgents(): Promise<Agent[]> {
  const registry = getContract("AgentRegistry");
  const total = Number(await registry.totalAgents());
  if (total === 0) return [];

  const ids = Array.from({ length: total }, (_, i) => i + 1);
  const settled = await Promise.allSettled(ids.map((id) => buildChainAgent(id)));

  return settled
    .filter((r): r is PromiseFulfilledResult<Agent | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((a): a is Agent => a !== null);
}

export async function getChainAgentBySlug(slug: string): Promise<Agent | undefined> {
  const all = await getAllChainAgents();
  return all.find((a) => a.slug === slug);
}
