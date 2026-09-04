import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getNameMap, nameOf } from "@/lib/data/queries";
import { EmptyState } from "@/components/mun/empty-state";
import { AttendanceBadge } from "@/components/mun/session-status-badge";
import { RollCallEveryone, SessionPicker } from "./roll-call-everyone";
import { fmt } from "@/lib/utils";
import type { Enums } from "@/lib/types/database";

export const metadata: Metadata = { title: "Attendance" };

export default async function ExecAttendancePage({ searchParams }: PageProps<"/exec/attendance">) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: sessions }, { data: people }, { data: records }] = await Promise.all([
    supabase.from("weekly_sessions").select("id, title, starts_at, status").neq("status", "draft").order("starts_at", { ascending: false }),
    supabase.from("public_profiles").select("id, display_name, username, role").not("display_name", "is", null).order("display_name"),
    supabase.from("attendance_records").select("*"),
  ]);
  const sessionList = sessions ?? [];
  const everyone = (people ?? []).filter((p) => p.role !== "admin");
  const names = await getNameMap(supabase, everyone.map((p) => p.id));
  const selected = typeof sp.session === "string" ? sp.session : sessionList.find((s) => new Date(s.starts_at).getTime() <= Date.now())?.id ?? sessionList[0]?.id ?? "";
  const recs = records ?? [];
  const forSelected = new Map(recs.filter((r) => r.session_id === selected).map((r) => [r.profile_id, r]));

  const members = everyone.map((p) => ({ profileId: p.id, name: nameOf(names, p.id), role: p.role, status: (forSelected.get(p.id)?.status ?? null) as Enums<"attendance_status"> | null, note: forSelected.get(p.id)?.note ?? null }));
  const pastSessions = sessionList.filter((s) => new Date(s.starts_at).getTime() <= Date.now()).slice(0, 12);

  return (
    <div className="flex flex-col gap-5">
      <section className="card">
        <div className="section-head flex-wrap items-end">
          <h2>Roll call</h2>
          <span className="tab-count">{members.length} members</span>
          <div className="ml-auto">
            <SessionPicker sessions={sessionList} selected={selected} basePath="/exec/attendance" />
          </div>
        </div>
        {selected && members.length ? <RollCallEveryone sessionId={selected} members={members} /> : <EmptyState title="Nothing to record yet" className="empty-state-sm" />}
      </section>

      <section className="card">
        <div className="section-head">
          <h2>Attendance history</h2>
          <span className="tab-count">{pastSessions.length} sessions</span>
        </div>
        {pastSessions.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member</th>
                  {pastSessions.map((s) => (
                    <th key={s.id} title={s.title} className="whitespace-nowrap">
                      {fmt(s.starts_at, "d MMM HH:mm")}
                    </th>
                  ))}
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const mine = recs.filter((r) => r.profile_id === m.profileId && pastSessions.some((s) => s.id === r.session_id));
                  const present = mine.filter((r) => r.status === "present" || r.status === "late").length;
                  return (
                    <tr key={m.profileId}>
                      <td className="font-[650] whitespace-nowrap">{m.name}</td>
                      {pastSessions.map((s) => {
                        const r = recs.find((x) => x.profile_id === m.profileId && x.session_id === s.id);
                        return (
                          <td key={s.id}>
                            <AttendanceBadge status={r?.status} />
                          </td>
                        );
                      })}
                      <td className="num">{mine.length ? `${Math.round((present / mine.length) * 100)}%` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No sessions held yet" className="empty-state-sm" />
        )}
      </section>
    </div>
  );
}
