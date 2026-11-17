"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/domain/money";
import { orderStats, type AdminOrder, type OrderStatus } from "@/lib/domain/orders";
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

  // Polling: el servidor vuelve a leer los pedidos cada 30 s (sin Realtime).
  useEffect(() => {
    const id = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  const stats = orderStats(orders, new Date(now));
  const visible = orders.filter((o) => filter === "todos" || o.status === filter);

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
          <b>{now === 0 ? "—" : formatMoney(stats.todayTotal)}</b>Total del día
        </div>
      </div>
      <div className="chips" role="group" aria-label="Filtrar por estado" style={{ marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className="chip"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <div className="empty">
          <p className="serif">{orders.length === 0 ? "Todavía no hay pedidos" : "No hay pedidos con ese estado"}</p>
        </div>
      ) : (
        <div className="orders">
          {visible.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </div>
      )}
    </>
  );
}
