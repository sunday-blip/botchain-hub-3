# BotChain Hub — Smart Contracts (Session 2)

Seven contracts, each with one job, wired together with the minimum set of
cross-contract permissions needed to make purchases, reviews, and payouts
trustworthy without any of them trusting each other's internal state.

## The contracts

| Contract | Responsibility | Depends on |
|---|---|---|
| **AgentNFT** | ERC721. `tokenId == agentId`. Owning the NFT *is* owning the agent — revenue and listing control both follow whoever holds it. | — |
| **AgentRegistry** | Registers agents, mints their NFT, stores metadata (ipfsHash, category) and status (Active/Paused/Unpublished). The only contract every other one reads from for "who owns this agent". | AgentNFT |
| **VersionControl** | Append-only version history per agent (`version`, `changelog`, `ipfsHash`, `publishedAt`). Anyone can call `pushVersion`, but it only succeeds if the caller currently owns the agent. | AgentRegistry (read-only) |
| **Marketplace** | Listings (`OneTime`, `Subscription`, `Free`, `Donation`) and the purchase/subscribe/free-usage flows. Computes who has access to what. | AgentRegistry, Payments, Reputation |
| **Payments** | Pull-payment escrow. Splits every payment between the agent's current owner and a platform fee recipient; each side withdraws on their own, so nobody can block a sale. | — (called by Marketplace) |
| **Reputation** | Stores raw counters: `completedJobs`, `ratingSum`/`ratingCount`, `uniqueUsers`, `verifiedCreator`. Does **not** compute a trust score. | — (called by Marketplace + Review) |
| **Review** | One review per (agent, wallet), gated on `Marketplace.hasActiveAccess` so only real users can review. Feeds ratings into Reputation. | Marketplace (read-only), Reputation |

## Why Reputation doesn't compute the trust score on-chain

`src/lib/utils.ts::computeTrustScore` already exists in the Session 1
frontend and takes exactly `{ completedJobs, averageRating, walletAgeDays,
verifiedCreator, uniqueUsers }`. Reimplementing that log-scaled formula in
Solidity would cost real gas on every read and lose precision (no floats).
Instead, Reputation stores the raw inputs, `AgentRegistry.getAgent(id).createdAt`
supplies wallet/agent age, and Session 3 points the *same* frontend function
at on-chain data instead of the mock array in `src/data/agents.ts` — the
formula itself never changes.

## Trust model / access control

- **Ownership-gated writes** (`AgentRegistry.updateMetadata/setStatus`,
  `VersionControl.pushVersion`, `Marketplace.createOrUpdateListing`): each
  checks `AgentRegistry.isOwner(agentId, msg.sender)` directly — no
  privileged relayer, the caller must actually hold the NFT.
- **Contract-to-contract writes** (`Reputation.recordJobCompletion` /
  `recordRating`, `Payments.processPayment`): restricted to a single
  hardcoded address set once by the deployer right after deployment
  (`setMarketplace`, `setReview`). This is the only place trust is placed
  in another contract rather than re-validated.
- **Pull payments everywhere**: `Payments.withdraw()` and all fee logic use
  the accumulate-then-withdraw pattern, so a broken or malicious recipient
  address can never block a purchase from completing.
- **Reselling an agent transfers the business, not just a picture**:
  because Marketplace always asks `AgentRegistry.ownerOf(agentId)` for the
  current owner, selling the AgentNFT immediately redirects future listing
  control *and* payment routing to the buyer. Covered in
  `test/Integration.test.ts`.

## Deployment order (see `scripts/deploy.ts`)

```
AgentNFT
  -> AgentRegistry(agentNFT)
    -> AgentNFT.setMinter(agentRegistry)
  -> VersionControl(agentRegistry)
  -> Reputation()
  -> Payments(feeRecipient, feeBps)
  -> Marketplace(agentRegistry, payments, reputation)
    -> Payments.setMarketplace(marketplace)
    -> Reputation.setMarketplace(marketplace)
  -> Review(marketplace, reputation)
    -> Reputation.setReview(review)
```

## Running this session's work

```bash
npm install                          # pulls in hardhat, hardhat-toolbox, @openzeppelin/contracts
npx hardhat compile
npm run test:contracts               # 7 contract test files + 1 integration test
npx hardhat node                     # in one terminal
npm run deploy:local                 # in another — writes addresses to deployments/
```

> This sandbox has no network access, so these commands haven't been run
> here — `npm install` will need real network access on your machine. The
> contracts are written against Solidity ^0.8.20/0.8.24 and OpenZeppelin
> Contracts v5.x APIs (`Ownable(initialOwner)`, `_requireOwned`, `_ownerOf`),
> which is what `hardhat.config.ts` and `package.json` are pinned to.

## What's tested

- **AgentRegistry / AgentNFT** — registration mints the right tokenId,
  ownership-gated metadata/status updates, ownership follows NFT transfers.
- **VersionControl** — ownership gate, ordering, `latestVersion`.
- **Payments** — fee-bps split math, pull-payment withdrawal, fee cap,
  access control on `processPayment`.
- **Marketplace** — all four pricing models (exact-price OneTime, any-amount
  Donation, stacking Subscription expiry with lapse, always-open Free +
  `useFreeAgent`), can't buy your own agent, payment follows current NFT
  owner after a resale.
- **Reputation** — access control, unique-user counting, scaled rating
  average, verified flag is admin-only and independent of activity.
- **Review** — access-gated submission (purchase or Free tier required),
  one review per wallet, like-once, owner-only moderation flag.
- **Integration** — the full lifecycle: register → publish version → list →
  two purchases → two reviews → admin verifies → stats read back into the
  existing `computeTrustScore` formula → both parties withdraw → resale
  mid-lifecycle redirects future revenue.

## Next session (Session 3)

Wallet connection (ethers.js `BrowserProvider` + MetaMask, replacing the
mock `connect()` in `src/contexts/wallet-context.tsx`), IPFS/Pinata metadata
pinning for `register`/`updateMetadata`/`pushVersion` calls, and rewriting
`src/data/agents.ts`'s functions to read from these contracts instead of the
mock array — the components themselves shouldn't need to change.
