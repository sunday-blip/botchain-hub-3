import { NextResponse } from "next/server";
import { verifyMessage } from "ethers";
import { getCuration, setFeatured, setTrending } from "@/data/curation-store";
import { getContract, getReadProvider } from "@/lib/contracts";
import { isChainConfigured } from "@/config/chain";
import { buildCurationAuthMessage, isTimestampFresh } from "@/lib/admin-auth";

/**
 * Auth: the client signs `buildCurationAuthMessage(...)` with the
 * connected wallet (`personal_sign`, triggered by `signer.signMessage` in
 * `agent-moderation.tsx`), and this route recovers the signer from that
 * signature and checks it against `AgentRegistry.owner()` — the same
 * deployer address every Ownable contract in this stack shares (see
 * scripts/deploy.ts). The timestamp embedded in the signed message is
 * checked for freshness (5 minute window) so a captured request can't be
 * replayed indefinitely.
 *
 * This is meaningfully stronger than Session 5's original address-field
 * check, but still not a full production auth system: a captured
 * signature is replayable for its freshness window (toggling the same
 * curation flag to the same value again isn't a very interesting attack,
 * but a stricter version would track used signatures too), and this
 * doesn't rate-limit or log attempts. The on-chain writes elsewhere in
 * the admin panel (`setVerified`, `reportReview`, `setFeeBps`) were never
 * dependent on this route — they go through the wallet's signer directly
 * and are enforced by `onlyOwner` on the contracts themselves.
 */
async function isAuthorized(body: Partial<CurationBody>): Promise<boolean> {
  if (!isChainConfigured()) return false;
  if (!body.signature || !body.timestamp || !body.agentId || !body.field || typeof body.on !== "boolean") {
    return false;
  }
  if (!isTimestampFresh(body.timestamp)) return false;

  const message = buildCurationAuthMessage({
    agentId: body.agentId,
    field: body.field,
    on: body.on,
    timestamp: body.timestamp,
  });

  let recovered: string;
  try {
    recovered = verifyMessage(message, body.signature);
  } catch {
    return false;
  }

  try {
    const registry = getContract("AgentRegistry", getReadProvider());
    const owner: string = await registry.owner();
    return owner.toLowerCase() === recovered.toLowerCase();
  } catch {
    return false;
  }
}

export async function GET() {
  return NextResponse.json({ curation: getCuration() });
}

interface CurationBody {
  agentId: string;
  field: "featured" | "trending";
  on: boolean;
  timestamp: number;
  signature: string;
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<CurationBody>;
  if (!body.agentId || !body.field || typeof body.on !== "boolean" || !body.timestamp || !body.signature) {
    return NextResponse.json({ error: "Missing agentId, field, on, timestamp, or signature." }, { status: 400 });
  }

  if (!(await isAuthorized(body))) {
    return NextResponse.json(
      { error: "Not authorized — sign the request with the contract owner's wallet." },
      { status: 403 }
    );
  }

  const curation =
    body.field === "featured" ? setFeatured(body.agentId, body.on) : setTrending(body.agentId, body.on);

  return NextResponse.json({ curation });
}
