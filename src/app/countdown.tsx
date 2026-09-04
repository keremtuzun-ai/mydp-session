"use client";

import { useEffect, useState } from "react";

function parts(target: number) {
  const diff = Math.max(0, target - Date.now());
  const s = Math.floor(diff / 1000);
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

export function Countdown({ target }: { target: string }) {
  const t = new Date(target).getTime();
  const [now, setNow] = useState<ReturnType<typeof parts> | null>(null);
  useEffect(() => {
    const tick = () => setNow(parts(t));
    const id = setInterval(tick, 1000);
    const first = setTimeout(tick, 0);
    return () => {
      clearInterval(id);
      clearTimeout(first);
    };
  }, [t]);
  const units = [
    ["Days", now?.days],
    ["Hours", now?.hours],
    ["Minutes", now?.minutes],
    ["Seconds", now?.seconds],
  ] as const;
  return (
    <div className="countdown-grid" aria-live="off">
      {units.map(([cap, v], i) => (
        <div key={cap} className="contents">
          {i > 0 ? <div className="countdown-sep" aria-hidden /> : null}
          <div className="countdown-unit">
            <span className="countdown-figure">{v === undefined ? "–" : String(v).padStart(2, "0")}</span>
            <span className="countdown-cap">{cap}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
