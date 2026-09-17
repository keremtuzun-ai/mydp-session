import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/mun/empty-state";
import { LiveRefresh } from "@/components/mun/live-refresh";
import { tallyTopic } from "@/lib/realtime/topics";
import { tallyCountries } from "@/lib/tally";
import { TallyBoard } from "./tally-board";

export const metadata: Metadata = { title: "Tally" };

/** The newest task's countries, each with its speeches, POIs and objections. A new task starts a new list. */
export default async function ExecTallyPage() {
  const supabase = await createClient();
  const { data: task } = await supabase.from("tasks").select("id, title, countries").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!task) {
    return (
      <section className="card">
        <EmptyState title="No task yet" className="empty-state-sm" />
      </section>
    );
  }
  const [{ data: uploads }, { data: tallies }] = await Promise.all([
    supabase.from("task_uploads").select("delegation, created_at").eq("task_id", task.id).order("created_at", { ascending: true }),
    supabase.from("task_tallies").select("*").eq("task_id", task.id),
  ]);
  const saved = tallies ?? [];
  const byKey = new Map(saved.map((t) => [t.country_key, t]));
  const rows = tallyCountries(task.countries ?? [], [...(uploads ?? []).map((u) => u.delegation), ...saved.map((t) => t.country)]).map(({ key, country }) => {
    const t = byKey.get(key);
    return { key, country, speeches: t?.speeches ?? 0, pois: t?.pois ?? 0, objections: t?.objections ?? 0 };
  });

  return (
    <section className="card">
      <LiveRefresh topic={tallyTopic(task.id)} />
      <div className="section-head flex-wrap">
        <h2>Tally</h2>
        <span className="tab-count">{rows.length}</span>
        <Link href={`/calendar/${task.id}`} className="section-tail prose-link">
          {task.title}
        </Link>
      </div>
      {rows.length ? (
        <TallyBoard taskId={task.id} rows={rows} />
      ) : (
        <EmptyState title="No countries in this task" className="empty-state-sm" action={<Link href={`/calendar/${task.id}/edit`} className="btn btn-sm btn-outline">Add countries</Link>} />
      )}
    </section>
  );
}
