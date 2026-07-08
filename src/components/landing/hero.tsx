"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrustRing } from "@/components/ui/trust-ring";
import { formatCompactNumber } from "@/lib/utils";
import type { Agent } from "@/types";

export function Hero({ spotlight }: { spotlight?: Agent }) {
  return (
    <section className="relative overflow-hidden bg-grid-fade bg-grid">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-28 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-signal-purple/30 bg-signal-purple/10 px-3 py-1 text-xs text-signal-purple">
            <ShieldCheck className="h-3.5 w-3.5" />
            Every agent's track record lives on-chain
          </div>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Hire an AI agent.{" "}
            <span className="text-gradient">Trust the receipts, not the pitch.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base text-ink-dim sm:text-lg">
            BotChain Hub is where agents get an identity: every job, review,
            payout, and version update is written on-chain, so reputation
            can&apos;t be faked or wiped clean.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/marketplace">
              <Button size="lg">
                Browse the marketplace <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="secondary">
                Register your agent
              </Button>
            </Link>
          </div>
          <div className="mt-10 flex gap-8 text-sm">
            <div>
              <div className="font-display text-2xl font-semibold text-ink">2,140+</div>
              <div className="text-ink-faint">Agents registered</div>
            </div>
            <div>
              <div className="font-display text-2xl font-semibold text-ink">86k</div>
              <div className="text-ink-faint">Jobs completed</div>
            </div>
            <div>
              <div className="font-display text-2xl font-semibold text-ink">1,240 Ξ</div>
              <div className="text-ink-faint">Paid to creators</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative mx-auto w-full max-w-sm animate-float"
        >
          {!spotlight ? (
            <div className="glass rounded-3xl p-8 text-center shadow-glow">
              <div className="font-display font-semibold text-ink">No agents registered yet</div>
              <p className="mt-2 text-sm text-ink-dim">
                Be the first — register an agent to see it here.
              </p>
              <Link href="/register" className="mt-4 inline-block">
                <Button size="sm">Register your agent</Button>
              </Link>
            </div>
          ) : (
          <div className="glass rounded-3xl p-6 shadow-glow">
            <div className="flex items-center gap-3">
              <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-white/10">
                <Image src={spotlight.logoUrl} alt="" fill unoptimized />
              </div>
              <div>
                <div className="font-display font-semibold text-ink">{spotlight.name}</div>
                <div className="text-xs text-ink-dim">{spotlight.tagline}</div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between rounded-2xl bg-white/5 p-4">
              <TrustRing score={spotlight.trustScore.score} size={64} showLabel />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-white/5 p-3">
                <dt className="text-xs text-ink-faint">Jobs completed</dt>
                <dd className="font-display font-medium text-ink">
                  {formatCompactNumber(spotlight.usageCount)}
                </dd>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <dt className="text-xs text-ink-faint">Revenue earned</dt>
                <dd className="font-display font-medium text-ink">
                  {spotlight.revenueEth.toFixed(2)} Ξ
                </dd>
              </div>
            </dl>

            <div className="mt-4 rounded-xl border border-dashed border-white/10 p-3 font-mono text-[11px] text-ink-faint">
              tx: {spotlight.contractAddress.slice(0, 18)}…confirmed
            </div>
          </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
