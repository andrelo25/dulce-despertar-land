"use client";

import { CartCount } from "@/components/cart/CartCount";
import { useCart } from "@/components/cart/CartProvider";

export function Header() {
  const { open } = useCart();

  return (
    <header>
      <div className="wrap bar">
        <a href="#inicio" className="logo">
          <span aria-hidden="true"></span>Dulce Despertar
        </a>
        <nav aria-label="Secciones">
          <ul>
            <li><a href="#desayunos">Desayunos</a></li>
            <li><a href="#tortas">Tortas</a></li>
            <li><a href="#dulces">Dulces</a></li>
          </ul>
        </nav>
        <button
          type="button"
          className="cart-btn"
          aria-haspopup="dialog"
          onClick={open}
        >
          Carrito <span className="count" aria-live="polite"><CartCount /></span>
          <span className="sr-only">productos</span>
        </button>
      </div>
    </header>
  );
}
