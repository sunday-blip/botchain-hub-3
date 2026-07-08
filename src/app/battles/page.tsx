import { getAllAgents } from "@/data/agents";
import { listBattles, computeLeaderboard } from "@/data/battles-store";
import { BattleArena } from "@/components/battles/battle-arena";

export default async function BattlesPage() {
  const agents = await getAllAgents();
  const battles = listBattles();
  const leaderboard = computeLeaderboard();

  return <BattleArena agents={agents} initialBattles={battles} leaderboard={leaderboard} />;
}
