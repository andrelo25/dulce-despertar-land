import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { notifyAdminsNewOrder, type NewOrderEmailInput } from "./email";

const mockListUsers = vi.fn();
const mockItems = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("./supabase/secret", () => ({
  createSecretClient: () => ({
    auth: { admin: { listUsers: mockListUsers } },
    from: () => ({
      select: () => ({ eq: () => ({ order: mockItems }) }),
    }),
  }),
}));

const order: NewOrderEmailInput = {
  id: 1001,
  customerName: "Ana Pérez",
  customerPhone: "3513445566",
  deliveryType: "retiro",
  address: null,
  deliveryDate: "2026-11-17",
  deliverySlot: "08:00-09:00",
  note: null,
  subtotal: 40200,
  shippingFee: 0,
  total: 40200,
};

const admins = {
  data: {
    users: [
      { email: "admin1@example.com", app_metadata: { role: "admin" } },
      { email: "admin2@example.com", app_metadata: { role: "admin" } },
      { email: "cliente@example.com", app_metadata: {} },
      { email: "falso@example.com", app_metadata: {}, user_metadata: { role: "admin" } },
    ],
  },
  error: null,
};

const items = {
  data: [{ product_name: "Caja Cumpleaños", qty: 2, unit_price: 18500, messages: ["Feliz cumple", ""] }],
  error: null,
};

describe("notifyAdminsNewOrder", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("RESEND_API_KEY", "re_test_secret");
    vi.stubEnv("EMAIL_FROM", "Dulce Despertar <pedidos@example.com>");
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockListUsers.mockResolvedValue(admins);
    mockItems.mockResolvedValue(items);
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("envía un solo correo a todos los admins (solo app_metadata.role) con el detalle del pedido", async () => {
    await notifyAdminsNewOrder(order);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test_secret");
    const body = JSON.parse(init.body);
    expect(body.to).toEqual(["admin1@example.com", "admin2@example.com"]);
    expect(body.from).toBe("Dulce Despertar <pedidos@example.com>");
    expect(body.subject).toBe("Nuevo pedido #1001 — Ana Pérez — $40.200");
    expect(body.text).toContain("2 × Caja Cumpleaños — $37.000");
    expect(body.text).toContain("Mensaje 1: Feliz cumple");
    expect(body.text).toContain("https://wa.me/5493513445566");
    expect(body.html).toContain('<a href="https://wa.me/5493513445566">https://wa.me/5493513445566</a>');
  });

  it("no lanza ni loguea secretos cuando Resend responde error HTTP", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 422 });

    await expect(notifyAdminsNewOrder(order)).resolves.toBeUndefined();

    const logged = String(vi.mocked(console.error).mock.calls[0][0]);
    expect(logged).toContain("http_422");
    expect(logged).not.toContain("re_test_secret");
    expect(logged).not.toContain("admin1@example.com");
  });

  it("no lanza si hay timeout", async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error("timeout"), { name: "TimeoutError" }));

    await expect(notifyAdminsNewOrder(order)).resolves.toBeUndefined();
    expect(String(vi.mocked(console.error).mock.calls[0][0])).toContain("timeout");
  });

  it("no envía si no hay administradores", async () => {
    mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });

    await notifyAdminsNewOrder(order);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(String(vi.mocked(console.error).mock.calls[0][0])).toContain("no_admins");
  });

  it("no envía si falta la configuración del proveedor", async () => {
    vi.stubEnv("RESEND_API_KEY", "");

    await notifyAdminsNewOrder(order);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(String(vi.mocked(console.error).mock.calls[0][0])).toContain("not_configured");
  });

  it("no lanza si falla la lectura de usuarios o ítems", async () => {
    mockListUsers.mockResolvedValue({ data: null, error: { message: "boom" } });

    await expect(notifyAdminsNewOrder(order)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
