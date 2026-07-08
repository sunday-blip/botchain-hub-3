# BotChain Hub

A decentralized marketplace where anyone can publish, discover, hire, and
monetize AI agents — with identity, reputation, version history, and
payments recorded on-chain.

This repo was built across five sessions, following the roadmap below.
**Session 5 (this one)** is the last one on the original plan: an admin
panel, on-chain analytics, a deployment guide, and a hackathon pitch doc.

## What's working right now

- Everything from Session 1 (landing, marketplace, agent profile, Trust Score engine, design system), Session 2 (7 Solidity contracts + Hardhat setup — see [`CONTRACTS.md`](./CONTRACTS.md)), Session 3 (real wallet, IPFS pinning, register wizard, chain-or-mock data layer — see [`SESSION3.md`](./SESSION3.md)), and Session 4 (creator dashboard, review write path, Agent Battles — see [`SESSION4.md`](./SESSION4.md))
- **Admin panel** (`/admin`) — gated on the connected wallet matching `AgentRegistry.owner()`. An analytics tab (registered agents, transaction count, on-chain volume/fees, a revenue-by-agent chart pulled from `Payments.PaymentProcessed` events, platform fee control) and a moderation tab (verified-creator toggle, review flagging, featured/trending curation) — see [`SESSION5.md`](./SESSION5.md) for the full breakdown and known limitations
- **Deployment guide** ([`DEPLOYMENT.md`](./DEPLOYMENT.md)) — demo mode → local Hardhat → Sepolia testnet → frontend hosting, in order, including the `.data/` JSON-store caveat on serverless hosts
- **Pitch doc** ([`PITCH.md`](./PITCH.md)) — problem/solution, what's actually built vs. slideware, a 3-minute demo script, honest "what's next"
- **Creator dashboard** (`/dashboard`) — your registered agents, withdrawable balance + withdraw, publish-version, pause/resume listing, and a reviews panel with like
- **Review submission** (`src/components/agent/review-form.tsx`) — buyers with active access can rate + review an agent directly from its profile page, gated on `Marketplace.hasActiveAccess` / `Review.hasReviewed`
- **Agent Battles** (`/battles`) — pick a task, pick two agents, vote on which response would've been better; live leaderboard and battle history, explicitly labeled as an off-chain feature (see `SESSION4.md` for why)
- **Real wallet connection** (`src/contexts/wallet-context.tsx`) — `ethers.BrowserProvider` + MetaMask, live `accountsChanged`/`chainChanged` listeners, balance, wrong-network detection with a one-click network switch/add
- **IPFS pinning** (`src/lib/ipfs.ts`) — Pinata-backed when `NEXT_PUBLIC_PINATA_JWT` is set, otherwise a deterministic demo CID so the full flow still runs with zero setup
- **Register wizard** (`src/components/register/wizard.tsx`) — 5 steps (basics → capabilities → pricing → media → mint) that pins metadata/images to IPFS, calls `AgentRegistry.register()`, and creates the matching `Marketplace` listing in one flow
- **Chain-or-mock data layer** (`src/data/agents.ts`) — every page (`marketplace`, `agent/[slug]`, the landing rails) now awaits chain reads through `src/data/chain-agents.ts` when contracts are configured, and transparently falls back to the Session 1 mock catalog otherwise — see "Demo mode vs. live mode" below
- **Live "Hire agent" button** (`src/components/agent/hire-button.tsx`) — calls `purchase`/`subscribe`/`useFreeAgent` on `Marketplace.sol` through the connected wallet for chain-backed agents

## Demo mode vs. live mode

Nothing here requires a wallet, an RPC node, or a Pinata account to run:

```bash
npm install
npm run dev
```

Open http://localhost:3000 — the whole app runs on the Session 1 mock
catalog (`src/data/mock-agents.ts`). To switch to live mode against your
own deployment:

```bash
npx hardhat node                 # terminal 1
npm run deploy:local             # terminal 2 — writes deployments/<network>-<chainId>.json
```

Then copy the seven contract addresses from that JSON file into
`.env.local` (see `.env.example`) alongside `NEXT_PUBLIC_RPC_URL` and
restart `npm run dev`. Every read/write in the app switches to the real
contracts with no other changes — `isChainConfigured()`
(`src/config/chain.ts`) is the single switch everything else checks.

## Architecture

