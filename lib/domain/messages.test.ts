import { describe, expect, it } from "vitest";
import {
  adminNewOrderParams,
  cancelledParams,
  confirmedParams,
  formatDateLabel,
  formatSlotLabel,
  oneLine,
  summarizeItems,
  type OrderSummary,
} from "./messages";
import { STORE } from "../config";

const order: OrderSummary = {
  id: 1001,
  customerName: "Ana Pérez",
  customerPhone: "3513445566",
  deliveryType: "domicilio",
  address: "Av. Colón 123, Córdoba",
  deliveryDate: "2026-11-17",
  deliverySlot: "08:00-09:00",
  items: [
    { name: "Caja Cumpleaños", qty: 2, unitPrice: 18500, messages: ["Feliz cumple Ana", ""] },
    { name: "Alfajores artesanales", qty: 1, unitPrice: 3200, messages: [] },
  ],
  subtotal: 40200,
  shippingFee: 3000,
  total: 43200,
};

describe("oneLine", () => {
  it("colapsa saltos de línea, tabulaciones y espacios múltiples", () => {
    expect(oneLine("  Av.\nColón \t 123   ")).toBe("Av. Colón 123");
  });
});

describe("formatDateLabel / formatSlotLabel", () => {
  it("formatea DD/MM/AAAA y 'HH:MM a HH:MM'", () => {
    expect(formatDateLabel("2026-11-17")).toBe("17/11/2026");
    expect(formatSlotLabel("08:00-09:00")).toBe("08:00 a 09:00");
  });
});

describe("summarizeItems", () => {
  it("una sola línea con · y marca los mensajes personalizados", () => {
    const s = summarizeItems(order.items);
    expect(s).toBe(
      "2 × Caja Cumpleaños ($37.000, con mensaje personalizado) · 1 × Alfajores artesanales ($3.200)",
    );
    expect(s).not.toMatch(/[\n\t]/);
  });
});

describe("parámetros de plantilla", () => {
  it("confirmado: orden fijo, sin saltos de línea", () => {
    const p = confirmedParams(order);
    expect(p).toEqual([
      "Ana Pérez",
      "1001",
      "2 × Caja Cumpleaños ($37.000, con mensaje personalizado) · 1 × Alfajores artesanales ($3.200)",
      "$43.200",
      "Envío a domicilio (Av. Colón 123, Córdoba), $3.000 de envío incluido",
      "17/11/2026, 08:00 a 09:00",
      "BUENDIA.DESAYUNOS",
    ]);
    for (const v of p) expect(v).not.toMatch(/[\n\t]/);
  });

  it("confirmado con retiro indica el local y no menciona envío", () => {
    const p = confirmedParams({ ...order, deliveryType: "retiro", address: null, shippingFee: 0, total: 40200 });
    expect(p[4]).toBe(`Retiro en el local (${STORE.address})`);
    expect(p[3]).toBe("$40.200");
  });

  it("cancelado: nombre y número de pedido", () => {
    expect(cancelledParams(order)).toEqual(["Ana Pérez", "1001"]);
  });

  it("aviso al admin: pedido, cliente, teléfono, total y entrega", () => {
    expect(adminNewOrderParams(order)).toEqual([
      "1001",
      "Ana Pérez",
      "3513445566",
      "$43.200",
      "Envío a domicilio, 17/11/2026, 08:00 a 09:00",
    ]);
  });

  it("limpia saltos de línea de datos cargados por el cliente", () => {
    const p = confirmedParams({ ...order, customerName: "Ana\nPérez", address: "Calle 1\n\nPiso 2" });
    expect(p[0]).toBe("Ana Pérez");
    expect(p[4]).toContain("Calle 1 Piso 2");
  });
});
