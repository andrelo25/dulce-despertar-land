"use client";

import type { Product } from "@/lib/domain/catalog";
import { useCart } from "@/components/cart/CartProvider";

/** Botón "Agregar" que pasa a stepper (− n +) cuando el producto ya está en el carrito. */
export function AddControl({ product }: { product: Pick<Product, "id" | "name" | "status"> }) {
  const { qtyOf, add, remove } = useCart();
  const qty = qtyOf(product.id);

  if (product.status !== "active") {
    return <button className="add" disabled>No disponible</button>;
  }
  if (qty === 0) {
    return <button className="add" onClick={() => add(product.id, product.name)}>Agregar</button>;
  }
  return (
    <div className="stepper" role="group" aria-label={`Cantidad de ${product.name}`}>
      <button onClick={() => remove(product.id)} aria-label="Quitar uno">−</button>
      <span>{qty}</span>
      <button onClick={() => add(product.id, product.name)} aria-label="Agregar uno">+</button>
    </div>
  );
}
