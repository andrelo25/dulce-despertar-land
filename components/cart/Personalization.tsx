"use client";

import { useState } from "react";
import { MESSAGE_MAX, PERSONALIZABLE_SECTIONS } from "@/lib/config";
import type { CartItem } from "@/lib/domain/cart";
import type { Product } from "@/lib/domain/catalog";
import { useCart } from "./CartProvider";

type PersonalizationProps = {
  product: Product;
  item: CartItem;
};

export function Personalization({ product, item }: PersonalizationProps) {
  const { setMessage, clearMessages } = useCart();
  const hasMessages = item.messages.some((m) => m && m.trim().length > 0);
  const [isOpen, setIsOpen] = useState(hasMessages);

  if (!PERSONALIZABLE_SECTIONS.includes(product.section)) {
    return null;
  }

  if (!isOpen && !hasMessages) {
    return (
      <div className="msg-block">
        <button
          type="button"
          className="msg-toggle"
          onClick={() => setIsOpen(true)}
        >
          + Agregar mensaje personalizado
        </button>
      </div>
    );
  }

  return (
    <div className="msg-block">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--cocoa)" }}>
          {item.qty === 1 ? "Mensaje personalizado" : "Mensajes por unidad"}
        </span>
        <button
          type="button"
          className="rm"
          onClick={() => {
            clearMessages(product.id);
            setIsOpen(false);
          }}
        >
          Quitar
        </button>
      </div>
      {Array.from({ length: item.qty }, (_, idx) => {
        const msg = item.messages[idx] ?? "";
        const labelText = item.qty === 1 ? "Dedicatoria para la caja" : `Unidad ${idx + 1}`;
        const inputId = `msg-${product.id}-${idx}`;

        return (
          <div key={idx} className="msg-item">
            <label htmlFor={inputId}>{labelText}</label>
            <textarea
              id={inputId}
              rows={2}
              maxLength={MESSAGE_MAX}
              value={msg}
              placeholder="Ej: ¡Feliz cumple, Sofi! Que tengas un hermoso día."
              onChange={(e) => setMessage(product.id, idx, e.target.value)}
            />
            <span className="msg-count">
              {msg.length} / {MESSAGE_MAX}
            </span>
          </div>
        );
      })}
    </div>
  );
}
