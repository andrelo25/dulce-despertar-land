import { describe, expect, it } from "vitest";
import { MAX_PER_PRODUCT, MAX_TOTAL, MESSAGE_MAX, NOTE_MAX } from "../config";
import { checkCartAgainstCatalog, parseOrderInput, type CatalogEntry } from "./order-schema";

const NOW = new Date("2026-11-16T20:00:00-03:00"); // lunes 20:00 ART
const P1 = "a0000000-0000-4000-8000-000000000001";
const P2 = "a0000000-0000-4000-8000-000000000002";
const P3 = "a0000000-0000-4000-8000-000000000003";

const valid = () => ({
  cart: [{ productId: P1, qty: 2, messages: ["Feliz cumple", ""] }],
  name: "Ana Pérez",
  phone: "351-3445566",
  deliveryType: "domicilio",
  address: "Av. Colón 123, Córdoba",
  date: "2026-11-17",
  slot: "08:00-09:00",
  note: "Tocar timbre 2",
  website: "",
});

function errorsOf(raw: unknown) {
  const r = parseOrderInput(raw, NOW);
  if (r.ok) throw new Error("se esperaba un pedido inválido");
  return r.fieldErrors;
}

describe("pedido válido", () => {
  it("a domicilio: normaliza teléfono y conserva dirección, mensajes y nota", () => {
    const r = parseOrderInput(valid(), NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toEqual({
      cart: [{ productId: P1, qty: 2, messages: ["Feliz cumple", ""] }],
      name: "Ana Pérez",
      phone: "3513445566",
      deliveryType: "domicilio",
      address: "Av. Colón 123, Córdoba",
      date: "2026-11-17",
      slot: "08:00-09:00",
      note: "Tocar timbre 2",
    });
    expect(r.data).not.toHaveProperty("website");
  });

  it("retiro en local: no pide dirección y la descarta aunque venga", () => {
    const base = { ...valid(), deliveryType: "retiro" };
    for (const address of ["", undefined, null, "Calle X 1"]) {
      const r = parseOrderInput({ ...base, address }, NOW);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.data.address).toBeNull();
    }
  });

  it("nota vacía o ausente queda en null; recorta espacios", () => {
    for (const note of ["", "   ", undefined, null]) {
      const r = parseOrderInput({ ...valid(), note }, NOW);
      expect(r.ok && r.data.note).toBeNull();
    }
    const r = parseOrderInput({ ...valid(), name: "  Ana  ", address: "  Calle 12345  " }, NOW);
    expect(r.ok && r.data.name).toBe("Ana");
    expect(r.ok && r.data.address).toBe("Calle 12345");
  });

  it("mensajes: sin texto en ninguna unidad se normalizan a []; se recortan espacios", () => {
    const a = parseOrderInput({ ...valid(), cart: [{ productId: P1, qty: 2, messages: ["", "  "] }] }, NOW);
    expect(a.ok && a.data.cart[0].messages).toEqual([]);
    const b = parseOrderInput({ ...valid(), cart: [{ productId: P1, qty: 2 }] }, NOW);
    expect(b.ok && b.data.cart[0].messages).toEqual([]);
    const c = parseOrderInput({ ...valid(), cart: [{ productId: P1, qty: 2, messages: ["  hola  ", "x"] }] }, NOW);
    expect(c.ok && c.data.cart[0].messages).toEqual(["hola", "x"]);
  });

  it("acepta los topes exactos: 20 por producto y 50 en total", () => {
    const cart = [
      { productId: P1, qty: MAX_PER_PRODUCT },
      { productId: P2, qty: MAX_PER_PRODUCT },
      { productId: P3, qty: MAX_TOTAL - 2 * MAX_PER_PRODUCT },
    ];
    expect(parseOrderInput({ ...valid(), cart }, NOW).ok).toBe(true);
  });

  it("acepta mensaje de exactamente 150 caracteres", () => {
    const cart = [{ productId: P1, qty: 1, messages: ["a".repeat(MESSAGE_MAX)] }];
    expect(parseOrderInput({ ...valid(), cart }, NOW).ok).toBe(true);
  });
});

