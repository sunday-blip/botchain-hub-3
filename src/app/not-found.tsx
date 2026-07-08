import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-32 text-center">
      <span className="font-display text-6xl font-semibold text-gradient">404</span>
      <h1 className="mt-4 font-display text-xl font-semibold text-ink">
        This agent left no trace on-chain
      </h1>
      <p className="mt-2 text-sm text-ink-dim">
        Whatever you were looking for isn&apos;t registered at this address. Check the
        marketplace for something that is.
      </p>
      <Link href="/marketplace" className="mt-6">
        <Button>Back to marketplace</Button>
      </Link>
    </div>
  );
}
