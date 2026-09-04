import Link from "next/link";
import { appName } from "@/lib/env";
import { cn } from "@/lib/utils";

/**
 * Official MUNDP 2027 lockup from modelundp.org. The blue edition prints on
 * Day paper, the white edition on Night; CSS swaps them per data-theme.
 */
export function BrandLogo({ className, height = 48 }: { className?: string; height?: number }) {
  return (
    <span className={cn("inline-flex", className)}>
      <img src="/img/mundp-2027-logo-blue.webp" alt="MUNDP 2027 — Commitment to Development" className="brand-logo brand-logo-day" style={{ height }} />
      <img src="/img/mundp-2027-logo-white.webp" alt="" aria-hidden className="brand-logo brand-logo-night" style={{ height }} />
    </span>
  );
}

/** The emblem alone (globe over the helix), used as a seal on auth cards. */
export function BrandMark({ className }: { className?: string }) {
  return <img src="/img/mundp-emblem.svg" alt="MUNDP emblem" className={cn("brand-emblem", className)} />;
}

export function Brand({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="masthead-brand" aria-label={appName}>
      <BrandLogo height={compact ? 38 : 48} />
    </Link>
  );
}
