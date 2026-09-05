import Link from "next/link";
import { appName } from "@/lib/env";
import { cn } from "@/lib/utils";

const EMBLEM = "/img/koc-mun-club.svg";

/**
 * Koç MUN Club lockup: the club's emblem (the UN-style polar globe used on
 * @koc_munclub, redrawn as a vector) next to a two-line wordmark. `height`
 * drives both the emblem and the wordmark through the --brand-h custom
 * property, so the same component works in the masthead and the hero.
 */
export function BrandLogo({ className, height = 48, wordmark = true }: { className?: string; height?: number; wordmark?: boolean }) {
  return (
    <span className={cn("brand-lockup", className)} style={{ "--brand-h": `${height}px` } as React.CSSProperties}>
      <img src={EMBLEM} alt="Koç MUN Club" className="brand-logo" width={height} height={height} />
      {wordmark ? (
        <span className="brand-wordmark" aria-hidden>
          <span className="brand-wordmark-top">Koç School</span>
          <span className="brand-wordmark-main">MUN Club</span>
        </span>
      ) : null}
    </span>
  );
}

/** The emblem alone, used as a seal on auth cards. */
export function BrandMark({ className }: { className?: string }) {
  return <img src={EMBLEM} alt="Koç MUN Club emblem" className={cn("brand-emblem", className)} />;
}

export function Brand({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="masthead-brand" aria-label={appName}>
      <BrandLogo height={compact ? 38 : 48} />
    </Link>
  );
}
