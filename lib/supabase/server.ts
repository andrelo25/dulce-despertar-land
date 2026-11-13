import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Cliente con la sesión del admin (cookies). No usar dentro de `use cache`. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(items) {
          try {
            for (const { name, value, options } of items) cookieStore.set(name, value, options);
          } catch {
            // Llamado desde un Server Component: la sesión se refresca en proxy.ts.
          }
        },
      },
    },
  );
}
