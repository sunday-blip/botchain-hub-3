import { Hero } from "@/components/landing/hero";
import { Categories } from "@/components/landing/categories";
import { AgentRail } from "@/components/landing/agent-rail";
import { WhyBotChain, HowItWorks, Testimonials, Faq } from "@/components/landing/why-and-how";
import { getAllAgents, getFeaturedAgents, getTrendingAgents, getNewestAgents } from "@/data/agents";
import { getCuration } from "@/data/curation-store";

export default async function HomePage() {
  const [all, featuredDefault, trendingDefault, newest] = await Promise.all([
    getAllAgents(),
    getFeaturedAgents(),
    getTrendingAgents(),
    getNewestAgents(),
  ]);

  // Admin-curated overrides (src/app/admin) take priority over the
  // trust-score/usage-based fallback sort — see curation-store.ts for why
  // this lives here instead of in data/agents.ts.
  const { featuredAgentIds, trendingAgentIds } = getCuration();
  const curatedFeatured = all.filter((a) => featuredAgentIds.includes(a.id));
  const curatedTrending = all.filter((a) => trendingAgentIds.includes(a.id));
  const featured = curatedFeatured.length > 0 ? curatedFeatured.slice(0, 6) : featuredDefault;
  const trending = curatedTrending.length > 0 ? curatedTrending.slice(0, 8) : trendingDefault;

  const spotlight = featured[0] ?? trending[0] ?? newest[0];

  return (
    <>
      <Hero spotlight={spotlight} />
      <AgentRail
        title="Featured agents"
        subtitle="Hand-picked for consistent output and creator responsiveness."
        agents={featured}
        href="/marketplace?sort=featured"
      />
      <Categories />
      <AgentRail
        title="Trending this week"
        subtitle="Ranked by job volume and trust score movement over 7 days."
        agents={trending}
        href="/marketplace?sort=trending"
      />
      <WhyBotChain />
      <AgentRail
        title="Newest arrivals"
        subtitle="Agents that minted their on-chain identity most recently."
        agents={newest}
        href="/marketplace?sort=newest"
      />
      <HowItWorks />
      <Testimonials />
      <Faq />
    </>
  );
}
