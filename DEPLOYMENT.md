# Deployment Guide

Three things get deployed independently: the contracts, IPFS pinning
(Pinata — just an API key, nothing to "deploy"), and the Next.js frontend.
You can run all three in demo mode with zero setup, or go fully live by
following the steps below in order.

## 0. Demo mode (no setup)

```bash
npm install
npm run dev
```

Nothing below is required for this. Every read/write in the app falls
back to the Session 1 mock catalog when contracts aren't configured — see
`src/config/chain.ts::isChainConfigured()`.

## 1. Local chain (Hardhat)

```bash
npx hardhat node                 # terminal 1 — leave running
npm run test:contracts           # optional — run the Session 2 test suite first
npm run deploy:local              # terminal 2
```

`deploy:local` runs `scripts/deploy.ts` against `localhost` (port 8545)
and writes `deployments/localhost-31337.json` with all seven addresses.
Copy them into `.env.local`:

```bash
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_CHAIN_NAME="Hardhat Local"

NEXT_PUBLIC_AGENT_NFT_ADDRESS=0x...
NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_VERSION_CONTROL_ADDRESS=0x...
NEXT_PUBLIC_REPUTATION_ADDRESS=0x...
NEXT_PUBLIC_PAYMENTS_ADDRESS=0x...
NEXT_PUBLIC_MARKETPLACE_ADDRESS=0x...
NEXT_PUBLIC_REVIEW_ADDRESS=0x...
```

Restart `npm run dev`. Import one of the private keys Hardhat prints when
`hardhat node` starts into MetaMask (they're pre-funded test accounts on
chain ID 31337) to register/hire/review as a real wallet. **The first
account Hardhat prints is also the contracts' `owner()`** — import that
one specifically to access `/admin`.

## 2. Sepolia testnet

1. Get a Sepolia RPC URL (Alchemy, Infura, or any public endpoint) and a
   funded Sepolia private key (a faucet works — e.g. `sepoliafaucet.com`).
2. Add to `.env` (not `.env.local` — Hardhat reads process env directly,
   not Next's env loading):
   ```bash
   SEPOLIA_RPC_URL=https://...
   DEPLOYER_PRIVATE_KEY=0x...   # no "0x" prefix issues — include it
   ```
3. Deploy:
   ```bash
   npx hardhat run scripts/deploy.ts --network sepolia
   ```
   This writes `deployments/sepolia-11155111.json`.
4. Copy those seven addresses into `.env.local` as in step 1, but set:
   ```bash
   NEXT_PUBLIC_RPC_URL=https://... (your Sepolia RPC URL, or a public one)
   NEXT_PUBLIC_CHAIN_ID=11155111
   NEXT_PUBLIC_CHAIN_NAME="Sepolia"
   ```
5. **Whoever holds `DEPLOYER_PRIVATE_KEY` is the admin** (`/admin` gates on
   `AgentRegistry.owner()`, which is set to `msg.sender` at deploy time —
   see `scripts/deploy.ts`). Keep that key somewhere real, not `.env` in a
   shared repo — `.gitignore` already excludes `.env`, `.env*.local`, and
   `deployments/`, but double-check before pushing to a public remote.
6. (Optional) Verify contracts on Etherscan so the source is readable
   on-chain:
   ```bash
   npx hardhat verify --network sepolia <address> <constructor arg 1> <constructor arg 2> ...
   ```
   Constructor args per contract are in `scripts/deploy.ts` — e.g.
   `AgentRegistry` takes `agentNFT`'s address, `Payments` takes
   `(feeRecipient, platformFeeBps)`.

## 3. IPFS (Pinata)

Optional in both modes above — without it, every pin falls back to a
deterministic demo CID (`src/lib/ipfs.ts`) so registration/version-publish
still work end to end. To pin for real:

1. Create a free account at [pinata.cloud](https://app.pinata.cloud).
2. Generate a JWT under **API Keys** (scoped to `pinFileToIPFS` +
   `pinJSONToIPFS` is enough).
3. Add to `.env.local`:
   ```bash
   NEXT_PUBLIC_PINATA_JWT=eyJ...
   NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs
   ```

Note this JWT ends up in the client bundle (`NEXT_PUBLIC_*` vars always
do) — fine for a hackathon demo pinning from the browser, but a
production version should proxy pinning through a server route instead of
shipping the key to every visitor.

## 4. Frontend hosting

Any Next.js host works (Vercel is the path of least resistance since App
Router + Route Handlers — used by `/api/battles` and `/api/admin/curation`
— are first-class there). Two things to know before you deploy:

- **The `.data/` JSON stores don't survive serverless redeploys or scale
  across instances.** `battles-store.ts` and `curation-store.ts` write to
  the local filesystem, which is fine for a single long-running instance
  (e.g. a VM, or `npm run start` on one box) but resets on every deploy on
  Vercel-style serverless hosting. For a real deployment, swap both files'
  `fs.readFileSync`/`writeFileSync` calls for a real datastore (Postgres,
  Redis, etc.) — every function in those two files keeps its exact
  signature, so nothing that imports them needs to change.
- **Set every `NEXT_PUBLIC_*` var from steps 1–3** in your host's
  environment variable settings before building — they're inlined at
  build time, not read at runtime, so changing them requires a rebuild.

```bash
npm run build
npm run start   # or deploy the .next output to your host of choice
```

## Quick reference: what needs redeploying when

| Change | What to redo |
|---|---|
| Edited a `.sol` file | `npm run test:contracts` → redeploy (new addresses!) → update `.env.local` → rebuild frontend |
| Changed `NEXT_PUBLIC_*` env vars | Rebuild frontend only |
| Edited any `.tsx`/`.ts` file | Rebuild frontend only |
| Rotated the Pinata JWT | Rebuild frontend only |
