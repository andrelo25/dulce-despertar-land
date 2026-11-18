"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/domain/money";
import { orderStats, paginate, type AdminOrder, type OrderStatus } from "@/lib/domain/orders";
import { OrderCard } from "./OrderCard";
import { useNow } from "./useNow";

const REFRESH_MS = 30_000;

const FILTERS: { value: OrderStatus | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "pendiente", label: "Pendientes" },
  { value: "confirmado", label: "Confirmados" },
  { value: "entregado", label: "Entregados" },
  { value: "cancelado", label: "Cancelados" },
];

export function OrdersList({ orders }: { orders: AdminOrder[] }) {
  const router = useRouter();
  const now = useNow();
  const [filter, setFilter] = useState<OrderStatus | "todos">("todos");
  const [requestedPage, setRequestedPage] = useState(1);

  // Polling: el servidor vuelve a leer los pedidos cada 30 s (sin Realtime).
  useEffect(() => {
    const id = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  const stats = orderStats(orders, new Date(now));
  const filtered = orders.filter((o) => filter === "todos" || o.status === filter);
  const { items: visible, page, pages } = paginate(filtered, requestedPage);

  return (
    <>
      <div className="stats">
        <div className="stat">
          <b>{stats.pending}</b>Pendientes
        </div>
        <div className="stat">
          <b>{stats.confirmed}</b>Confirmados
        </div>
        <div className="stat">
          <b>{stats.delivered}</b>Entregados
        </div>
        <div className="stat">
          <b>{stats.cancelled}</b>Cancelados
        </div>
      </div>
      <div className="chips" role="group" aria-label="Filtrar por estado" style={{ marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className="chip"
            aria-pressed={filter === f.value}
            onClick={() => {
              setFilter(f.value);
              setRequestedPage(1);
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <div className="empty">
          <p className="serif">
            {orders.length === 0 ? "No hay pedidos en los últimos 7 días" : "No hay pedidos con ese estado"}
          </p>
        </div>
      ) : (
        <div className="orders">
          {visible.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </div>
      )}
      {pages > 1 && (
        <nav className="pager" aria-label="Paginado de pedidos">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={page <= 1}
            onClick={() => setRequestedPage(page - 1)}
          >
            Anterior
          </button>
          <span className="hint">
            Página {page} de {pages}
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={page >= pages}
            onClick={() => setRequestedPage(page + 1)}
          >
            Siguiente
          </button>
        </nav>
      )}
      <div className="stat" style={{ marginTop: 20 }}>
        <b>{now === 0 ? "—" : formatMoney(stats.todayTotal)}</b>Total del día
      </div>
    </>
  );
}
