import { NextResponse } from "next/server";
import { listBattles, createBattle } from "@/data/battles-store";
import type { AgentCategory, Battle } from "@/types";

export async function GET() {
  return NextResponse.json({ battles: listBattles() });
}

interface CreateBattleBody {
  task: string;
  category: AgentCategory;
  agentA: Battle["agentA"];
  agentB: Battle["agentB"];
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<CreateBattleBody>;

  if (!body.task?.trim() || !body.category || !body.agentA?.id || !body.agentB?.id) {
    return NextResponse.json({ error: "Missing task, category, or agent selection." }, { status: 400 });
  }
  if (body.agentA.id === body.agentB.id) {
    return NextResponse.json({ error: "Pick two different agents." }, { status: 400 });
  }

  const battle = createBattle({
    task: body.task.trim(),
    category: body.category,
    agentA: body.agentA,
    agentB: body.agentB,
  });

  return NextResponse.json({ battle }, { status: 201 });
}
