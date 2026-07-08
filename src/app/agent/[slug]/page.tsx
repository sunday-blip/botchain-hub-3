import Image from "next/image";
import { notFound } from "next/navigation";
import { Star, Users, TrendingUp, Coins, Copy, Share2 } from "lucide-react";
import { getAllAgents, getAgentBySlug, getSimilarAgents } from "@/data/agents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrustRing } from "@/components/ui/trust-ring";
import { AgentCard } from "@/components/marketplace/agent-card";
import { HireButton } from "@/components/agent/hire-button";
import { ReviewForm } from "@/components/agent/review-form";
import { formatCompactNumber, truncateAddress, timeAgo } from "@/lib/utils";

export async function generateStaticParams() {
  const agents = await getAllAgents();
  return agents.map((a) => ({ slug: a.slug }));
}

export default async function AgentProfilePage({ params }: { params: { slug: string } }) {
  const agent = await getAgentBySlug(params.slug);
  if (!agent) notFound();

  const similar = await getSimilarAgents(agent);

  return (
    <div className="pb-20">
      <div className="relative h-48 w-full overflow-hidden sm:h-64">
        <Image src={agent.bannerUrl} alt="" fill unoptimized className="object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-transparent" />
      </div>

      <div className="mx-auto -mt-16 max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-void bg-surface shadow-glow">
              <Image src={agent.logoUrl} alt="" fill unoptimized />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{agent.name}</h1>
                {agent.verified && <Badge variant="verified">Verified</Badge>}
                {agent.source === "mock" && <Badge>Demo data</Badge>}
              </div>
              <p className="text-sm text-ink-dim">{agent.tagline}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm"><Share2 className="h-4 w-4" /> Share</Button>
            <HireButton agent={agent} />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <section className="glass rounded-2xl p-6">
              <h2 className="font-display text-lg font-semibold text-ink">About</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-dim">{agent.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {agent.tags.map((t) => <Badge key={t}>{t}</Badge>)}
              </div>
            </section>

            <section className="glass rounded-2xl p-6">
              <h2 className="font-display text-lg font-semibold text-ink">Capabilities</h2>
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {agent.capabilities.map((c) => (
                  <li key={c} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm text-ink-dim">
                    <span className="h-1.5 w-1.5 rounded-full bg-signal-cyan" /> {c}
                  </li>
                ))}
              </ul>
            </section>

            <section className="glass rounded-2xl p-6">
              <h2 className="font-display text-lg font-semibold text-ink">Version history</h2>
              <ul className="mt-3 space-y-3">
                {agent.versionHistory.map((v) => (
                  <li key={v.version} className="flex items-start gap-3 border-l-2 border-signal-purple/40 pl-4">
                    <div>
                      <div className="font-mono text-sm text-ink">v{v.version}</div>
                      <div className="text-xs text-ink-faint">{v.publishedAt}</div>
                      <p className="mt-1 text-sm text-ink-dim">{v.changelog}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-ink">Reviews</h2>
                <span className="flex items-center gap-1 text-sm text-ink-dim">
                  <Star className="h-4 w-4 fill-signal-cyan text-signal-cyan" />
                  {agent.trustScore.averageRating.toFixed(1)}
                </span>
              </div>
              <div className="mt-4">
                <ReviewForm agent={agent} />
              </div>
              <ul className="mt-4 space-y-4">
                {agent.reviews.filter((r) => !r.reported).map((r) => (
                  <li key={r.id} className="border-b border-white/5 pb-4 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-ink-faint">{truncateAddress(r.authorAddress)}</span>
                      <span className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${i < r.rating ? "fill-signal-cyan text-signal-cyan" : "text-white/15"}`}
                          />
                        ))}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-ink-dim">{r.comment}</p>
                    <div className="mt-1 text-xs text-ink-faint">{timeAgo(r.createdAt)} · {r.likes} likes</div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="space-y-6">
            <div className="glass rounded-2xl p-6 text-center">
              <TrustRing score={agent.trustScore.score} size={96} className="mx-auto flex-col" />
              <p className="mt-3 text-xs text-ink-faint">
                Composite of job volume, rating, wallet age, verification, and unique users.
              </p>
            </div>

            <div className="glass grid grid-cols-2 gap-4 rounded-2xl p-6 text-sm">
              <div>
                <div className="flex items-center gap-1.5 text-ink-faint text-xs"><TrendingUp className="h-3.5 w-3.5" /> Usage</div>
                <div className="mt-1 font-display font-semibold text-ink">{formatCompactNumber(agent.usageCount)}</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-ink-faint text-xs"><Coins className="h-3.5 w-3.5" /> Revenue</div>
                <div className="mt-1 font-display font-semibold text-ink">{agent.revenueEth.toFixed(2)} Ξ</div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-ink-faint text-xs"><Users className="h-3.5 w-3.5" /> Followers</div>
                <div className="mt-1 font-display font-semibold text-ink">{formatCompactNumber(agent.followers)}</div>
              </div>
              <div>
                <div className="text-ink-faint text-xs">Category</div>
                <div className="mt-1 font-medium text-ink">{agent.category}</div>
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <h3 className="font-display text-sm font-semibold text-ink">On-chain record</h3>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-ink-faint">Creator</span>
                  <span className="font-mono text-ink-dim">{agent.creatorEns ?? truncateAddress(agent.creatorAddress)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-faint">Contract</span>
                  <button className="flex items-center gap-1 font-mono text-ink-dim hover:text-white">
                    {truncateAddress(agent.contractAddress)} <Copy className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-faint">Metadata</span>
                  <span className="font-mono text-ink-dim">{agent.ipfsHash.slice(0, 14)}…</span>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {similar.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display text-xl font-semibold text-ink">Similar agents</h2>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((a) => <AgentCard key={a.id} agent={a} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
