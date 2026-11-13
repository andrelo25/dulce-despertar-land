"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { submitOrder, type SubmitOrderResult } from "@/lib/actions/orders";
import { SHIPPING_FEE, SLOTS, STORE } from "@/lib/config";
import type { DeliveryType } from "@/lib/domain/pricing";
import { artDateString, firstAvailableSlot, isSlotAllowed } from "@/lib/domain/slots";
import { formatMoney } from "@/lib/domain/money";
import { useCart } from "./CartProvider";
import type { ConfirmedOrder } from "./DoneStep";

type CheckoutStepProps = {
  onBack: () => void;
  onOrderConfirmed: (order: ConfirmedOrder) => void;
};

export function CheckoutStep({ onBack, onOrderConfirmed }: CheckoutStepProps) {
  const { cart, getProduct, clear } = useCart();
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("domicilio");
  const [now] = useState(() => new Date());

  const [date, setDate] = useState<string>(() => {
    try {
      return firstAvailableSlot(new Date()).date;
    } catch {
      return artDateString(new Date());
    }
  });

  const [slot, setSlot] = useState<string>(() => {
    try {
      return firstAvailableSlot(new Date()).slot;
    } catch {
      return SLOTS[0];
    }
  });

  const [submittedData, setSubmittedData] = useState<{
    name: string;
    phone: string;
    address: string | null;
    deliveryType: DeliveryType;
    date: string;
    slot: string;
  } | null>(null);

  const [state, formAction, isPending] = useActionState<SubmitOrderResult | null, FormData>(
    async (prev, formData) => {
      setSubmittedData({
        name: (formData.get("name") as string)?.trim() || "",
        phone: (formData.get("phone") as string)?.trim() || "",
        address:
          deliveryType === "domicilio" ? (formData.get("address") as string)?.trim() || null : null,
        deliveryType,
        date,
        slot,
      });
      return await submitOrder(prev, formData);
    },
    null,
  );

  const cartEntries = useMemo(() => Object.entries(cart), [cart]);

  const itemsList = useMemo(() => {
    return cartEntries
      .map(([id, item]) => {
        const product = getProduct(id);
        if (!product) return null;
        return {
          productId: id,
          name: product.name,
          price: product.price,
          qty: item.qty,
          messages: item.messages,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [cartEntries, getProduct]);

  const subtotal = useMemo(() => {
    return itemsList.reduce((acc, i) => acc + i.price * i.qty, 0);
  }, [itemsList]);

  const shippingFee = deliveryType === "domicilio" ? SHIPPING_FEE : 0;
  const total = subtotal + shippingFee;

  // Serialized cart for form submission
  const cartJson = useMemo(() => {
    const lines = itemsList.map((i) => ({
      productId: i.productId,
      qty: i.qty,
      messages: i.messages,
    }));
    return JSON.stringify(lines);
  }, [itemsList]);

  // Handle successful submission
  useEffect(() => {
    if (state?.ok && state.order && submittedData) {
      const confirmed: ConfirmedOrder = {
        id: state.order.id,
        name: submittedData.name || "Cliente",
        phone: submittedData.phone,
        deliveryType: submittedData.deliveryType,
        address: submittedData.address,
        date: submittedData.date || artDateString(new Date()),
        slot: submittedData.slot || SLOTS[0],
        items: itemsList.map((i) => ({
          name: i.name,
          qty: i.qty,
          price: i.price,
          messages: i.messages,
        })),
        subtotal: state.order.subtotal,
        shippingFee: state.order.shippingFee,
        total: state.order.total,
      };

      clear();
      onOrderConfirmed(confirmed);
    }
  }, [state, submittedData, itemsList, clear, onOrderConfirmed]);

  const errors = state && !state.ok ? state.fieldErrors : {};
  const todayStr = now ? artDateString(now) : "";

  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="cart" value={cartJson} />
      {/* Honeypot field for bot protection */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        style={{ display: "none" }}
        aria-hidden="true"
      />

      <div className="d-body" id="dBody">
        {errors?.form && (
          <div
            style={{
              background: "#FDE8E8",
              color: "var(--accent-dark)",
              border: "1px solid #F8B4B4",
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: "0.88rem",
              marginBottom: 14,
            }}
            role="alert"
          >
            {errors.form[0]}
          </div>
        )}

        {errors?.cart && (
          <div
            style={{
              background: "#FDE8E8",
              color: "var(--accent-dark)",
              border: "1px solid #F8B4B4",
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: "0.88rem",
              marginBottom: 14,
            }}
            role="alert"
          >
            {errors.cart[0]}
          </div>
        )}

        <div className={errors?.name ? "field invalid" : "field"}>
          <label htmlFor="f-name">Nombre y apellido</label>
          <input
            id="f-name"
            name="name"
            autoComplete="name"
            placeholder="Ej: Ana Pérez"
            required
          />
          <span className="err">{errors?.name?.[0] ?? "Ingresá tu nombre."}</span>
        </div>

        <div className={errors?.phone ? "field invalid" : "field"}>
          <label htmlFor="f-phone">WhatsApp</label>
          <input
            id="f-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="Ej: 351 344 5566"
            required
          />
          <span className="err">
            {errors?.phone?.[0] ?? "Ingresá un celular argentino de 10 dígitos (sin 0 ni 15)."}
          </span>
          <span className="hint">Te enviaremos la confirmación y los datos de pago.</span>
        </div>

        <fieldset>
          <legend className="legend">Forma de entrega</legend>
          <div className="opts">
            <div className="opt">
              <input
                type="radio"
                name="deliveryType"
                id="o-env"
                value="domicilio"
                checked={deliveryType === "domicilio"}
                onChange={() => setDeliveryType("domicilio")}
              />
              <label htmlFor="o-env">
                A domicilio
                <small>Te lo llevamos (${formatMoney(SHIPPING_FEE)})</small>
              </label>
            </div>
            <div className="opt">
              <input
                type="radio"
                name="deliveryType"
                id="o-ret"
                value="retiro"
                checked={deliveryType === "retiro"}
                onChange={() => setDeliveryType("retiro")}
              />
              <label htmlFor="o-ret">
                Retiro en local
                <small>{STORE.address}</small>
              </label>
            </div>
          </div>
        </fieldset>

        {deliveryType === "domicilio" && (
          <div className={errors?.address ? "field invalid" : "field"} id="addrField">
            <label htmlFor="f-addr">Dirección de entrega</label>
            <input
              id="f-addr"
              name="address"
              autoComplete="street-address"
              placeholder="Calle, número, piso/depto, barrio"
              required
            />
            <span className="err">
              {errors?.address?.[0] ?? "Ingresá la dirección de entrega."}
            </span>
          </div>
        )}

        <div className="two">
          <div className={errors?.date ? "field invalid" : "field"}>
            <label htmlFor="f-date">Fecha</label>
            <input
              id="f-date"
              name="date"
              type="date"
              min={todayStr}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <span className="err">{errors?.date?.[0] ?? "Elegí una fecha de entrega."}</span>
          </div>

          <div className={errors?.slot ? "field invalid" : "field"}>
            <label htmlFor="f-time">Horario estimado</label>
            <select
              id="f-time"
              name="slot"
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              required
            >
              <option value="">Elegir</option>
              {SLOTS.map((s) => {
                const isAllowed = now ? isSlotAllowed(date, s, now) : true;
                return (
                  <option key={s} value={s}>
                    {s} {!isAllowed && date === todayStr ? " (requiere 12 h)" : ""}
                  </option>
                );
              })}
            </select>
            <span className="err">{errors?.slot?.[0] ?? "Elegí un horario."}</span>
          </div>
        </div>

        <div className="field">
          <label htmlFor="f-notes">
            Mensaje o aclaraciones <span className="hint">(opcional)</span>
          </label>
          <textarea
            id="f-notes"
            name="note"
            rows={2}
            maxLength={300}
            placeholder="Ej: indicaciones de entrega o timbre."
          />
        </div>
      </div>

      <div className="d-foot" id="dFoot">
        <div className="row">
          <span>Subtotal</span>
          <span>{formatMoney(subtotal)}</span>
        </div>
        <div className="row hint">
          <span>Envío</span>
          <span>
            {deliveryType === "domicilio" ? formatMoney(SHIPPING_FEE) : "Sin costo"}
          </span>
        </div>
        <div className="row total" style={{ margin: "8px 0 12px" }}>
          <span>Total</span>
          <span>{formatMoney(total)}</span>
        </div>
        <div className="two">
          <button
            type="button"
            className="btn btn-ghost full"
            id="backCart"
            onClick={onBack}
            disabled={isPending}
          >
            Volver
          </button>
          <button
            type="submit"
            className="btn btn-primary full"
            id="confirm"
            disabled={isPending}
          >
            {isPending ? "Confirmando..." : "Confirmar pedido"}
          </button>
        </div>
      </div>
    </form>
  );
}
