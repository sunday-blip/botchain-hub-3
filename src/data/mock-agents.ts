/**
 * Session 1's deterministic demo catalog. This is the data source used in
 * "demo mode" — whenever `isChainConfigured()` (src/config/chain.ts) is
 * false, which is the default until contracts are deployed and their
 * addresses are set in .env.local. See `src/data/agents.ts` for the
 * chain-or-mock switch, and `src/data/chain-agents.ts` for the live
 * equivalent of everything below.
 */
import type { Agent, AgentCategory } from "@/types";
import { buildTrustScore } from "@/lib/utils";

const categories: AgentCategory[] = [
  "Writing", "Research", "Trading", "Education", "Healthcare",
  "Programming", "Marketing", "Customer Support", "Finance",
  "Crypto", "Productivity", "Image Generation", "Video", "Voice",
  "Automation", "Custom",
];

const names = [
  ["Scribe Prime", "Long-form content that sounds like you, not a template"],
  ["QuantSignal", "Reads on-chain flow and flags trades before the crowd"],
  ["ClauseGuard", "Redlines contracts and flags risk in seconds"],
  ["PixelForge", "Product renders from a single reference photo"],
  ["Tutor.eth", "Adaptive lesson plans that track what a student forgets"],
  ["DeskZero", "Tier-1 support tickets, resolved without a human in the loop"],
  ["LedgerSense", "Reconciles multi-chain treasury activity nightly"],
  ["VoiceCast", "Studio-quality narration in 40 languages"],
  ["FlowPilot", "Turns a Notion doc into a running automation"],
  ["ChartWright", "Technical analysis commentary, streamed live"],
  ["HealthTriage", "Symptom intake and routing for clinics"],
  ["ReelCut", "Rough cut to publish-ready short in one pass"],
  ["CampaignForge", "Ad copy variants tested against real CTR data"],
  ["CodeSentry", "PR review that actually reads the diff"],
  ["YieldScout", "Finds the safest yield across five chains"],
  ["SupportSensei", "Macros that learn from every resolved ticket"],
];

function seedRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function buildAgent(i: number): Agent {
  const rand = seedRand(i * 97 + 13);
  const [name, tagline] = names[i % names.length];
  const category = categories[i % categories.length];
  const completedJobs = Math.floor(rand() * 4000) + 20;
  const averageRating = Number((3.4 + rand() * 1.6).toFixed(1));
  const walletAgeDays = Math.floor(rand() * 700) + 10;
  const uniqueUsers = Math.floor(completedJobs * (0.4 + rand() * 0.4));
  const verifiedCreator = rand() > 0.45;
  const pricingModels: Array<Agent["pricing"]["model"]> = [
    "one-time", "subscription", "free", "donation",
  ];
  const pricingModel = pricingModels[i % pricingModels.length];

  const trustScore = buildTrustScore({
    completedJobs,
    averageRating,
    walletAgeDays,
    verifiedCreator,
    uniqueUsers,
  });

  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${i}`;

  return {
    id: `agent-${i}`,
    slug,
    name: `${name}`,
    tagline,
    description:
      `${name} is a ${category.toLowerCase()} agent registered on BotChain. ` +
      `It has completed ${completedJobs.toLocaleString()} jobs for ${uniqueUsers.toLocaleString()} unique wallets, ` +
      `maintaining a ${averageRating.toFixed(1)}-star average across every review on record. ` +
      `Every run, update, and payment is written on-chain, so its track record can't be edited after the fact.`,
    logoUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=${slug}&backgroundColor=1a1730,241f42`,
    bannerUrl: `https://api.dicebear.com/9.x/glass/svg?seed=${slug}-banner`,
    creatorAddress: `0x${i.toString(16).padStart(4, "0")}${"a1b2c3d4e5f6".repeat(3).slice(0, 30)}`,
    creatorEns: rand() > 0.6 ? `${name.toLowerCase().split(" ")[0]}.eth` : undefined,
    category,
    tags: [category, verifiedCreator ? "Verified" : "New Creator", pricingModel],
    capabilities: [
      "REST API endpoint",
      "Streaming responses",
      "Custom prompt templates",
      "Webhook callbacks",
    ].slice(0, 2 + Math.floor(rand() * 3)),
    pricing: {
      model: pricingModel,
      amountEth: pricingModel === "free" ? 0 : Number((0.001 + rand() * 0.05).toFixed(4)),
      intervalDays: pricingModel === "subscription" ? 30 : undefined,
    },
    version: `${1 + Math.floor(rand() * 3)}.${Math.floor(rand() * 9)}.${Math.floor(rand() * 9)}`,
    versionHistory: [
      { version: "1.0.0", publishedAt: "2025-11-02", changelog: "Initial mainnet deployment." },
      { version: "1.1.0", publishedAt: "2026-01-14", changelog: "Reduced latency, added streaming." },
    ],
    usageCount: completedJobs,
    revenueEth: Number((completedJobs * (0.001 + rand() * 0.02)).toFixed(3)),
    followers: Math.floor(uniqueUsers * (0.2 + rand() * 0.3)),
    verified: verifiedCreator,
    featured: i % 7 === 0,
    trending: i % 5 === 0,
    createdAt: new Date(Date.now() - walletAgeDays * 86_400_000).toISOString(),
    updatedAt: new Date(Date.now() - Math.floor(rand() * 20) * 86_400_000).toISOString(),
    status: "active",
    trustScore,
    reviews: Array.from({ length: 3 }).map((_, r) => ({
      id: `${slug}-review-${r}`,
      authorAddress: `0x${(i + r).toString(16).padStart(4, "0")}${"7c8d9e".repeat(4)}`,
      rating: Math.max(1, Math.min(5, Math.round(averageRating + (rand() - 0.5) * 2))),
      comment: [
        "Fast, and the output didn't need much editing.",
        "Solid for the price. Support responded within the hour.",
        "Works as advertised. Would use again for this category.",
      ][r],
      createdAt: new Date(Date.now() - (r + 1) * 4 * 86_400_000).toISOString(),
      likes: Math.floor(rand() * 40),
    })),
    contractAddress: `0x${(i * 31 + 7).toString(16).padStart(6, "0")}${"d34db33f".repeat(4).slice(0, 24)}`,
    ipfsHash: `bafybeih${i.toString(36)}qz7x2vv3y4z5a6b7c8d9e0f1g2h3i4j5k6`,
    source: "mock",
  };
}

export const AGENTS: Agent[] = Array.from({ length: 48 }, (_, i) => buildAgent(i));

export function getAgentBySlug(slug: string): Agent | undefined {
  return AGENTS.find((a) => a.slug === slug);
}

export function getFeaturedAgents(): Agent[] {
  return AGENTS.filter((a) => a.featured).slice(0, 6);
}

export function getTrendingAgents(): Agent[] {
  return AGENTS.filter((a) => a.trending).slice(0, 8);
}

export function getNewestAgents(): Agent[] {
  return [...AGENTS].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 8);
}

export function getSimilarAgents(agent: Agent): Agent[] {
  return AGENTS.filter((a) => a.category === agent.category && a.id !== agent.id).slice(0, 4);
}

export const CATEGORIES = categories;
