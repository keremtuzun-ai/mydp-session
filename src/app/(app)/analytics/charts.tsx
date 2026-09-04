"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const tooltipStyle = { background: "var(--surface)", border: "1px solid var(--rule-strong)", borderRadius: 7, color: "var(--ink)", fontSize: 12 };

export function AttendanceByWeekChart({ data }: { data: { week: string; rate: number }[] }) {
  if (!data.length) return <p className="mb-4 text-sm muted">No completed sessions yet.</p>;
  return (
    <div className="mb-4 h-56" role="img" aria-label="Attendance rate per completed session">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="var(--line-soft)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--ink-2)", fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--ink-2)", fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} unit="%" />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, "Attendance"]} />
          <Line type="monotone" dataKey="rate" stroke="var(--red)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--ink)", strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TaskStatusChart({ data }: { data: { status: string; count: number }[] }) {
  return (
    <div className="h-64" role="img" aria-label="Number of tasks per status">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="var(--line-soft)" strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--ink-2)", fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="status" width={90} tick={{ fontSize: 11, fill: "var(--ink-2)", fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--navy-soft)" }} />
          <Bar dataKey="count" fill="var(--red)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
