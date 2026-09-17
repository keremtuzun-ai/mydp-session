import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/mun/empty-state";
import { LiveRefresh } from "@/components/mun/live-refresh";
import { TaskStatusBadge } from "@/components/mun/task-status-badge";
import { tallyTopic } from "@/lib/realtime/topics";
import { TALLY_KINDS, TALLY_LABEL, isTallyKind, tallyCountries } from "@/lib/tally";
import { fmt } from "@/lib/utils";
import { TallyBoard } from "./tally-board";

export const metadata: Metadata = { title: "Tally" };

/**
 * The live board counts the newest task's countries; a new task starts a new
 * board. Below it every task's tally stays on record: each country's totals
 * and every speech, POI and objection with its time.
 */
export default async function ExecTallyPage() {
  const supabase = await createClient();
  const [{ data: tasks }, { data: uploads }, { data: tallies }, { data: events }] = await Promise.all([
    supabase.from("tasks").select("id, title, status, committee_label, countries, created_at").order("created_at", { ascending: false }),
    supabase.from("task_uploads").select("task_id, delegation, created_at").order("created_at", { ascending: true }),
    supabase.from("task_tallies").select("*"),
    supabase.from("task_tally_events").select("*").order("recorded_at", { ascending: true }),
  ]);
  const allTasks = tasks ?? [];
  const current = allTasks[0];
  if (!current) {
    return (
      <section className="card">
        <EmptyState title="No task yet" className="empty-state-sm" />
      </section>
    );
  }

  const rowsFor = (task: (typeof allTasks)[number]) => {
    const saved = (tallies ?? []).filter((t) => t.task_id === task.id);
    const byKey = new Map(saved.map((t) => [t.country_key, t]));
    const submitted = (uploads ?? []).filter((u) => u.task_id === task.id).map((u) => u.delegation);
    return tallyCountries(task.countries ?? [], [...submitted, ...saved.map((t) => t.country)]).map(({ key, country }) => {
      const t = byKey.get(key);
      return { key, country, speeches: t?.speeches ?? 0, pois: t?.pois ?? 0, objections: t?.objections ?? 0 };
    });
  };

  const rows = rowsFor(current);
  const records = allTasks
    .map((task) => ({ task, rows: rowsFor(task), log: (events ?? []).filter((e) => e.task_id === task.id) }))
    .filter((r) => r.rows.length > 0 || r.log.length > 0);

  return (
    <div className="flex flex-col gap-5">
      <section className="card">
        <LiveRefresh topic={tallyTopic(current.id)} />
        <div className="section-head flex-wrap">
          <h2>Tally</h2>
          <span className="tab-count">{rows.length}</span>
          <Link href={`/calendar/${current.id}`} className="section-tail prose-link">
            {current.title}
          </Link>
        </div>
        {rows.length ? (
          <TallyBoard taskId={current.id} rows={rows} />
        ) : (
          <EmptyState title="No countries in this task" className="empty-state-sm" action={<Link href={`/calendar/${current.id}/edit`} className="btn btn-sm btn-outline">Add countries</Link>} />
        )}
      </section>

      <h2 className="m-0">Records</h2>
      {records.length === 0 ? (
        <section className="card">
          <EmptyState title="Nothing tallied yet" className="empty-state-sm" />
        </section>
      ) : (
        records.map(({ task, rows: taskRows, log }) => (
          <section key={task.id} className="card">
            <div className="section-head flex-wrap">
              <h2>
                <Link href={`/calendar/${task.id}`} className="row-title">
                  {task.title}
                </Link>
              </h2>
              {task.committee_label ? <span className="chip chip-navy">{task.committee_label}</span> : null}
              <TaskStatusBadge status={task.status} />
              {task.id === current.id ? <span className="chip chip-dot">Live</span> : null}
              <span className="tab-count">{fmt(task.created_at, "d MMM yyyy")}</span>
            </div>
            <div className="table-scroll">
              <table className="data-table stack speech-tally">
                <thead>
                  <tr>
                    <th>Country</th>
                    {TALLY_KINDS.map((k) => (
                      <th key={k}>{TALLY_LABEL[k]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {taskRows.map((r) => (
                    <tr key={r.key}>
                      <td data-label="Country" className="font-[650]">{r.country}</td>
                      {TALLY_KINDS.map((k) => (
                        <td key={k} data-label={TALLY_LABEL[k]} className="num">{r[k]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">Total</th>
                    {TALLY_KINDS.map((k) => (
                      <td key={k} data-label={TALLY_LABEL[k]} className="num speech-total">{taskRows.reduce((sum, r) => sum + r[k], 0)}</td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
            {log.length ? (
              <details className="task-files mt-2">
                <summary>Log ({log.length})</summary>
                <ol className="tally-log">
                  {[...log].reverse().map((e) => (
                    <li key={e.id}>
                      <span className="num muted">{fmt(e.recorded_at, "d MMM HH:mm:ss")}</span>
                      <span className="font-[650]">{e.country}</span>
                      <span>
                        {e.delta > 0 ? "+1" : "−1"} {isTallyKind(e.kind) ? TALLY_LABEL[e.kind] : e.kind}
                      </span>
                      <span className="num muted">= {e.total_after}</span>
                    </li>
                  ))}
                </ol>
              </details>
            ) : null}
          </section>
        ))
      )}
    </div>
  );
}
