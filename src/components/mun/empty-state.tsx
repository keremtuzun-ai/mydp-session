import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = { icon?: LucideIcon; title: string; description?: string; action?: React.ReactNode; className?: string };

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: Props) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/60 px-6 py-12 text-center", className)}>
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Icon className="size-5" aria-hidden />
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
