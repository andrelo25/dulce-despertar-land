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
            // No hay cliente Supabase en el navegador: la sesión puede ser httpOnly (C18).
            for (const { name, value, options } of items) {
              cookieStore.set(name, value, { ...options, httpOnly: true });
            }
          } catch {
            // Llamado desde un Server Component: la sesión se refresca en proxy.ts.
          }
        },
      },
    },
  );
}
