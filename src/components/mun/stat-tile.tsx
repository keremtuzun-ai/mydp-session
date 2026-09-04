import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function StatTile({ label, value, hint, icon: Icon }: { label: string; value: string | number; hint?: string; icon?: LucideIcon }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <p className="eyebrow">{label}</p>
        {Icon ? <Icon className="size-4 text-gold-deep" aria-hidden /> : null}
      </div>
      <p className="mt-1 font-display text-3xl font-semibold">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}
