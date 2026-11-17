import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/lib/actions/auth";
import { verifyAdmin } from "@/lib/dal";

/** Verifica la sesión admin en cada render. Usar dentro de `<Suspense>` (lee cookies). */
export async function AdminShell({ children }: { children: ReactNode }) {
  const admin = await verifyAdmin();

  return (
    <div className="wrap admin">
      <div className="bar" style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <Link href="/admin">Pedidos</Link>
        <Link href="/admin/productos">Productos</Link>
        <span className="hint" style={{ marginLeft: "auto" }}>
          {admin.email}
        </span>
        <form action={logout}>
          <button type="submit" className="btn btn-ghost">
            Cerrar sesión
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}
