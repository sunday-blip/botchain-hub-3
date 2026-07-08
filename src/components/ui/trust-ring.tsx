"use client";

import { cn, trustScoreLabel } from "@/lib/utils";

/**
 * Signature visual for BotChain Hub: every agent's reputation is a single
 * ring, not a star rating. The fill traces the score out of 100 using a
 * conic gradient (cyan -> purple -> blue), so a viewer can compare agents
 * at a glance the same way they'd compare a battery or signal strength.
 */
export function TrustRing({
  score,
  size = 56,
  showLabel = false,
  className,
}: {
  score: number;
  size?: number;
  showLabel?: boolean;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, score));
  const stroke = size * 0.09;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="relative shrink-0"
        style={{ width: size, height: size }}
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Trust score ${pct} out of 100`}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={stroke}
          />
          <defs>
            <linearGradient id={`trust-grad-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22D3EE" />
              <stop offset="55%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#trust-grad-${size})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center font-display font-semibold text-ink"
          style={{ fontSize: size * 0.28 }}
        >
          {pct}
        </div>
      </div>
      {showLabel && (
        <div className="flex flex-col leading-tight">
          <span className="text-xs text-ink-dim">Trust score</span>
          <span className="text-sm font-medium text-ink">{trustScoreLabel(pct)}</span>
        </div>
      )}
    </div>
  );
}
