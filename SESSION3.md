# Session 3 — Wallet + IPFS + Chain Wiring

This session connects the Session 1 frontend to the Session 2 contracts.
Nothing from Session 1/2 was thrown away — the mock catalog and the
Solidity contracts are both still here, now bridged by a data layer that
picks between them automatically.

## What shipped

1. **Real wallet connection** — `src/contexts/wallet-context.tsx` replaces
   the mock `connect()` with `ethers.BrowserProvider` + MetaMask:
   `eth_requestAccounts`, live `accountsChanged`/`chainChanged` listeners,
   balance lookup, and wrong-network detection with a
   `wallet_switchEthereumChain` / `wallet_addEthereumChain` prompt.
2. **IPFS metadata pinning** — `src/lib/ipfs.ts` pins agent metadata and
   images to Pinata when `NEXT_PUBLIC_PINATA_JWT` is set. Without a key,
   every pin call falls back to a deterministic mock CID (hashed from the
   content) so the full register flow still runs end to end — useful for
   anyone cloning the repo without setting up a Pinata account first.
3. **Register wizard** — `src/components/register/wizard.tsx`, a real
   5-step flow (basics → capabilities → pricing → media → mint) that:
   - pins the logo/banner + JSON metadata to IPFS,
   - calls `AgentRegistry.register(ipfsHash, category)`,
   - parses the `AgentRegistered` event log for the new `agentId`,
   - calls `Marketplace.createOrUpdateListing(...)` with the chosen pricing model.
4. **Chain-or-mock data layer** — `src/data/agents.ts` is now the single
   switch every page reads through:
   - `src/config/chain.ts::isChainConfigured()` is true only when all
     seven contract addresses are set in `.env.local`.
   - When true, `src/data/chain-agents.ts` reads `AgentRegistry`,
     `Marketplace`, `Reputation`, `Review`, and `VersionControl`, fetches
     each agent's pinned IPFS metadata, and assembles the same `Agent`
     shape the mock catalog produces — `computeTrustScore` (Session 1) is
     untouched, just fed real numbers.
   - When false (default), everything falls back to
     `src/data/mock-agents.ts`, unchanged from Session 1.
   - A failed chain read (RPC down, wrong network) also falls back to
     mock data rather than crashing the page — important since
     `generateStaticParams` runs at build time, before a Hardhat node may
     even be running.
5. **Live "Hire agent" button** — `src/components/agent/hire-button.tsx`
   calls `purchase` / `subscribe` / `useFreeAgent` on `Marketplace.sol`
   depending on the listing's pricing model, only for agents where
   `agent.source === "chain"`. Demo-catalog agents show an explanatory
   message instead of silently doing nothing.
6. Pages that read agent data (`app/page.tsx`, `app/marketplace/page.tsx`,
   `app/agent/[slug]/page.tsx`) became async Server Components, since
   blockchain reads are inherently async — `generateStaticParams` and the
   page bodies now `await` the chain-or-mock facade. `MarketplaceGrid` and
   `Hero` take the fetched data as props instead of importing it directly,
   so they still work identically in either mode.

## Why "demo mode" exists at all

This sandbox has no network access, so `npm install` / `hardhat compile` /
`hardhat node` have not been (and could not be) run here — see the note in
`CONTRACTS.md`. Every piece of Session 3 was built to run without a live
chain so the app is fully demoable the moment someone clones the repo, and
switches to the real contracts the moment they deploy them locally. This
also means: nothing in this session has been executed end-to-end against a
running Hardhat node. On a machine with network access, run

```bash
npm install
npx hardhat node                 # terminal 1
npm run deploy:local              # terminal 2
```

copy the seven addresses into `.env.local`, `npm run dev`, and walk through
register → hire → (session 4) review to confirm the full loop.

## What's explicitly out of scope this session

- **Revenue figures** (`agent.revenueEth`) for chain-backed agents are
  hardcoded to `0` — computing them requires summing `PaymentProcessed`
  events per agent, which is dashboard/analytics territory (Session 4/5).
- **Reviews and version publishing UI** — `Review.submitReview` and
  `VersionControl.pushVersion` are wired into the ABI layer and read by
  `chain-agents.ts`, but there's no write-side UI for them yet; that's the
  "reviews/reputation logic" item on Session 4's list.
- **Featured/trending flags** have no on-chain equivalent (that's an
  admin-panel curation concern per `CONTRACTS.md`'s Session 5 scope) — the
  chain-mode fallback sorts by trust score / usage instead.

## Next session (Session 4)

Per the original roadmap: Dashboard (My Agents, revenue, withdrawals,
review moderation, version publishing UI), the write-side of
reviews/reputation, and Agent Battles.
