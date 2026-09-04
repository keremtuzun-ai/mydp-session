import { cn } from "@/lib/utils";

/** Square seal-style acronym mark used across cards and lists. */
export function CommitteeSeal({ acronym, size = "md", className }: { acronym: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const sizes = { sm: "size-8 text-[10px]", md: "size-11 text-xs", lg: "size-16 text-base" };
  return (
    <div
      aria-hidden
      className={cn(
        "seal flex shrink-0 items-center justify-center rounded-md bg-navy font-display font-semibold uppercase tracking-wider text-primary-foreground dark:bg-navy-deep",
        sizes[size],
        className,
      )}
    >
      {acronym.slice(0, 6)}
    </div>
  );
}
