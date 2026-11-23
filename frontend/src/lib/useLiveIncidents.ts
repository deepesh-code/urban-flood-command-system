"use client";

import { useEffect, useRef } from "react";
import { getSupabase } from "./supabase";

/**
 * Live-update hook. Polling always runs (5 s). When Supabase env vars are
 * configured, postgres_changes on the incidents table trigger an immediate
 * refetch — so a second browser sees updates in near real time either way.
 */
export function useLiveRefetch(refetch: () => void, enabled = true) {
  const ref = useRef(refetch);
  ref.current = refetch;

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => ref.current(), 5000);
    const supabase = getSupabase();
    let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null;
    if (supabase) {
      channel = supabase
        .channel("incidents-live")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "incidents" },
          () => ref.current()
        )
        .subscribe();
    }
    return () => {
      clearInterval(interval);
      if (supabase && channel) supabase.removeChannel(channel);
    };
  }, [enabled]);
}
