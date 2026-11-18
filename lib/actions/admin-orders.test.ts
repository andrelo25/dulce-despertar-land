import { beforeEach, describe, expect, it, vi } from "vitest";
import { cancelOrder, confirmOrder, markDelivered } from "./admin-orders";

const mockVerify = vi.fn();
const mockRevalidate = vi.fn();
const mockEqStatus = vi.fn();
const mockEqId = vi.fn();
const mockUpdate = vi.fn();
const mockFrom = vi.fn();

vi.mock("../dal", () => ({ verifyAdmin: () => mockVerify() }));
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => mockRevalidate(p) }));
vi.mock("../supabase/server", () => ({
  createClient: async () => ({ from: (t: string) => mockFrom(t) }),
}));

describe("acciones de estado de pedidos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockVerify.mockResolvedValue({ id: "admin", email: "a@b.c" });
    mockEqStatus.mockReturnValue({ select: async () => ({ data: [{ id: 5 }], error: null }) });
    mockEqId.mockReturnValue({ eq: mockEqStatus });
    mockUpdate.mockReturnValue({ eq: mockEqId });
    mockFrom.mockReturnValue({ update: mockUpdate });
  });

  it("confirmar: pendiente → confirmado, condicionado al estado de origen", async () => {
    expect(await confirmOrder(5)).toEqual({ ok: true });
    expect(mockFrom).toHaveBeenCalledWith("orders");
    expect(mockUpdate).toHaveBeenCalledWith({ status: "confirmado" });
    expect(mockEqId).toHaveBeenCalledWith("id", 5);
    expect(mockEqStatus).toHaveBeenCalledWith("status", "pendiente");
    expect(mockRevalidate).toHaveBeenCalledWith("/admin");
  });

  it("cancelar solo desde pendiente", async () => {
    expect(await cancelOrder(5)).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenCalledWith({ status: "cancelado" });
    expect(mockEqStatus).toHaveBeenCalledWith("status", "pendiente");
  });

  it("entregar solo desde confirmado", async () => {
    expect(await markDelivered(5)).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenCalledWith({ status: "entregado" });
    expect(mockEqStatus).toHaveBeenCalledWith("status", "confirmado");
  });

  it("rechaza si el pedido ya no está en el estado esperado (doble clic / transición inválida)", async () => {
    mockEqStatus.mockReturnValue({ select: async () => ({ data: [], error: null }) });
    const r = await confirmOrder(5);
    expect(r.ok).toBe(false);
    expect(mockRevalidate).not.toHaveBeenCalled();
  });

  it("devuelve error genérico si la base falla", async () => {
    mockEqStatus.mockReturnValue({ select: async () => ({ data: null, error: { code: "XX000", message: "secreto" } }) });
    const r = await cancelOrder(5);
    expect(r).toEqual({ ok: false, error: "No se pudo actualizar el pedido" });
  });

  it("rechaza ids inválidos sin tocar la base", async () => {
    expect((await confirmOrder(Number.NaN)).ok).toBe(false);
    expect((await confirmOrder(-1)).ok).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("exige admin antes de cualquier cambio", async () => {
    mockVerify.mockRejectedValue(new Error("redirect"));
    await expect(confirmOrder(5)).rejects.toThrow();
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
