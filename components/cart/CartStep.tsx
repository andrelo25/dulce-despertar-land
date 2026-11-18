"use client";

import { useMemo } from "react";
import Image from "next/image";
import { formatMoney } from "@/lib/domain/money";
import { useCart } from "./CartProvider";
import { Personalization } from "./Personalization";

type CartStepProps = {
  onToCheckout?: () => void;
  onClose?: () => void;
};

export function CartStep({ onToCheckout, onClose }: CartStepProps) {
  const { cart, count, getProduct, add, remove, removeItem, close } = useCart();

  const handleClose = onClose ?? close;

  const entries = useMemo(() => Object.entries(cart), [cart]);

  const items = useMemo(() => {
    return entries
      .map(([id, item]) => {
        const product = getProduct(id);
        if (!product) return null;
        return { product, item };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [entries, getProduct]);

  const subtotal = useMemo(() => {
    return items.reduce((acc, { product, item }) => acc + product.price * item.qty, 0);
  }, [items]);

  if (count === 0 || items.length === 0) {
    return (
      <>
        <div className="d-body" id="dBody">
          <div className="empty">
            <p className="serif">Tu carrito está vacío</p>
            <p>Explorá nuestras cajas, tortas y dulces.</p>
          </div>
        </div>
        <div className="d-foot" id="dFoot">
          <button type="button" className="btn btn-primary full" onClick={handleClose}>
            Seguir comprando
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="d-body" id="dBody">
        {items.map(({ product, item }) => {
          const lineTotal = product.price * item.qty;

          return (
            <div key={product.id} className="cart-line-wrap">
              <div className="line">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    width={64}
                    height={64}
                    style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover" }}
                  />
                ) : (
                  <div className="line-img-placeholder" aria-hidden="true" />
                )}
                <div>
                  <h4>{product.name}</h4>
                  <small>{formatMoney(product.price)} c/u</small>
                  <br />
                  <div
                    className="stepper"
                    style={{ marginTop: 6 }}
                    role="group"
                    aria-label={`Cantidad de ${product.name}`}
                  >
                    <button
                      type="button"
                      onClick={() => remove(product.id)}
                      aria-label="Quitar uno"
                    >
                      −
                    </button>
                    <span>{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => add(product.id, product.name)}
                      aria-label="Agregar uno"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="r">
                  <b>{formatMoney(lineTotal)}</b>
                  <button
                    type="button"
                    className="rm"
                    onClick={() => removeItem(product.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
              <Personalization product={product} item={item} />
            </div>
          );
        })}
      </div>
      <div className="d-foot" id="dFoot">
        <div className="row">
          <span>
            Subtotal ({count} {count === 1 ? "producto" : "productos"})
          </span>
          <span>{formatMoney(subtotal)}</span>
        </div>
        <div className="row hint">
          <span>Envío</span>
          <span>Se calcula en el siguiente paso</span>
        </div>
        <div className="row total" style={{ margin: "10px 0 14px" }}>
          <span>Total</span>
          <span>{formatMoney(subtotal)}</span>
        </div>
        <button
          type="button"
          className="btn btn-primary full"
          id="toCheckout"
          onClick={onToCheckout}
        >
          Finalizar pedido
        </button>
      </div>
    </>
  );
}
