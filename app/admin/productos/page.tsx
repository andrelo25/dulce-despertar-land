import { Suspense } from "react";
import { AdminShell } from "@/components/admin/AdminShell";

// Placeholder: la gestión de productos se implementa en T17.
export default function AdminProductsPage() {
  return (
    <Suspense fallback={<p className="wrap admin hint">Cargando…</p>}>
      <AdminShell>
        <h1>Productos</h1>
      </AdminShell>
    </Suspense>
  );
}
