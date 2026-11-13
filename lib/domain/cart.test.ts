import { describe, expect, it } from "vitest";
import { MAX_PER_PRODUCT, MAX_TOTAL } from "../config";
import { addBlockReason, cartCount, cartReducer, dropInactive, EMPTY_CART, parseStoredCart, type CartState } from "./cart";

const add = (cart: CartState, id: string, times = 1) => {
  for (let i = 0; i < times; i++) cart = cartReducer(cart, { type: "inc", id });
  return cart;
};

describe("cartReducer", () => {
  it("agrega y quita unidades", () => {
    let c = add(EMPTY_CART, "a", 2);
    expect(c.a.qty).toBe(2);
    c = cartReducer(c, { type: "dec", id: "a" });
    expect(c.a.qty).toBe(1);
    c = cartReducer(c, { type: "dec", id: "a" });
    expect(c).toEqual({});
  });

  it("no muta el estado anterior", () => {
    const before = add(EMPTY_CART, "a");
    const snapshot = JSON.stringify(before);
    cartReducer(before, { type: "inc", id: "a" });
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it("dec sobre un producto ausente no cambia nada", () => {
    expect(cartReducer(EMPTY_CART, { type: "dec", id: "x" })).toBe(EMPTY_CART);
  });

  it(`tope de ${MAX_PER_PRODUCT} unidades por producto`, () => {
    const c = add(EMPTY_CART, "a", MAX_PER_PRODUCT + 5);
    expect(c.a.qty).toBe(MAX_PER_PRODUCT);
    expect(addBlockReason(c, "a")).toBe("product");
  });

  it(`tope de ${MAX_TOTAL} unidades por pedido`, () => {
    let c = add(EMPTY_CART, "a", 20);
    c = add(c, "b", 20);
    c = add(c, "c", 20);
    expect(cartCount(c)).toBe(MAX_TOTAL);
    expect(c.c.qty).toBe(10);
    expect(addBlockReason(c, "c")).toBe("total");
    expect(cartReducer(c, { type: "inc", id: "d" })).toBe(c);
  });

  it("al bajar la cantidad recorta los mensajes sobrantes", () => {
    const c: CartState = { a: { qty: 3, messages: ["uno", "dos", "tres"] } };
    expect(cartReducer(c, { type: "dec", id: "a" }).a.messages).toEqual(["uno", "dos"]);
  });

  it("remove elimina un producto por completo", () => {
    const c = add(add(EMPTY_CART, "a", 3), "b", 2);
    expect(cartReducer(c, { type: "remove", id: "a" })).toEqual({
      b: { qty: 2, messages: [] },
    });
    expect(cartReducer(EMPTY_CART, { type: "remove", id: "x" })).toBe(EMPTY_CART);
  });

  it("setMessage actualiza el mensaje de la unidad y respeta el tope de 150 caracteres", () => {
    let c = add(EMPTY_CART, "a", 3);
    c = cartReducer(c, { type: "setMessage", id: "a", index: 0, message: "Feliz cumple" });
    c = cartReducer(c, { type: "setMessage", id: "a", index: 2, message: "x".repeat(160) });
    expect(c.a.messages[0]).toBe("Feliz cumple");
    expect(c.a.messages[1]).toBe("");
    expect(c.a.messages[2]).toBe("x".repeat(150));

    // Índice fuera de rango se ignora
    expect(cartReducer(c, { type: "setMessage", id: "a", index: 5, message: "invalido" })).toBe(c);
    expect(cartReducer(c, { type: "setMessage", id: "a", index: -1, message: "invalido" })).toBe(c);
  });

  it("clearMessages limpia todos los mensajes del producto", () => {
    let c = add(EMPTY_CART, "a", 2);
    c = cartReducer(c, { type: "setMessage", id: "a", index: 0, message: "mensaje" });
    expect(c.a.messages).toEqual(["mensaje", ""]);
    c = cartReducer(c, { type: "clearMessages", id: "a" });
    expect(c.a.messages).toEqual([]);
  });

  it("clear vacía el carrito", () => {
    expect(cartReducer(add(EMPTY_CART, "a"), { type: "clear" })).toEqual({});
  });

  it("hydrate reemplaza el carrito", () => {
    const stored: CartState = { z: { qty: 4, messages: [] } };
    expect(cartReducer(add(EMPTY_CART, "a"), { type: "hydrate", cart: stored })).toBe(stored);
  });
});

describe("dropInactive", () => {
  it("descarta productos que ya no están activos", () => {
    const c = add(add(EMPTY_CART, "a"), "b");
    expect(Object.keys(dropInactive(c, ["b", "z"]))).toEqual(["b"]);
  });
});

describe("parseStoredCart", () => {
  it("devuelve vacío ante null, JSON roto o formas inesperadas", () => {
    for (const raw of [null, "", "{no", "[]", "5", "null"]) expect(parseStoredCart(raw)).toEqual({});
  });

  it("acepta un carrito válido", () => {
    const raw = JSON.stringify({ a: { qty: 2, messages: ["hola"] } });
    expect(parseStoredCart(raw)).toEqual({ a: { qty: 2, messages: ["hola"] } });
  });

  it("descarta cantidades inválidas", () => {
    const raw = JSON.stringify({ a: { qty: 0 }, b: { qty: 1.5 }, c: { qty: "3" }, d: null, e: { qty: 1 } });
    expect(parseStoredCart(raw)).toEqual({ e: { qty: 1, messages: [] } });
  });

  it("aplica los topes y recorta mensajes ajenos a la cantidad", () => {
    const raw = JSON.stringify({
      a: { qty: 99, messages: Array(30).fill("x") },
      b: { qty: 20 },
      c: { qty: 20 },
    });
    const c = parseStoredCart(raw);
    expect(c.a.qty).toBe(MAX_PER_PRODUCT);
    expect(c.a.messages).toHaveLength(MAX_PER_PRODUCT);
    expect(cartCount(c)).toBe(MAX_TOTAL);
  });

  it("ignora mensajes que no son texto", () => {
    const raw = JSON.stringify({ a: { qty: 2, messages: ["ok", 5, null] } });
    expect(parseStoredCart(raw).a.messages).toEqual(["ok"]);
  });
});
