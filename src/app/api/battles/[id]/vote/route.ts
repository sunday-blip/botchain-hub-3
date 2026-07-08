import { NextResponse } from "next/server";
import { castVote } from "@/data/battles-store";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = (await req.json()) as { address?: string; choice?: "a" | "b" };

  if (!body.address) {
    return NextResponse.json({ error: "Connect a wallet to vote." }, { status: 400 });
  }
  if (body.choice !== "a" && body.choice !== "b") {
    return NextResponse.json({ error: "Invalid choice." }, { status: 400 });
  }

  const result = castVote(params.id, body.address, body.choice);
  if (!result.battle) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json({ battle: result.battle });
}
