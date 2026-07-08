import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { TrustScoreBreakdown } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, 2 + chars)}...${address.slice(-chars)}`;
}

export function formatEth(amount: number): string {
  if (amount === 0) return "Free";
  if (amount < 0.001) return `${(amount * 1000).toFixed(2)} mΞ`;
  return `${amount.toFixed(amount < 1 ? 3 : 2)} Ξ`;
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(value);
}

/**
 * Trust Score formula (0-100 scale):
 * Weighted composite of completed jobs, average rating, wallet age,
 * verification status, and unique user count. Diminishing returns
 * applied via log scaling so no single high-volume metric dominates.
 */
export function computeTrustScore(input: {
  completedJobs: number;
  averageRating: number;
  walletAgeDays: number;
  verifiedCreator: boolean;
  uniqueUsers: number;
}): number {
  const jobsScore = Math.min(Math.log10(input.completedJobs + 1) * 18, 30);
  const ratingScore = (input.averageRating / 5) * 30;
  const ageScore = Math.min(Math.log10(input.walletAgeDays + 1) * 8, 15);
  const usersScore = Math.min(Math.log10(input.uniqueUsers + 1) * 12, 20);
  const verifiedBonus = input.verifiedCreator ? 5 : 0;

  const total = jobsScore + ratingScore + ageScore + usersScore + verifiedBonus;
  return Math.round(Math.min(total, 100));
}

export function buildTrustScore(
  partial: Omit<TrustScoreBreakdown, "score">
): TrustScoreBreakdown {
  return { ...partial, score: computeTrustScore(partial) };
}

export function trustScoreLabel(score: number): string {
  if (score >= 85) return "Elite";
  if (score >= 70) return "Trusted";
  if (score >= 50) return "Established";
  if (score >= 25) return "Emerging";
  return "New";
}

export function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}
