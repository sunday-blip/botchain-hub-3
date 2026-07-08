import { MarketplaceGrid } from "@/components/marketplace/marketplace-grid";
import { getAllAgents } from "@/data/agents";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const agents = await getAllAgents();
  return <MarketplaceGrid agents={agents} initialCategory={searchParams.category} />;
}
