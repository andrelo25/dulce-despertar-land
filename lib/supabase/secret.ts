import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Cliente con la secret key (salta RLS). Solo servidor. */
export function createSecretClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
