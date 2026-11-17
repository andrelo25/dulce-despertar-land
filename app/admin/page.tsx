import { Suspense } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { OrdersList } from "@/components/admin/OrdersList";
import { getOrders } from "@/lib/dal";

async function Orders() {
  return <OrdersList orders={await getOrders()} />;
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<p className="wrap admin hint">Cargando…</p>}>
      <AdminShell>
        <h1>Panel de pedidos</h1>
        <p className="hint">Confirmá cada pedido en menos de 30 minutos y enviá el detalle al cliente por WhatsApp.</p>
        <Orders />
      </AdminShell>
    </Suspense>
  );
}
