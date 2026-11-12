import { describe, expect, it } from "vitest";
import { isValidPhone, normalizePhone, toWhatsappId } from "./phone";

describe("normalizePhone", () => {
  it("acepta los ejemplos de la spec con y sin guiones", () => {
    expect(normalizePhone("351-3445566")).toBe("3513445566");
    expect(normalizePhone("385-4332211")).toBe("3854332211");
    expect(normalizePhone("3513445566")).toBe("3513445566");
  });

  it("ignora espacios, guiones y paréntesis", () => {
    expect(normalizePhone(" (351) 344 5566 ")).toBe("3513445566");
    expect(normalizePhone("351 - 344-5566")).toBe("3513445566");
  });

  it("rechaza prefijo 0, 15, +54 y 549", () => {
    expect(normalizePhone("0351-3445566")).toBeNull();
    expect(normalizePhone("0351-15-3445566")).toBeNull();
    expect(normalizePhone("+54 351 3445566")).toBeNull();
    expect(normalizePhone("549 351 3445566")).toBeNull();
    // 15 + 8 dígitos = 10 dígitos, pero es un celular sin característica
    expect(normalizePhone("15-34455667")).toBeNull();
  });

  it("rechaza largos distintos de 10 dígitos", () => {
    expect(normalizePhone("351-344556")).toBeNull(); // 9
    expect(normalizePhone("351-34455667")).toBeNull(); // 11
    expect(normalizePhone("")).toBeNull();
  });

  it("rechaza letras y símbolos", () => {
    expect(normalizePhone("351-34455AB")).toBeNull();
    expect(normalizePhone("351.344.5566")).toBeNull();
    expect(normalizePhone("351/3445566")).toBeNull();
  });
});

describe("isValidPhone", () => {
  it("refleja normalizePhone", () => {
    expect(isValidPhone("351-3445566")).toBe(true);
    expect(isValidPhone("0351-3445566")).toBe(false);
  });
});

describe("toWhatsappId", () => {
  it("antepone 549 al número normalizado", () => {
    expect(toWhatsappId("351-3445566")).toBe("5493513445566");
    expect(toWhatsappId("385-4332211")).toBe("5493854332211");
  });

  it("devuelve null si el número es inválido", () => {
    expect(toWhatsappId("0351-3445566")).toBeNull();
  });
});