```
src/
  app/                 # Next.js App Router pages (now async server components where they read agent data)
    page.tsx           # Landing page
    marketplace/       # Marketplace + loading skeleton
    agent/[slug]/      # Agent profile (dynamic route)
    register/          # Registration wizard — wallet + IPFS + AgentRegistry.register()
    dashboard/         # Creator dashboard — my agents, withdraw, publish version, pause/resume
    battles/           # Agent Battles — community voting, off-chain store + API routes
    admin/             # Admin panel — owner-gated analytics + moderation
    api/battles/       # Route handlers backing the battles JSON store
    api/admin/         # Route handler backing the curation JSON store
  components/
    ui/                # Button, Badge, TrustRing (signature element)
    layout/             # Header (wallet button + network warning), footer, coming-soon shell
    landing/            # Hero, rails, categories, why/how/testimonials/faq
    marketplace/        # AgentCard, MarketplaceGrid (takes agents as a prop now)
    register/           # RegisterWizard
    agent/              # HireButton, ReviewForm (live purchase/subscribe + review submission)
    dashboard/           # VersionPublishForm
    battles/              # BattleArena
    admin/                 # AdminPanel, AdminAnalytics, AgentModeration
  config/
    chain.ts            # Contract addresses, RPC URL, isChainConfigured() switch
  contexts/            # WalletProvider — real ethers.js/MetaMask integration
  data/
    agents.ts            # Chain-or-mock facade every page imports
    chain-agents.ts       # Live reads: AgentRegistry + Marketplace + Reputation + Review + VersionControl + IPFS
    mock-agents.ts         # Session 1's deterministic demo catalog
    battles-store.ts        # fs-backed JSON store for Agent Battles (off-chain, see SESSION4.md)
    curation-store.ts        # fs-backed JSON store for featured/trending curation (see SESSION5.md)
  lib/
    contracts.ts          # ethers Contract/provider helpers
    abis.ts                # Hand-written ABIs (see note in that file re: hardhat compile)
    ipfs.ts                 # Pinata pinning + demo-mode CID fallback
    simulate-agent.ts        # Labeled-simulation agent responses for Agent Battles
    admin.ts                  # useAdminStatus() — checks connected wallet against AgentRegistry.owner()
    utils.ts                   # cn(), formatting, trust score formula (untouched since Session 1)
  types/               # Shared TypeScript domain model (Agent, Battle, etc.)
```

## Roadmap

- [x] **Session 1** — Next.js scaffold, design system, landing/marketplace/agent-profile pages, trust score engine, mock data layer
- [x] **Session 2** — Solidity contracts: `AgentRegistry.sol`, `Marketplace.sol`, `Payments.sol`, `Reputation.sol`, `Review.sol`, `VersionControl.sol`, `AgentNFT.sol` + Hardhat config + tests — see [`CONTRACTS.md`](./CONTRACTS.md)
- [x] **Session 3** — Real wallet connection (ethers.js + MetaMask), IPFS/Pinata metadata pinning, register wizard, wiring the data layer to live contracts
- [x] **Session 4** — Creator dashboard, review/reputation write paths, Agent Battles
- [x] **Session 5** — Admin panel, analytics charts, deployment guide, hackathon pitch deck
- [x] **Session 6** — Signature-based admin auth for the curation API (follow-up fix, not on the original roadmap)

## Tech stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Framer Motion ·
Lucide Icons · React Hook Form + Zod · ethers.js v6 · Recharts ·
Hardhat (Session 2+)

## Design system

- **Palette**: void `#08070F`, surface `#0F0E1A`, signal purple `#8B5CF6`, signal blue `#3B82F6`, signal cyan `#22D3EE`
- **Type**: Space Grotesk (display), Inter (body), JetBrains Mono (addresses, hashes, tx data)
- **Signature element**: the Trust Ring — an animated conic-gradient ring encoding an agent's on-chain reputation score, used everywhere reputation appears instead of a plain star rating

## Where to go from here

The original plan was five sessions; **Session 6** followed up on the
highest-priority item from Session 5's limitations list — signature-based
admin auth (`personal_sign`, verified server-side) replacing the plain
address check on `/api/admin/curation`. See [`SESSION6.md`](./SESSION6.md)
for what changed and what's still not bulletproof (replay within the
signature's freshness window, no rate limiting).

Beyond that, `PITCH.md`'s "what's next" section and `SESSION5.md`'s
remaining "known limitations" are the honest starting point — a real
`Battle` contract, multi-chain deployment, and so on.
