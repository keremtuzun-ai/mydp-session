import Link from "next/link";
import { appName } from "@/lib/env";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn("size-8", className)}>
      <circle cx="20" cy="20" r="18" fill="var(--navy)" />
      <circle cx="20" cy="20" r="18" fill="none" stroke="var(--gold)" strokeWidth="1.5" />
      <path d="M20 8 L20 32 M8 20 L32 20 M11.5 11.5 L28.5 28.5 M28.5 11.5 L11.5 28.5" stroke="var(--gold)" strokeWidth="1" opacity="0.6" />
      <circle cx="20" cy="20" r="6" fill="var(--paper)" />
      <circle cx="20" cy="20" r="2.2" fill="var(--gold-deep)" />
    </svg>
  );
}

export function Brand({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
      <BrandMark />
      {!compact ? (
        <span className="leading-tight">
          <span className="block font-display text-base font-semibold">{appName}</span>
          <span className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Weekly sessions</span>
        </span>
      ) : null}
    </Link>
  );
}
