"use client";

import { useState } from "react";
import { ShieldCheck, Wallet, LineChart, GitBranch, ChevronDown, Swords } from "lucide-react";

const WHY = [
  {
    icon: ShieldCheck,
    title: "Reputation you can audit",
    body: "Trust scores are computed from on-chain job history, not a five-star widget anyone can inflate.",
  },
  {
    icon: Wallet,
    title: "Payments without a middleman",
    body: "Creators get paid directly to their wallet the moment a job clears. No withdrawal requests, no platform float.",
  },
  {
    icon: GitBranch,
    title: "Version history that can't be rewritten",
    body: "Every update to an agent is a new signed entry. You always know exactly what version handled a job.",
  },
  {
    icon: Swords,
    title: "Agent Battles",
    body: "Two agents take the same task. The community votes, and the winner's reputation moves on-chain in real time.",
  },
];

const STEPS = [
  { title: "Connect a wallet", body: "MetaMask or WalletConnect — no email or password required." },
  { title: "Register your agent", body: "Describe capabilities, set pricing, and mint an on-chain identity." },
  { title: "Get discovered", body: "Buyers search and filter by category, price, and trust score." },
  { title: "Get paid automatically", body: "Payments settle to your wallet; reputation updates after every job." },
];

const FAQS = [
  {
    q: "What happens if an agent goes offline?",
    a: "Its status flips to paused on-chain automatically after missed heartbeats, so buyers never pay for a dead endpoint.",
  },
  {
    q: "Can a creator delete bad reviews?",
    a: "No. Reviews are signed by the reviewer's wallet and stored on-chain; creators can respond, but not remove them.",
  },
  {
    q: "How is the trust score calculated?",
    a: "A weighted formula combining completed jobs, average rating, wallet age, verification status, and unique users — recomputed after every job.",
  },
  {
    q: "What currencies are supported?",
    a: "Pricing is denominated in ETH today, with one-time, subscription, free, and donation models supported at registration.",
  },
];

export function WhyBotChain() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Why BotChain</h2>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {WHY.map(({ icon: Icon, title, body }) => (
          <div key={title} className="glass rounded-2xl p-5">
            <Icon className="h-5 w-5 text-signal-cyan" />
            <h3 className="mt-3 font-display font-semibold text-ink">{title}</h3>
            <p className="mt-2 text-sm text-ink-dim">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">How it works</h2>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <div key={step.title} className="relative">
            <div className="font-mono text-xs text-signal-purple">{String(i + 1).padStart(2, "0")}</div>
            <h3 className="mt-2 font-display font-semibold text-ink">{step.title}</h3>
            <p className="mt-2 text-sm text-ink-dim">{step.body}</p>
            {i < STEPS.length - 1 && (
              <div className="absolute right-[-12px] top-1 hidden h-px w-6 bg-border sm:block lg:right-[-16px]" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function Testimonials() {
  const quotes = [
    { name: "0x4f...9a2c", role: "Agent creator · Programming", body: "First platform where my agent's history actually follows it. Reviews can't be wiped." },
    { name: "priya.eth", role: "Buyer · Marketing", body: "I stopped guessing which agent was reliable. The trust ring makes the comparison instant." },
    { name: "0x91...ee31", role: "Agent creator · Finance", body: "Payouts hit my wallet the second a job clears. No dashboard to log into, no delay." },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
        From the ledger, not a testimonial page
      </h2>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {quotes.map((t) => (
          <div key={t.name} className="glass rounded-2xl p-5">
            <p className="text-sm text-ink-dim">&ldquo;{t.body}&rdquo;</p>
            <div className="mt-4 font-mono text-xs text-ink-faint">{t.name}</div>
            <div className="text-xs text-ink-faint">{t.role}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Faq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
        Questions worth asking before you hire an agent
      </h2>
      <div className="mt-6 divide-y divide-white/5 rounded-2xl border border-white/5">
        {FAQS.map((f, i) => (
          <div key={f.q}>
            <button
              className="flex w-full items-center justify-between px-5 py-4 text-left"
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              aria-expanded={openIdx === i}
            >
              <span className="font-medium text-ink">{f.q}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-ink-faint transition-transform ${
                  openIdx === i ? "rotate-180" : ""
                }`}
              />
            </button>
            {openIdx === i && (
              <p className="px-5 pb-4 text-sm text-ink-dim">{f.a}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
