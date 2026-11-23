import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Live updates work in two layers so the demo never breaks:
 *  1. Polling (always on) — refetches data every few seconds.
 *  2. Supabase Realtime (when configured) — pushes incident changes instantly.
 */
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!client) client = createClient(url, key);
  return client;
}
