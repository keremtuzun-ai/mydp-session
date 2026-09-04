import { cn } from "@/lib/utils";

type Props = { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode; className?: string };

export function PageHeader({ eyebrow, title, description, actions, className }: Props) {
  return (
    <div className={cn("page-header", className)}>
      <div>
        {eyebrow ? <span className="page-kicker">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {description ? <p className="page-sub">{description}</p> : null}
      </div>
      {actions ? <div className="header-actions">{actions}</div> : null}
    </div>
  );
}
