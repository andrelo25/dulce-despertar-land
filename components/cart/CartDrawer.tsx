"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "./CartProvider";
import { CartStep } from "./CartStep";

export type DrawerStep = "cart" | "checkout" | "done";

export function CartDrawer() {
  const { isOpen, close } = useCart();
  const [step, setStep] = useState<DrawerStep>("cart");
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const handleClose = () => {
    close();
    setStep("cart");
  };

  // Focus management & Escape handling
  useEffect(() => {
    if (!isOpen) {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement;
    // Focus close button on open
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        setStep("cart");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, close]);

  const stepIndex = step === "cart" ? 0 : step === "checkout" ? 1 : 2;

  const title =
    step === "cart"
      ? "Tu carrito"
      : step === "checkout"
        ? "Datos de entrega"
        : "¡Pedido recibido!";

  return (
    <>
      <div
        className={isOpen ? "overlay open" : "overlay"}
        id="overlay"
        onClick={handleClose}
        aria-hidden="true"
      />
      <aside
        className={isOpen ? "drawer open" : "drawer"}
        id="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dTitle"
        aria-hidden={!isOpen}
      >
        <div className="d-head">
          <h2 id="dTitle">{title}</h2>
          <button
            ref={closeButtonRef}
            className="x"
            id="closeCart"
            aria-label="Cerrar"
            onClick={handleClose}
          >
            ×
          </button>
        </div>
        <div className="progress" id="progress" aria-hidden="true">
          <span className={stepIndex >= 0 ? "on" : ""}>Carrito</span>
          <span className={stepIndex >= 1 ? "on" : ""}>Datos</span>
          <span className={stepIndex >= 2 ? "on" : ""}>Confirmado</span>
        </div>

        {step === "cart" && (
          <CartStep
            onToCheckout={() => setStep("checkout")}
            onClose={handleClose}
          />
        )}
      </aside>
    </>
  );
}
