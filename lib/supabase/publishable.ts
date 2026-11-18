import { createClient } from "@supabase/supabase-js";

/** Cliente sin sesión ni cookies: apto para `use cache` y lecturas públicas (RLS aplica). */
export function createPublishableClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
