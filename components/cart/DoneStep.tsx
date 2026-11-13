"use client";

import { STORE } from "@/lib/config";
import { formatDateLabel, formatSlotLabel } from "@/lib/domain/messages";
import { formatMoney } from "@/lib/domain/money";

export type ConfirmedOrder = {
  id: number;
  name: string;
  phone: string;
  deliveryType: "domicilio" | "retiro";
  address: string | null;
  date: string;
  slot: string;
  items: Array<{
    name: string;
    qty: number;
    price: number;
    messages: string[];
  }>;
  subtotal: number;
  shippingFee: number;
  total: number;
};

type DoneStepProps = {
  order: ConfirmedOrder;
  onClose: () => void;
};

export function DoneStep({ order, onClose }: DoneStepProps) {
  const dateLabel = formatDateLabel(order.date);
  const slotLabel = formatSlotLabel(order.slot);
  const isDelivery = order.deliveryType === "domicilio";

  return (
    <>
      <div className="d-body" id="dBody">
        <div className="done">
          <div className="badge" aria-hidden="true">
            ✓
          </div>
          <p className="hint">Pedido #{order.id}</p>
          <h3>¡Gracias, {order.name}!</h3>
          <p>
            Registramos tu pedido. En <b>menos de 30 minutos</b> te enviaremos la confirmación por WhatsApp al{" "}
            <b>{order.phone}</b> con los datos para realizar el pago.
          </p>

          <ol className="timeline">
            <li className="on">
              <span className="dot" />
              <div>
                <b>Pedido registrado</b>
                <br />
                <small className="hint">Recién</small>
              </div>
            </li>
            <li>
              <span className="dot" />
              <div>
                <b>Confirmación por WhatsApp</b>
                <br />
                <small className="hint">En menos de 30 min</small>
              </div>
            </li>
            <li>
              <span className="dot" />
              <div>
                <b>Pago</b>
                <br />
                <small className="hint">Transferencia al alias o efectivo</small>
              </div>
            </li>
            <li>
              <span className="dot" />
              <div>
                <b>{isDelivery ? "Entrega en domicilio" : "Retiro en local"}</b>
                <br />
                <small className="hint">
                  {dateLabel} · {slotLabel}
                  {isDelivery && order.address ? ` (${order.address})` : ""}
                </small>
              </div>
            </li>
          </ol>

          <div className="summary">
            {order.items.map((i, idx) => (
              <div key={idx} className="row">
                <span>
                  {i.qty} × {i.name}
                </span>
                <span>{formatMoney(i.qty * i.price)}</span>
              </div>
            ))}
            {isDelivery && (
              <div className="row">
                <span>Costo de envío</span>
                <span>{formatMoney(order.shippingFee)}</span>
              </div>
            )}
            <div
              className="row total"
              style={{ marginTop: 8, borderTop: "1px solid var(--line)", paddingTop: 8 }}
            >
              <span>Total</span>
              <span>{formatMoney(order.total)}</span>
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              padding: 14,
              background: "var(--paper)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              fontSize: "0.88rem",
              textAlign: "left",
            }}
          >
            <b style={{ display: "block", marginBottom: 4 }}>Medios de pago disponibles:</b>
            <div>
              • Transferencia al alias: <code>{STORE.paymentAlias}</code>
            </div>
            <div>• Efectivo al retirar en el local ({STORE.address})</div>
          </div>
        </div>
      </div>
      <div className="d-foot" id="dFoot">
        <button type="button" className="btn btn-primary full" onClick={onClose}>
          Volver a la tienda
        </button>
      </div>
    </>
  );
}
