import { describe, expect, it } from "vitest";
import { confirmCountdown, orderStats, personalizedMessages, type AdminOrder } from "./orders";

const T0 = Date.parse("2026-11-16T12:00:00-03:00");
const min = (n: number) => T0 + n * 60000;

describe("confirmCountdown", () => {
  it("cuenta los minutos que quedan", () => {
    expect(confirmCountdown(T0, min(0))).toEqual({ label: "Quedan 30 min para confirmar", late: false, urgent: false });
    expect(confirmCountdown(T0, min(10)).label).toBe("Quedan 20 min para confirmar");
  });
  it("marca urgente en los últimos 5 min", () => {
    expect(confirmCountdown(T0, min(25))).toMatchObject({ label: "Quedan 5 min para confirmar", urgent: true, late: false });
  });
  it("pasados 30 min pasa a Demorado", () => {
    expect(confirmCountdown(T0, min(29) + 59_000).label).toBe("Quedan 1 min para confirmar");
    expect(confirmCountdown(T0, min(30))).toEqual({ label: "Demorado 0 min", late: true, urgent: true });
    expect(confirmCountdown(T0, min(42)).label).toBe("Demorado 12 min");
  });
  it("no devuelve tiempo negativo si el reloj del cliente va atrasado", () => {
    expect(confirmCountdown(T0, min(-3)).label).toBe("Quedan 30 min para confirmar");
  });
});

const order = (o: Partial<AdminOrder>): AdminOrder => ({
  id: 1001,
  customerName: "Ana",
  customerPhone: "3513445566",
  deliveryType: "retiro",
  address: null,
  deliveryAt: "2026-11-17T08:00:00-03:00",
  deliverySlot: "08:00-09:00",
  note: null,
  subtotal: 1000,
  shippingFee: 0,
  total: 1000,
  status: "pendiente",
  createdAt: "2026-11-16T12:00:00-03:00",
  items: [],
  ...o,
});

describe("orderStats", () => {
  const now = new Date("2026-11-16T20:00:00-03:00");
  it("cuenta pendientes y confirmados", () => {
    const s = orderStats([order({}), order({ status: "confirmado" }), order({ status: "entregado" })], now);
    expect(s).toMatchObject({ pending: 1, confirmed: 1 });
  });
  it("el total del día excluye cancelados y pedidos de otro día", () => {
    const s = orderStats(
      [
        order({ total: 1000 }),
        order({ total: 500, status: "cancelado" }),
        order({ total: 700, createdAt: "2026-11-15T12:00:00-03:00" }),
        order({ total: 300, createdAt: "2026-11-16T23:30:00-03:00" }),
      ],
      now,
    );
    expect(s.todayTotal).toBe(1300);
  });
});

describe("personalizedMessages", () => {
  it("devuelve solo los no vacíos con su número de unidad", () => {
    expect(personalizedMessages(["Feliz cumple", "", "  ", "Gracias"])).toEqual([
      { unit: 1, text: "Feliz cumple" },
      { unit: 4, text: "Gracias" },
    ]);
  });
  it("sin mensajes devuelve lista vacía", () => {
    expect(personalizedMessages([])).toEqual([]);
  });
});
