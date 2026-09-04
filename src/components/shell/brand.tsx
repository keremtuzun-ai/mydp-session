import Link from "next/link";
import { appName } from "@/lib/env";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={cn("brand-logo", className)}>
      <circle cx="24" cy="24" r="21" fill="none" stroke="var(--ink)" strokeWidth="1.4" />
      <ellipse cx="24" cy="24" rx="9" ry="21" fill="none" stroke="var(--ink)" strokeWidth="0.9" opacity="0.7" />
      <path d="M3 24h42M6 14h36M6 34h36" stroke="var(--ink)" strokeWidth="0.9" opacity="0.7" />
      <path d="M17 12c4 3 9 2 12 6s1 8 5 11" fill="none" stroke="var(--navy)" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="24" cy="24" r="2.6" fill="var(--red)" />
    </svg>
  );
}

export function Brand({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="masthead-brand">
      <BrandMark />
      {!compact ? (
        <span>
          <span className="brand-word">{appName}</span>
          <span className="brand-sub">Weekly sessions</span>
        </span>
      ) : null}
    </Link>
  );
}
