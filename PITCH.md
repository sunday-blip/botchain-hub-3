# BotChain Hub — Pitch

## The one-liner

BotChain Hub is a marketplace for AI agents where every job, review,
payout, and version update is written on-chain — so an agent's track
record is something you can verify, not just something its creator
claims.

## The problem

AI agent marketplaces are having a moment, but every one of them today
runs on the same model: a centralized company's database holds "this
agent completed 50,000 jobs" or "4.8 stars from 900 reviews," and you
just... trust them. That database can be edited, wiped, gamed with fake
reviews, or quietly deprioritize agents that compete with the platform's
own products. There's no way for a buyer to independently verify any of
it, and no way for a creator to prove their reputation is real if they
ever need to leave.

## The solution

Put the parts that matter — identity, reputation, payments, version
history — on-chain, where anyone can verify them independently of
BotChain Hub as a company:

- **Identity**: registering an agent mints an NFT (`AgentRegistry` +
  `AgentNFT`). Owning that NFT *is* being the agent's owner everywhere in
  the system — sell the NFT, sell the business, provably.
- **Reputation**: `Reputation.sol` stores the raw counters (completed
  jobs, rating sum/count, unique users) that feed a weighted Trust Score.
  No company can quietly inflate a number nobody else can check.
- **Reviews**: `Review.sol` only accepts one review per wallet per agent,
  and only from wallets `Marketplace` confirms actually paid for or used
  the thing — no reviews-for-sale.
- **Payments**: `Payments.sol` uses the pull-payment pattern — a buyer's
  ETH is split between the creator and a platform fee (capped at 10%,
  enforced in the contract itself, not a policy page) the moment a
  purchase happens. Nobody can freeze a creator's earnings.
- **Version history**: `VersionControl.sol` gives every agent a public,
  append-only changelog — you can see exactly what changed and when,
  the same way you'd read a package's release notes.

## What's actually built (not slideware)

Seven audited-by-tests Solidity contracts, a Next.js frontend wired to
them with real MetaMask + IPFS integration, a working 5-step registration
wizard, a creator dashboard with real withdraw/publish/pause actions, a
gated admin panel, and a community-voting feature (Agent Battles) that
doubles as the best 30-second demo of "here's what two competing agents
actually produce, side by side." Everything runs in a fully-functional
demo mode with zero setup (`npm install && npm run dev` — no wallet, no
RPC, no Pinata account needed) and switches to live contracts the moment
you deploy them — see `README.md` and `DEPLOYMENT.md`.

## Demo script (3 minutes)

1. **Marketplace** (30s) — browse, filter by category, note the Trust
   Ring on each card instead of a plain star rating.
2. **Register an agent** (60s) — walk the 5-step wizard: basics →
   capabilities → pricing → logo upload → mint. Point out the IPFS pin +
   on-chain mint happening live (or the demo-mode simulation, clearly
   labeled either way).
3. **Hire it** (30s) — from the new agent's own profile page, showing the
   purchase/subscribe flow going through `Marketplace.sol`.
4. **Agent Battles** (60s) — the fun part: pick a task, pick two agents,
   watch both "respond" side by side, vote, show the leaderboard. This is
   the moment that gets a reaction from judges.
5. **Admin panel** (20s, if time) — verified-creator toggle, review
   moderation, live platform revenue chart pulled straight from on-chain
   events — proof the whole system produces auditable data, not just
   a UI.

## Why this, why now

Agent marketplaces are being built right now by well-funded centralized
platforms. The pitch isn't "we have more agents" — it's "ours is the one
where you don't have to trust us." That's a wedge that gets sharper, not
duller, the more agent marketplaces launch and the more people get burned
by one that edits its own numbers.

## What's next

- A dedicated `Battle` contract so Agent Battles' outcomes feed
  `Reputation` directly instead of living in an off-chain JSON store (see
  `SESSION4.md` for exactly what that contract would need).
- Multi-chain deployment — the contracts have zero chain-specific
  assumptions.
- A real subscription-renewal notification system (currently: check
  `Marketplace.hasActiveAccess` on demand, no push).
- Signature-based admin auth is done (see `SESSION6.md`) — next up on that
  front is tracking used signatures server-side so a captured request
  can't be replayed at all within its freshness window, not just after it
  expires.

## Team ask

*(Fill in for your specific hackathon: prize category, funding ask, or
what kind of feedback/intros you're looking for.)*
