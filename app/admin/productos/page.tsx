import Link from "next/link";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductsTable } from "@/components/admin/ProductsTable";
import { getAllProducts } from "@/lib/dal";

async function Products() {
  return <ProductsTable products={await getAllProducts()} />;
}

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<p className="wrap admin hint">Cargando…</p>}>
      <AdminShell>
        <h1>Productos</h1>
        <p className="hint">Los cambios se ven en la tienda de inmediato. Los productos ocultos no se borran: conservan sus pedidos.</p>
        <p>
          <Link href="/admin/productos/nuevo" className="btn btn-primary">
            Nuevo producto
          </Link>
        </p>
        <Products />
      </AdminShell>
    </Suspense>
  );
}
