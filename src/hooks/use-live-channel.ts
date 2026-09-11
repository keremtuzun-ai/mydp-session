"use client";

import { useEffect, useEffectEvent } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { LIVE_EVENT } from "@/lib/realtime/topics";

/**
 * Runs `onChange` whenever the server broadcasts on `topic`, when the
 * subscription (re)connects, when the tab becomes visible again, and on a
 * slow fallback poll, so the page keeps up even if the socket drops.
 */
export function useLiveChannel(topic: string, onChange: () => void, { pollMs = 15000 }: { pollMs?: number } = {}) {
  const fire = useEffectEvent(onChange);

  useEffect(() => {
    // First read straight away; the subscription only tells us when to read again.
    fire();
    const supabase = getBrowserClient();
    const channel = supabase
      .channel(topic, { config: { private: false } })
      .on("broadcast", { event: LIVE_EVENT }, () => fire())
      .subscribe((status) => {
        // A (re)subscription may have missed events while it was down: catch up.
        if (status === "SUBSCRIBED") fire();
      });
    const onVisible = () => {
      if (!document.hidden) fire();
    };
    document.addEventListener("visibilitychange", onVisible);
    const timer = pollMs > 0 ? window.setInterval(onVisible, pollMs) : null;
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      if (timer) window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [topic, pollMs]);
}
