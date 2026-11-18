"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelOrder, confirmOrder, markDelivered, type OrderActionResult } from "@/lib/actions/admin-orders";
import type { OrderStatus } from "@/lib/domain/orders";

export function OrderActions({ id, status }: { id: number; status: OrderStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (status !== "pendiente" && status !== "confirmado") return null;

  function run(action: (id: number) => Promise<OrderActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action(id);
      if (!result.ok) {
        setError(result.error);
        router.refresh();
      }
    });
  }

  return (
    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
      {status === "pendiente" ? (
        <>
          <button type="button" className="btn btn-primary" disabled={pending} onClick={() => run(confirmOrder)}>
            Confirmar
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={pending}
            onClick={() => {
              if (window.confirm(`¿Cancelar el pedido #${id}?`)) run(cancelOrder);
            }}
          >
            Cancelar
          </button>
        </>
      ) : (
        <button type="button" className="btn btn-primary" disabled={pending} onClick={() => run(markDelivered)}>
          Marcar entregado
        </button>
      )}
      {error && (
        <p className="hint" role="alert" style={{ flexBasis: "100%", margin: 0 }}>
          {error}
        </p>
      )}
    </div>
  );
}
