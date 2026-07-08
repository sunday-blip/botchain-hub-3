"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Menu, X, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/wallet-context";
import { truncateAddress } from "@/lib/utils";

const NAV = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/battles", label: "Agent Battles" },
  { href: "/register", label: "Register Agent" },
  { href: "/dashboard", label: "Dashboard" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { address, connecting, connect, disconnect, isWrongNetwork, switchToExpectedNetwork, error } = useWallet();

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-void/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-gradient text-sm">
            ⛓
          </span>
          BotChain <span className="text-gradient">Hub</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-ink-dim transition-colors hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <button
            aria-label="Search agents"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-dim hover:bg-white/5 hover:text-white"
          >
            <Search className="h-4 w-4" />
          </button>
          {address && isWrongNetwork ? (
            <Button variant="secondary" size="sm" onClick={switchToExpectedNetwork}>
              <Wallet className="h-4 w-4" />
              Wrong network
            </Button>
          ) : address ? (
            <Button variant="secondary" size="sm" onClick={disconnect}>
              <Wallet className="h-4 w-4" />
              <span className="font-mono">{truncateAddress(address)}</span>
            </Button>
          ) : (
            <div className="relative">
              <Button size="sm" onClick={connect} disabled={connecting}>
                <Wallet className="h-4 w-4" />
                {connecting ? "Connecting…" : "Connect Wallet"}
              </Button>
              {error && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-white/10 bg-surface px-3 py-2 text-xs text-ink-dim shadow-glow">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/5 px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm text-ink-dim hover:bg-white/5 hover:text-white"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Button
            className="mt-3 w-full"
            size="sm"
            onClick={address ? disconnect : connect}
            disabled={connecting}
          >
            <Wallet className="h-4 w-4" />
            {address ? truncateAddress(address) : connecting ? "Connecting…" : "Connect Wallet"}
          </Button>
        </div>
      )}
    </header>
  );
}
