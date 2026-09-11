import Link from "next/link";
import type { Db } from "@/lib/data/queries";
import { displayDelegation } from "@/lib/resolutions";
import { LiveRefresh } from "@/components/mun/live-refresh";
import { RESOLUTIONS_TOPIC } from "@/lib/realtime/topics";

/**
 * Every resolution with an open voting round, as a live strip on the
 * dashboard: it appears the moment the desk opens voting and goes away when
 * the round closes, without a reload.
 */
export async function LiveVoting({ db }: { db: Db }) {
  const { data: open } = await db.from("resolution_votings").select("delegation_key, opened_at").eq("status", "open").order("opened_at", { ascending: false });
  const rounds = open ?? [];
  const keys = rounds.map((r) => r.delegation_key);
  const { data: pubs } = keys.length ? await db.from("resolution_publications").select("delegation_key, delegation").in("delegation_key", keys) : { data: [] };
  const names = new Map((pubs ?? []).map((p) => [p.delegation_key, displayDelegation(p.delegation)]));
  return (
    <>
      <LiveRefresh topic={RESOLUTIONS_TOPIC} />
      {rounds.length ? (
        <section className="card card-tight voting-live-strip" aria-live="polite">
          <div className="section-head">
            <h2>
              <span className="chip chip-red">
                <span className="voting-dot" aria-hidden />
                Voting open
              </span>
            </h2>
            <Link href="/resolutions" className="section-tail prose-link">
              All resolutions
            </Link>
          </div>
          <ul className="voting-live-list">
            {rounds.map((r) => (
              <li key={r.delegation_key}>
                <Link href={`/resolutions/${encodeURIComponent(r.delegation_key)}`} className="btn btn-sm">
                  Vote on {names.get(r.delegation_key) ?? displayDelegation(r.delegation_key)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
