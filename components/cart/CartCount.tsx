"use client";

import { useCart } from "./CartProvider";

export function CartCount() {
  return <>{useCart().count}</>;
}
