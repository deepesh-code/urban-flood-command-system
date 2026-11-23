
"use client";

import { useEffect, useRef } from "react";
import { getSupabase } from "./supabase";

export function useLiveRefetch(
  refetch: () => void | Promise<void>,
  enabled = true
) {
  const ref = useRef(refetch);
  const running = useRef(false);

  ref.current = refetch;

  useEffect(() => {
    if (!enabled) return;

    let active = true;

    const safeRefetch = async () => {
      if (!active || running.current) return;

      running.current = true;

      try {
        await ref.current();
      } catch (error) {
        console.error("Live refresh failed:", error);
      } finally {
        running.current = false;
      }
    };

    const interval = setInterval(() => {
      void safeRefetch();
    }, 5000);

    const supabase = getSupabase();

    let channel:
      | ReturnType<NonNullable<typeof supabase>["channel"]>
      | null = null;

    if (supabase) {
      channel = supabase
        .channel("incidents-live")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "incidents",
          },
          () => {
            void safeRefetch();
          }
        )
        .subscribe();
    }

    return () => {
      active = false;
      clearInterval(interval);

      if (supabase && channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [enabled]);
}
