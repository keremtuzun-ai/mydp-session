import { cn } from "@/lib/utils";

/** Committee code, set in the display face the way the portal sets APQ / CCPCJ. */
export function CommitteeSeal({ acronym, size = "md", className }: { acronym: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const sizes = { sm: "text-[0.95rem]", md: "text-[1.2rem]", lg: "text-[2rem]" };
  return (
    <span aria-hidden className={cn("font-serif font-[650] tracking-[-0.01em] text-ink", sizes[size], className)}>
      {acronym}
    </span>
  );
}

export function CommitteeTag({ acronym }: { acronym: string }) {
  return <span className="chip chip-navy">{acronym}</span>;
}
