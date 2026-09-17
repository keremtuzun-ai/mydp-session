"use client";

import { useState, useTransition } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { bumpTally } from "@/actions/tally";
import { TALLY_KINDS, TALLY_LABEL, type TallyKind } from "@/lib/tally";

type Row = { key: string; country: string } & Record<TallyKind, number>;

export function TallyBoard({ taskId, rows }: { taskId: string; rows: Row[] }) {
  const [counts, setCounts] = useState(() => new Map(rows.map((r) => [r.key, r])));
  const [, startTransition] = useTransition();

  // A broadcast from another executive refreshes the page; take the server's numbers.
  const [seen, setSeen] = useState(rows);
  if (seen !== rows) {
    setSeen(rows);
    setCounts(new Map(rows.map((r) => [r.key, r])));
  }

  function step(row: Row, kind: TallyKind, delta: 1 | -1) {
    if ((counts.get(row.key) ?? row)[kind] + delta < 0) return;
    setCounts((m) => {
      const current = m.get(row.key) ?? row;
      return new Map(m).set(row.key, { ...current, [kind]: Math.max(0, current[kind] + delta) });
    });
    startTransition(async () => {
      const res = await bumpTally({ taskId, country: row.country, kind, delta });
      if (res.ok) setCounts((m) => new Map(m).set(row.key, { ...(m.get(row.key) ?? row), ...res.data }));
      else {
        toast.error(res.error);
        setCounts((m) => {
          const prev = m.get(row.key) ?? row;
          return new Map(m).set(row.key, { ...prev, [kind]: Math.max(0, prev[kind] - delta) });
        });
      }
    });
  }

  const totals = TALLY_KINDS.map((k) => rows.reduce((sum, r) => sum + (counts.get(r.key) ?? r)[k], 0));

  return (
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
          {rows.map((r) => {
            const c = counts.get(r.key) ?? r;
            return (
              <tr key={r.key}>
                <td data-label="Country" className="font-[650]">{r.country}</td>
                {TALLY_KINDS.map((k) => (
                  <td key={k} data-label={TALLY_LABEL[k]}>
                    <div className="speech-counter">
                      <button type="button" className="btn btn-outline btn-icon btn-sm" onClick={() => step(r, k, -1)} disabled={c[k] === 0} aria-label={`One fewer ${TALLY_LABEL[k]} for ${r.country}`}>
                        <Minus size={14} aria-hidden />
                      </button>
                      <span className="speech-count num" aria-live="polite">{c[k]}</span>
                      <button type="button" className="btn btn-icon btn-sm" onClick={() => step(r, k, 1)} aria-label={`One more ${TALLY_LABEL[k]} for ${r.country}`}>
                        <Plus size={14} aria-hidden />
                      </button>
                    </div>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            {TALLY_KINDS.map((k, i) => (
              <td key={k} data-label={TALLY_LABEL[k]} className="num speech-total">{totals[i]}</td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
