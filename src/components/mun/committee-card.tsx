import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CommitteeSeal } from "@/components/mun/committee-badge";
import type { Committee } from "@/lib/types/database";
import { Users } from "lucide-react";

type Props = {
  committee: Pick<Committee, "slug" | "acronym" | "name" | "category" | "description" | "is_open">;
  chairNames: string[];
  memberCount?: number;
  isMine?: boolean;
};

export function CommitteeCard({ committee, chairNames, memberCount, isMine }: Props) {
  return (
    <Link href={`/committees/${committee.slug}`} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
      <Card className="card-lift h-full p-5">
        <div className="flex items-start gap-4">
          <CommitteeSeal acronym={committee.acronym} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold leading-tight group-hover:underline decoration-gold-deep underline-offset-4">
                {committee.name}
              </h3>
              {isMine ? <Badge variant="gold">Yours</Badge> : null}
            </div>
            <p className="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">{committee.category}</p>
          </div>
          <Badge variant={committee.is_open ? "success" : "muted"}>{committee.is_open ? "Open" : "Closed"}</Badge>
        </div>
        {committee.description ? <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{committee.description}</p> : null}
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">Chairs:</span> {chairNames.length ? chairNames.join(", ") : "To be announced"}
          </span>
          {typeof memberCount === "number" ? (
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" aria-hidden />
              {memberCount}
            </span>
          ) : null}
        </div>
      </Card>
    </Link>
  );
}
