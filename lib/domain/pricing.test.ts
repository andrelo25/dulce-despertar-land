import { describe, expect, it } from "vitest";
import { computeTotals, countUnits } from "./pricing";

const items = [
  { unitPrice: 18500, qty: 2 },
  { unitPrice: 3200, qty: 3 },
];

describe("computeTotals", () => {
  it("domicilio = subtotal + $3.000", () => {
    expect(computeTotals(items, "domicilio")).toEqual({
      subtotal: 46600,
      shippingFee: 3000,
      total: 49600,
    });
  });

  it("retiro = subtotal, sin envío", () => {
    expect(computeTotals(items, "retiro")).toEqual({
      subtotal: 46600,
      shippingFee: 0,
      total: 46600,
    });
  });

  it("carrito vacío no tiene subtotal", () => {
    expect(computeTotals([], "retiro").subtotal).toBe(0);
  });
});

describe("countUnits", () => {
  it("suma las unidades de todos los productos", () => {
    expect(countUnits(items)).toBe(5);
    expect(countUnits([])).toBe(0);
  });
});
