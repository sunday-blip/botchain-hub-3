/**
 * IPFS pinning for agent metadata (register / updateMetadata / pushVersion).
 *
 * Uses Pinata's REST API when `NEXT_PUBLIC_PINATA_JWT` is set. When it
 * isn't — the default, out-of-the-box state — every "pin" call falls back
 * to a deterministic mock CID derived from a hash of the content, so the
 * full registration flow (fill form -> "pin to IPFS" -> mint) still
 * completes end to end for a demo without requiring anyone to hold a
 * Pinata account. Swap in a real key and nothing else in the register
 * wizard needs to change.
 */

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs";
const PUBLIC_GATEWAY = "https://ipfs.io/ipfs";

export function isIpfsConfigured(): boolean {
  return Boolean(PINATA_JWT);
}

export function ipfsGatewayUrl(hash: string): string {
  const clean = hash.replace(/^ipfs:\/\//, "");
  return `${PINATA_GATEWAY}/${clean}`;
}

/** Cheap, dependency-free content hash used only for the demo-mode mock CID. */
async function hashToCid(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(content));
  const bytes = Array.from(new Uint8Array(digest));
  const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  // Not a real CIDv1 — just something that *looks* like one so the UI reads
  // naturally in demo mode. Clearly namespaced so it's never confused with
  // a real pin if someone inspects it.
  return `bafydemo${hex.slice(0, 46)}`;
}

interface PinResult {
  cid: string;
  url: string;
  demo: boolean;
}

/** Pin a JSON object (agent metadata, version metadata) to IPFS. */
export async function pinJson(data: unknown): Promise<PinResult> {
  const body = JSON.stringify(data);

  if (!isIpfsConfigured()) {
    const cid = await hashToCid(body);
    return { cid, url: `${PUBLIC_GATEWAY}/${cid}`, demo: true };
  }

  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Pinata pinJSON failed: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as { IpfsHash: string };
  return { cid: json.IpfsHash, url: ipfsGatewayUrl(json.IpfsHash), demo: false };
}

/** Pin a binary file (logo, banner, screenshot) to IPFS. */
export async function pinFile(file: File): Promise<PinResult> {
  if (!isIpfsConfigured()) {
    const cid = await hashToCid(`${file.name}:${file.size}:${file.lastModified}`);
    return { cid, url: URL.createObjectURL(file), demo: true };
  }

  const form = new FormData();
  form.append("file", file);

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Pinata pinFile failed: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as { IpfsHash: string };
  return { cid: json.IpfsHash, url: ipfsGatewayUrl(json.IpfsHash), demo: false };
}

/** Fetch and parse JSON metadata previously pinned at `hash`. */
export async function fetchIpfsJson<T>(hash: string): Promise<T> {
  const res = await fetch(ipfsGatewayUrl(hash));
  if (!res.ok) throw new Error(`Failed to fetch IPFS content ${hash}: ${res.status}`);
  return (await res.json()) as T;
}
