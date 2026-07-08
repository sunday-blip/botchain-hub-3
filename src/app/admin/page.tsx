import { getAllAgents } from "@/data/agents";
import { getCuration } from "@/data/curation-store";
import { AdminPanel } from "@/components/admin/admin-panel";

export default async function AdminPage() {
  const agents = await getAllAgents();
  const curation = getCuration();
  return <AdminPanel agents={agents} initialCuration={curation} />;
}
