import { describe, expect, it } from "vitest";
import { PRODUCT_IMAGE_MAX_BYTES } from "../config";
import { checkImage, parseProductInput } from "./product-schema";

const valid = {
  name: "Caja Feliz",
  description: "Con medialunas",
  price: "32000",
  section: "desayunos",
  motive: "Cumpleaños",
  status: "active",
  sortOrder: "10",
};

describe("parseProductInput", () => {
  it("acepta un producto válido y convierte números", () => {
    const r = parseProductInput(valid);
    expect(r).toEqual({
      ok: true,
      data: {
        name: "Caja Feliz",
        description: "Con medialunas",
        price: 32000,
        section: "desayunos",
        motive: "Cumpleaños",
        status: "active",
        sortOrder: 10,
      },
    });
  });

  it("los dulces nunca llevan motivo", () => {
    const r = parseProductInput({ ...valid, section: "dulces" });
    expect(r.ok && r.data.motive).toBeNull();
  });

  it("motivo vacío o ausente pasa a null", () => {
    expect(parseProductInput({ ...valid, motive: "  " })).toMatchObject({ ok: true, data: { motive: null } });
    expect(parseProductInput({ ...valid, motive: null })).toMatchObject({ ok: true, data: { motive: null } });
  });

  it.each([
    ["name", { name: " a " }],
    ["name", { name: "x".repeat(121) }],
    ["description", { description: "x".repeat(501) }],
    ["price", { price: "0" }],
    ["price", { price: "-5" }],
    ["price", { price: "12.5" }],
    ["price", { price: "abc" }],
    ["price", { price: "" }],
    ["section", { section: "bebidas" }],
    ["status", { status: "borrado" }],
    ["sortOrder", { sortOrder: "-1" }],
    ["motive", { motive: "x".repeat(41) }],
  ])("rechaza %s inválido", (field, patch) => {
    const r = parseProductInput({ ...valid, ...patch });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors[field]?.length).toBeGreaterThan(0);
  });

  it("rechaza campos ausentes (por ejemplo un File en lugar de texto)", () => {
    expect(parseProductInput({})).toMatchObject({ ok: false });
    expect(parseProductInput({ ...valid, name: new Blob(["x"]) })).toMatchObject({ ok: false });
  });
});

describe("checkImage", () => {
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const webp = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]);

  it("acepta JPEG, PNG y WEBP por su firma", () => {
    expect(checkImage(1000, jpeg)).toMatchObject({ ok: true, contentType: "image/jpeg", ext: "jpg" });
    expect(checkImage(1000, png)).toMatchObject({ ok: true, contentType: "image/png", ext: "png" });
    expect(checkImage(1000, webp)).toMatchObject({ ok: true, contentType: "image/webp", ext: "webp" });
  });

  it("2 MB exactos es válido y 1 byte más se rechaza", () => {
    expect(checkImage(PRODUCT_IMAGE_MAX_BYTES, jpeg).ok).toBe(true);
    expect(checkImage(PRODUCT_IMAGE_MAX_BYTES + 1, jpeg)).toEqual({
      ok: false,
      error: "La imagen no puede superar 2 MB.",
    });
  });

  it("rechaza archivos que no son imagen aunque se llamen .jpg", () => {
    const text = new TextEncoder().encode("<svg onload=alert(1)>");
    expect(checkImage(100, text).ok).toBe(false);
    expect(checkImage(100, new Uint8Array(12)).ok).toBe(false);
  });

  it("RIFF que no es WEBP (por ejemplo WAV) se rechaza", () => {
    const wav = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45]);
    expect(checkImage(100, wav).ok).toBe(false);
  });
});
