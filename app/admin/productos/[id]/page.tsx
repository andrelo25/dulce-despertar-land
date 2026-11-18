import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductForm } from "@/components/admin/ProductForm";
import { getProduct } from "@/lib/dal";

async function EditProduct({ params }: { params: PageProps<"/admin/productos/[id]">["params"] }) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();
  return (
    <>
      <h1>Editar producto</h1>
      <p className="hint">Cambiar el precio no modifica pedidos anteriores: conservan el precio con el que se hicieron.</p>
      <ProductForm product={product} />
    </>
  );
}

export default function EditProductPage(props: PageProps<"/admin/productos/[id]">) {
  return (
    <Suspense fallback={<p className="wrap admin hint">Cargando…</p>}>
      <AdminShell>
        <EditProduct params={props.params} />
      </AdminShell>
    </Suspense>
  );
}
