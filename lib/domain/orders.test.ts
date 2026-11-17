import { describe, expect, it } from "vitest";
import { confirmCountdown, historyStart, orderStats, paginate, personalizedMessages, type AdminOrder } from "./orders";

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
  it("cuenta entregados y cancelados", () => {
    const s = orderStats(
      [order({ status: "entregado" }), order({ status: "entregado" }), order({ status: "cancelado" }), order({})],
      now,
    );
    expect(s).toMatchObject({ pending: 1, confirmed: 0, delivered: 2, cancelled: 1 });
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

describe("historyStart", () => {
  it("es la medianoche argentina de hace 6 días (hoy + 6 anteriores = 7 días)", () => {
    expect(historyStart(new Date("2026-11-16T20:00:00-03:00"))).toBe("2026-11-10T03:00:00.000Z");
  });
  it("usa la fecha argentina, no la UTC (23:30 ART ya es el día siguiente en UTC)", () => {
    expect(historyStart(new Date("2026-11-16T23:30:00-03:00"))).toBe("2026-11-10T03:00:00.000Z");
  });
});

describe("paginate", () => {
  const list = Array.from({ length: 23 }, (_, i) => i + 1);
  it("devuelve 10 por página", () => {
    expect(paginate(list, 1)).toMatchObject({ page: 1, pages: 3, items: list.slice(0, 10) });
    expect(paginate(list, 3).items).toEqual([21, 22, 23]);
  });
  it("ajusta páginas fuera de rango", () => {
    expect(paginate(list, 99).page).toBe(3);
    expect(paginate(list, 0).page).toBe(1);
    expect(paginate(list, Number.NaN).page).toBe(1);
  });
  it("lista vacía: una página sin ítems", () => {
    expect(paginate([], 1)).toEqual({ items: [], page: 1, pages: 1 });
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
