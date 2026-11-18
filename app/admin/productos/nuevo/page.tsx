import { Suspense } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductForm } from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return (
    <Suspense fallback={<p className="wrap admin hint">Cargando…</p>}>
      <AdminShell>
        <h1>Nuevo producto</h1>
        <ProductForm />
      </AdminShell>
    </Suspense>
  );
}
