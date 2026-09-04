import Link from "next/link";
import type { Committee } from "@/lib/types/database";

type Props = {
  committee: Pick<Committee, "slug" | "acronym" | "name" | "category" | "description" | "is_open">;
  chairNames: string[];
  memberCount?: number;
  isMine?: boolean;
};

/** The portal's committee tile: media area with a category chip, name, description, "Open committee →". */
export function CommitteeCard({ committee, chairNames, memberCount, isMine }: Props) {
  return (
    <Link href={`/committees/${committee.slug}`} className="cm-card">
      <div className="cm-card__media">
        <div className="cm-card__media-art">
          <CommitteeArt acronym={committee.acronym} />
        </div>
        <span className="cm-chip">{isMine ? "Your committee" : committee.category}</span>
        {!committee.is_open ? <span className="cm-chip left-auto right-3">Closed</span> : null}
      </div>
      <div className="cm-card__body">
        <h3 className="cm-card__name">{committee.acronym}</h3>
        <p className="cm-card__desc">{committee.name}</p>
        <p className="cm-card__desc faint">
          {chairNames.length ? `Chairs: ${chairNames.join(", ")}` : "Chairs to be announced"}
          {typeof memberCount === "number" ? ` · ${memberCount} member${memberCount === 1 ? "" : "s"}` : ""}
        </p>
        <div className="cm-card__actions">
          <span className="cm-card__link">
            Open committee
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Contour-line art in the tile's media area, in the edition's ink. */
function CommitteeArt({ acronym }: { acronym: string }) {
  return (
    <svg viewBox="0 0 320 200" className="h-full w-full" aria-hidden>
      <defs>
        <clipPath id={`clip-${acronym}`}>
          <rect width="320" height="200" />
        </clipPath>
      </defs>
      <g clipPath={`url(#clip-${acronym})`} fill="none" stroke="var(--ink)" strokeWidth="1" opacity="0.28">
        {Array.from({ length: 9 }).map((_, i) => (
          <path key={i} d={`M-20 ${20 + i * 22} C 60 ${i * 22 - 10}, 120 ${50 + i * 22}, 180 ${20 + i * 22} S 300 ${i * 22}, 340 ${30 + i * 22}`} />
        ))}
      </g>
      <text x="160" y="118" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="700" fontSize="56" fill="var(--ink)" opacity="0.9" letterSpacing="-1">
        {acronym}
      </text>
    </svg>
  );
}
