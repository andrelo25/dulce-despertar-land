import { describe, expect, it } from "vitest";
import { formatMoney } from "./money";

describe("formatMoney", () => {
  it("usa punto de miles y prefijo $", () => {
    expect(formatMoney(18500)).toBe("$18.500");
    expect(formatMoney(123456)).toBe("$123.456");
  });

  it("agrupa también los números de 4 dígitos (envío y precios bajos)", () => {
    expect(formatMoney(3000)).toBe("$3.000");
    expect(formatMoney(5500)).toBe("$5.500");
  });

  it("no agrupa menos de 4 dígitos", () => {
    expect(formatMoney(999)).toBe("$999");
    expect(formatMoney(0)).toBe("$0");
  });
});
