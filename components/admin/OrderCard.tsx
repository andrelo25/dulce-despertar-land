import { formatMoney } from "@/lib/domain/money";
import { formatDateLabel, formatSlotLabel } from "@/lib/domain/messages";
import { personalizedMessages, type AdminOrder, type OrderStatus } from "@/lib/domain/orders";
import { artDateString } from "@/lib/domain/slots";
import { OrderCountdown } from "./OrderCountdown";

const STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  pendiente: { label: "Pendiente", cls: "pend" },
  confirmado: { label: "Confirmado", cls: "ok" },
  entregado: { label: "Entregado", cls: "done" },
  cancelado: { label: "Cancelado", cls: "off" },
};

export function OrderCard({ order: o }: { order: AdminOrder }) {
  const status = STATUS[o.status];
  const when = `${formatDateLabel(artDateString(new Date(o.deliveryAt)))} · ${formatSlotLabel(o.deliverySlot)}`;

  return (
    <article className="order">
      <div>
        <span className={`pill ${status.cls}`}>{status.label}</span>
        <h3 style={{ marginTop: 6 }}>
          #{o.id} · {o.customerName}
        </h3>
        <ul>
          {o.items.map((i) => {
            const msgs = personalizedMessages(i.messages);
            return (
              <li key={i.id}>
                {i.qty} × {i.name}
                {msgs.length > 0 && (
                  <ul>
                    {msgs.map((m) => (
                      <li key={m.unit}>
                        {i.qty > 1 ? `Unidad ${m.unit}: ` : "Mensaje: "}“{m.text}”
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
        {o.note && (
          <p className="hint" style={{ margin: "8px 0 0" }}>
            Nota: “{o.note}”
          </p>
        )}
      </div>
      <div style={{ fontSize: ".92rem" }}>
        <b>{o.deliveryType === "domicilio" ? "Envío a domicilio" : "Retiro en el local"}</b>
        <br />
        {o.address && (
          <>
            {o.address}
            <br />
          </>
        )}
        {when}
        <br />
        WhatsApp: {o.customerPhone}
        <br />
        {o.status === "pendiente" ? (
          <OrderCountdown createdAt={o.createdAt} />
        ) : (
          <span className="timer">{o.status === "confirmado" ? "Confirmado y enviado" : status.label}</span>
        )}
      </div>
      <div style={{ textAlign: "right" }}>
        <div className="price">{formatMoney(o.total)}</div>
        {o.shippingFee > 0 && <div className="hint">incluye envío {formatMoney(o.shippingFee)}</div>}
      </div>
    </article>
  );
}
