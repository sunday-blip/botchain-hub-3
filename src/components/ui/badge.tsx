import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Badge({
  children,
  className,
  variant = "default",
}: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "verified" | "trending" | "outline";
}) {
  const styles = {
    default: "bg-white/5 text-ink-dim border-white/10",
    verified: "bg-signal-cyan/10 text-signal-cyan border-signal-cyan/30",
    trending: "bg-signal-purple/10 text-signal-purple border-signal-purple/30",
    outline: "bg-transparent text-ink-dim border-border",
  }[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles,
        className
      )}
    >
      {children}
    </span>
  );
}
