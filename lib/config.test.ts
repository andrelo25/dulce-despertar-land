import { describe, expect, it } from "vitest";
import { MAX_PER_PRODUCT, MAX_TOTAL, SHIPPING_FEE, SLOTS } from "./config";

describe("config", () => {
  it("define las 8 franjas de entrega de la spec", () => {
    expect(SLOTS).toHaveLength(8);
    expect(SLOTS[0]).toBe("07:00-08:00");
    expect(SLOTS[7]).toBe("18:00-19:00");
  });

  it("fija el costo de envío y los topes", () => {
    expect(SHIPPING_FEE).toBe(3000);
    expect(MAX_PER_PRODUCT).toBe(20);
    expect(MAX_TOTAL).toBe(50);
  });
});
