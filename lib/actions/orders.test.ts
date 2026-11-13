import { describe, expect, it, vi, beforeEach } from "vitest";
import { submitOrder } from "./orders";

const mockRpc = vi.fn();

vi.mock("../supabase/secret", () => ({
  createSecretClient: () => ({
    rpc: mockRpc,
  }),
}));

describe("submitOrder action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validCart = JSON.stringify([
    { productId: "11111111-1111-4111-8111-111111111111", qty: 2, messages: ["Feliz día", ""] },
  ]);

  const futureDate = () => {
    const d = new Date(Date.now() + 48 * 3600e3);
    return d.toISOString().slice(0, 10);
  };

  const createFormData = (overrides: Record<string, string | null> = {}) => {
    const fd = new FormData();
    const data: Record<string, string> = {
      cart: validCart,
      name: "Ana Pérez",
      phone: "3513445566",
      deliveryType: "domicilio",
      address: "Av. Colón 1234",
      date: futureDate(),
      slot: "08:00-09:00",
      note: "Dejar en recepción",
      website: "",
      ...overrides,
    };

    for (const [key, value] of Object.entries(data)) {
      if (value !== null) fd.append(key, value);
    }
    return fd;
  };

  it("rechaza si el honeypot está lleno", async () => {
    const fd = createFormData({ website: "https://spam.bot" });
    const result = await submitOrder(null, fd);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.website).toBeDefined();
    }
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("rechaza si el JSON del carrito es inválido", async () => {
    const fd = createFormData({ cart: "{invalido" });
    const result = await submitOrder(null, fd);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.cart).toBeDefined();
    }
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("rechaza datos de formulario incompletos", async () => {
    const fd = createFormData({ name: "", phone: "123", address: "" });
    const result = await submitOrder(null, fd);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.name).toBeDefined();
      expect(result.fieldErrors.phone).toBeDefined();
      expect(result.fieldErrors.address).toBeDefined();
    }
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("crea el pedido con éxito llamando a la RPC create_order", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        ok: true,
        id: 1005,
        subtotal: 64000,
        shipping_fee: 3000,
        total: 67000,
      },
      error: null,
    });

    const fd = createFormData();
    const result = await submitOrder(null, fd);

    expect(result).toEqual({
      ok: true,
      order: {
        id: 1005,
        subtotal: 64000,
        shippingFee: 3000,
        total: 67000,
      },
    });

    expect(mockRpc).toHaveBeenCalledWith("create_order", {
      p_name: "Ana Pérez",
      p_phone: "3513445566",
      p_delivery_type: "domicilio",
      p_address: "Av. Colón 1234",
      p_delivery_at: expect.any(String),
      p_slot: "08:00-09:00",
      p_note: "Dejar en recepción",
      p_shipping_fee: 3000,
      p_items: [
        {
          productId: "11111111-1111-4111-8111-111111111111",
          qty: 2,
          messages: ["Feliz día", ""],
        },
      ],
    });
  });

  it("retiro en local descarta la dirección y fija shipping_fee en 0 en la RPC", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        ok: true,
        id: 1006,
        subtotal: 64000,
        shipping_fee: 0,
        total: 64000,
      },
      error: null,
    });

    const fd = createFormData({ deliveryType: "retiro", address: "Ignorada 123" });
    const result = await submitOrder(null, fd);

    expect(result.ok).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith(
      "create_order",
      expect.objectContaining({
        p_delivery_type: "retiro",
        p_address: null,
      }),
    );
  });

  it("maneja respuesta 'unavailable' de la RPC devolviendo los nombres no disponibles", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        ok: false,
        error: "unavailable",
        names: ["Caja Feliz Cumple", "Pan casero"],
      },
      error: null,
    });

    const fd = createFormData();
    const result = await submitOrder(null, fd);

    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        cart: [
          "Ya no están disponibles: Caja Feliz Cumple, Pan casero. Quitalos del carrito para continuar.",
        ],
      },
      unavailable: ["Caja Feliz Cumple", "Pan casero"],
    });
  });

  it("maneja respuesta 'rate_limit' de la RPC", async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        ok: false,
        error: "rate_limit",
      },
      error: null,
    });

    const fd = createFormData();
    const result = await submitOrder(null, fd);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.form?.[0]).toMatch(/límite de pedidos/i);
    }
  });

  it("maneja fallo en la llamada RPC devolviendo un error genérico", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "Database error" },
    });

    const fd = createFormData();
    const result = await submitOrder(null, fd);

    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        form: ["No pudimos procesar tu pedido. Por favor intentá de nuevo."],
      },
    });
  });
});
