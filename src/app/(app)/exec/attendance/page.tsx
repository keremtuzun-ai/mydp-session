import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/mun/empty-state";
import { AttendanceBadge } from "@/components/mun/session-status-badge";
import { RollCallEveryone, DatePicker } from "./roll-call-everyone";
import { execAccountEmail } from "@/lib/env";
import { fmt } from "@/lib/utils";
import type { Enums } from "@/lib/types/database";

export const metadata: Metadata = { title: "Attendance" };

const dayLabel = (d: string) => fmt(`${d}T12:00:00Z`, "d MMM yyyy");

export default async function ExecAttendancePage({ searchParams }: PageProps<"/exec/attendance">) {
  const sp = await searchParams;
  const supabase = await createClient();
  const today = fmt(new Date(), "yyyy-MM-dd");
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;
  const [{ data: people }, { data: records }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, username, school_email, role").order("display_name", { ascending: true, nullsFirst: false }),
    supabase.from("attendance_records").select("*").order("attended_on", { ascending: false }),
  ]);
  const shared = execAccountEmail();
  const everyone = (people ?? []).filter((p) => p.school_email.toLowerCase() !== shared);
  const recs = records ?? [];
  const forDate = new Map(recs.filter((r) => r.attended_on === date).map((r) => [r.profile_id, r]));
  const members = everyone.map((p) => ({
    profileId: p.id,
    name: p.display_name ?? p.username ?? p.school_email,
    role: p.role,
    status: (forDate.get(p.id)?.status ?? null) as Enums<"attendance_status"> | null,
    note: forDate.get(p.id)?.note ?? null,
  }));
  const dates = Array.from(new Set(recs.map((r) => r.attended_on))).sort().reverse().slice(0, 12);

  return (
    <div className="flex flex-col gap-5">
      <section className="card">
        <div className="section-head flex-wrap items-end">
          <h2>Roll call</h2>
          <span className="tab-count">{members.length} members</span>
          <div className="ml-auto">
            <DatePicker date={date} basePath="/exec/attendance" />
          </div>
        </div>
        {members.length ? <RollCallEveryone key={date} attendedOn={date} members={members} /> : <EmptyState title="No members yet" className="empty-state-sm" />}
      </section>

      <section className="card">
        <div className="section-head">
          <h2>Attendance history</h2>
          <span className="tab-count">{dates.length} days</span>
        </div>
        {dates.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member</th>
                  {dates.map((d) => (
                    <th key={d} className="whitespace-nowrap">{dayLabel(d)}</th>
                  ))}
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const mine = recs.filter((r) => r.profile_id === m.profileId);
                  const present = mine.filter((r) => r.status === "present" || r.status === "late").length;
                  return (
                    <tr key={m.profileId}>
                      <td className="font-[650] whitespace-nowrap">{m.name}</td>
                      {dates.map((d) => (
                        <td key={d}>
                          <AttendanceBadge status={recs.find((x) => x.profile_id === m.profileId && x.attended_on === d)?.status} />
                        </td>
                      ))}
                      <td className="num">{mine.length ? `${Math.round((present / mine.length) * 100)}%` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No attendance taken yet" className="empty-state-sm" />
        )}
      </section>
    </div>
  );
}