describe("carrito (C8, C9)", () => {
  it("rechaza carrito vacío o ausente", () => {
    expect(errorsOf({ ...valid(), cart: [] }).cart).toBeDefined();
    expect(errorsOf({ ...valid(), cart: undefined }).cart).toBeDefined();
  });

  it("rechaza 21 unidades de un mismo producto", () => {
    const e = errorsOf({ ...valid(), cart: [{ productId: P1, qty: MAX_PER_PRODUCT + 1 }] });
    expect(e.cart?.[0]).toContain("20");
  });

  it("rechaza 51 unidades en total (3 productos de 17)", () => {
    const cart = [P1, P2, P3].map((productId) => ({ productId, qty: 17 }));
    const e = errorsOf({ ...valid(), cart });
    expect(e.cart?.[0]).toContain("50");
  });

  it("rechaza el mismo producto repetido (evita saltear el tope por producto)", () => {
    const cart = [
      { productId: P1, qty: 20 },
      { productId: P1, qty: 20 },
    ];
    expect(errorsOf({ ...valid(), cart }).cart).toBeDefined();
  });

  it("rechaza cantidad cero, negativa, decimal o no numérica", () => {
    for (const qty of [0, -1, 1.5, "2", null]) {
      expect(errorsOf({ ...valid(), cart: [{ productId: P1, qty }] }).cart).toBeDefined();
    }
  });

  it("rechaza ids que no son uuid", () => {
    expect(errorsOf({ ...valid(), cart: [{ productId: "abc", qty: 1 }] }).cart).toBeDefined();
  });

  it("rechaza más mensajes que unidades", () => {
    const cart = [{ productId: P1, qty: 1, messages: ["uno", "dos"] }];
    expect(errorsOf({ ...valid(), cart }).cart).toBeDefined();
  });

  it("rechaza un mensaje de 151 caracteres", () => {
    const cart = [{ productId: P1, qty: 1, messages: ["a".repeat(MESSAGE_MAX + 1)] }];
    expect(errorsOf({ ...valid(), cart }).cart?.[0]).toContain("150");
  });
});

describe("datos del cliente (C10–C12)", () => {
  it("nombre vacío, de 1 letra o solo espacios", () => {
    for (const name of ["", " ", "A", undefined]) {
      expect(errorsOf({ ...valid(), name }).name).toBeDefined();
    }
  });

  it("nombre demasiado largo", () => {
    expect(errorsOf({ ...valid(), name: "a".repeat(81) }).name).toBeDefined();
  });

  it("teléfonos válidos de la spec", () => {
    for (const phone of ["351-3445566", "385-4332211", "3513445566", "(351) 344 5566"]) {
      expect(parseOrderInput({ ...valid(), phone }, NOW).ok).toBe(true);
    }
  });

  it("teléfonos inválidos indican el formato esperado", () => {
    for (const phone of ["0351-3445566", "351-15-3445566", "+54 351 3445566", "351-344556", "351-34455667", "", "abc"]) {
      const e = errorsOf({ ...valid(), phone });
      expect(e.phone?.[0]).toContain("351-3445566");
    }
  });

  it("dirección obligatoria si es a domicilio", () => {
    for (const address of ["", "   ", "Cal", undefined, null]) {
      expect(errorsOf({ ...valid(), address }).address).toBeDefined();
    }
  });

  it("dirección demasiado larga", () => {
    expect(errorsOf({ ...valid(), address: "a".repeat(201) }).address).toBeDefined();
  });

  it("forma de entrega ausente o inválida", () => {
    for (const deliveryType of [undefined, "", "correo"]) {
      expect(errorsOf({ ...valid(), deliveryType }).deliveryType).toBeDefined();
    }
  });

  it("nota de más de 300 caracteres", () => {
    expect(errorsOf({ ...valid(), note: "a".repeat(NOTE_MAX + 1) }).note).toBeDefined();
    expect(parseOrderInput({ ...valid(), note: "a".repeat(NOTE_MAX) }, NOW).ok).toBe(true);
  });
});

