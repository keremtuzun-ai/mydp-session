import { cn } from "@/lib/utils";

type Props = { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode; className?: string };

export function PageHeader({ eyebrow, title, description, actions, className }: Props) {
  return (
    <div className={cn("mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="rule-gold pb-3">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="text-3xl font-semibold leading-tight">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
