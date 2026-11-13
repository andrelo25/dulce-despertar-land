"use client";

import { useCart } from "./CartProvider";

type OpenCartButtonProps = {
  children: React.ReactNode;
  className?: string;
};

export function OpenCartButton({ children, className }: OpenCartButtonProps) {
  const { open } = useCart();
  return (
    <button type="button" className={className} onClick={open}>
      {children}
    </button>
  );
}