describe("fecha y horario (C11, C13)", () => {
  it("horario sin elegir o inexistente", () => {
    for (const slot of ["", undefined, "06:00-07:00", "12:00-13:00"]) {
      expect(errorsOf({ ...valid(), slot }).slot).toBeDefined();
    }
  });

  it("fecha vacía, mal formada o inexistente", () => {
    for (const date of ["", undefined, "17/11/2026", "2026-02-30"]) {
      expect(errorsOf({ ...valid(), date }).date).toBeDefined();
    }
  });

  it("fecha pasada: error en la fecha, no en el horario", () => {
    const e = errorsOf({ ...valid(), date: "2026-11-10" });
    expect(e.date?.[0]).toContain("anterior");
    expect(e.slot).toBeUndefined();
  });

  it("menos de 12 h: error en el horario con la anticipación mínima", () => {
    const e = errorsOf({ ...valid(), slot: "07:00-08:00" }); // lunes 20:00 -> martes 07:00 = 11 h
    expect(e.slot?.[0]).toContain("12 h");
    expect(e.date).toBeUndefined();
  });

  it("hoy mismo no se puede salvo que pasen 12 h", () => {
    expect(errorsOf({ ...valid(), date: "2026-11-16", slot: "18:00-19:00" }).slot).toBeDefined();
  });

  it("12 h exactas es válido; 11 h 59 min no", () => {
    expect(parseOrderInput(valid(), new Date("2026-11-16T20:00:00-03:00")).ok).toBe(true);
    expect(parseOrderInput(valid(), new Date("2026-11-16T20:01:00-03:00")).ok).toBe(false);
  });
});

describe("anti-abuso y forma de la entrada", () => {
  it("honeypot completo: rechaza", () => {
    expect(errorsOf({ ...valid(), website: "http://spam" }).website).toBeDefined();
  });

  it("entrada que no es un objeto", () => {
    for (const raw of [null, undefined, "x", 42, []]) {
      const r = parseOrderInput(raw, NOW);
      expect(r.ok).toBe(false);
    }
  });

  it("acumula todos los errores en una sola respuesta, sin duplicados", () => {
    const e = errorsOf({
      cart: [
        { productId: P1, qty: 99 },
        { productId: P2, qty: 99 },
      ],
      name: "",
      phone: "0",
      deliveryType: "domicilio",
      address: "",
      date: "2026-11-10",
      slot: "",
    });
    expect(Object.keys(e).sort()).toEqual(["address", "cart", "date", "name", "phone", "slot"]);
    expect(new Set(e.cart).size).toBe(e.cart?.length);
  });
});

describe("checkCartAgainstCatalog (C16, C9)", () => {
  const catalog = new Map<string, CatalogEntry>([
    [P1, { name: "Caja Cumpleaños", section: "desayunos", status: "active" }],
    [P2, { name: "Alfajores artesanales", section: "dulces", status: "active" }],
    [P3, { name: "Torta de frutos", section: "tortas", status: "unavailable" }],
    ["a0000000-0000-4000-8000-000000000004", { name: "Pan casero", section: "dulces", status: "hidden" }],
  ]);

  it("todo activo y sin mensajes en dulces: ok", () => {
    const cart = [
      { productId: P1, qty: 2, messages: ["hola", "chau"] },
      { productId: P2, qty: 3, messages: [] },
    ];
    expect(checkCartAgainstCatalog(cart, catalog)).toEqual({ ok: true });
  });

  it("un mensaje en un dulce se rechaza y nombra el producto", () => {
    const r = checkCartAgainstCatalog([{ productId: P2, qty: 1, messages: ["hola"] }], catalog);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.fieldErrors.cart?.[0]).toContain("Alfajores artesanales");
    expect(r.unavailable).toEqual([]);
  });

  it("producto no disponible u oculto: devuelve sus nombres para que el cliente los quite", () => {
    const cart = [
      { productId: P1, qty: 1, messages: [] },
      { productId: P3, qty: 1, messages: [] },
      { productId: "a0000000-0000-4000-8000-000000000004", qty: 1, messages: [] },
    ];
    const r = checkCartAgainstCatalog(cart, catalog);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.unavailable).toEqual(["Torta de frutos", "Pan casero"]);
  });

  it("producto inexistente: error genérico de carrito", () => {
    const r = checkCartAgainstCatalog(
      [{ productId: "a0000000-0000-4000-8000-0000000000ff", qty: 1, messages: [] }],
      catalog,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.fieldErrors.cart).toBeDefined();
  });

  it("un mensaje vacío en un dulce no cuenta como personalización", () => {
    const r = checkCartAgainstCatalog([{ productId: P2, qty: 2, messages: ["", ""] }], catalog);
    expect(r).toEqual({ ok: true });
  });
});
