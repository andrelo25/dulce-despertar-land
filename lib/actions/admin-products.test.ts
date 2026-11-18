import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveProduct, setProductStatus } from "./admin-products";

const mockVerify = vi.fn();
const mockUpdateTag = vi.fn();
const mockRevalidate = vi.fn();
const mockUpload = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

class Redirect extends Error {}
const mockRedirect = vi.fn((url: string) => {
  throw new Redirect(url);
});

vi.mock("../dal", () => ({ verifyAdmin: () => mockVerify() }));
vi.mock("next/cache", () => ({
  updateTag: (t: string) => mockUpdateTag(t),
  revalidatePath: (p: string) => mockRevalidate(p),
}));
vi.mock("next/navigation", () => ({ redirect: (u: string) => mockRedirect(u) }));
vi.mock("../product-images", () => ({ uploadProductImage: (...a: unknown[]) => mockUpload(...a) }));
vi.mock("../supabase/server", () => ({
  createClient: async () => ({
    from: () => ({ insert: mockInsert, update: mockUpdate }),
  }),
}));

const ID = "7f9c24e8-3f1a-4a52-9d2e-0a8f6a1b2c3d";

function form(fields: Record<string, string | File>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const valid = {
  name: "Caja Nueva",
  description: "Desc",
  price: "15000",
  section: "desayunos",
  motive: "Cumpleaños",
  status: "active",
  sortOrder: "5",
};

describe("saveProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockVerify.mockResolvedValue({ id: "admin", email: "a@b.c" });
    mockInsert.mockReturnValue({ select: async () => ({ data: [{ id: ID }], error: null }) });
    mockUpdate.mockReturnValue({ eq: () => ({ select: async () => ({ data: [{ id: ID }], error: null }) }) });
  });

  it("exige admin antes de tocar la base", async () => {
    mockVerify.mockRejectedValue(new Error("redirect"));
    await expect(saveProduct(null, form(valid))).rejects.toThrow();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("crea un producto con imagen, invalida la caché y redirige", async () => {
    mockUpload.mockResolvedValue({ ok: true, url: "https://x.supabase.co/storage/v1/object/public/product-images/a.png" });
    const image = new File([new Uint8Array(10)], "a.png");
    await expect(saveProduct(null, form({ ...valid, image }))).rejects.toBeInstanceOf(Redirect);

    expect(mockInsert).toHaveBeenCalledWith({
      name: "Caja Nueva",
      description: "Desc",
      price: 15000,
      section: "desayunos",
      motive: "Cumpleaños",
      status: "active",
      sort_order: 5,
      image_url: "https://x.supabase.co/storage/v1/object/public/product-images/a.png",
    });
    expect(mockUpdateTag).toHaveBeenCalledWith("products");
    expect(mockRedirect).toHaveBeenCalledWith("/admin/productos");
  });

  it("sin imagen nueva al editar no toca image_url", async () => {
    await expect(saveProduct(null, form({ ...valid, id: ID, image: new File([], "")}))).rejects.toBeInstanceOf(Redirect);
    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockUpdate.mock.calls[0][0]).not.toHaveProperty("image_url");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("devuelve errores por campo y conserva lo escrito sin guardar", async () => {
    const r = await saveProduct(null, form({ ...valid, price: "0", name: "x" }));
    expect(r?.fieldErrors.price?.length).toBeGreaterThan(0);
    expect(r?.fieldErrors.name?.length).toBeGreaterThan(0);
    expect(r?.values.name).toBe("x");
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("rechaza una imagen inválida sin guardar el producto", async () => {
    mockUpload.mockResolvedValue({ ok: false, error: "La imagen no puede superar 2 MB." });
    const r = await saveProduct(null, form({ ...valid, image: new File([new Uint8Array(10)], "a.png") }));
    expect(r?.fieldErrors.image).toEqual(["La imagen no puede superar 2 MB."]);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rechaza un id que no es uuid", async () => {
    const r = await saveProduct(null, form({ ...valid, id: "1; drop table products" }));
    expect(r?.fieldErrors.form).toBeDefined();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("error genérico si la base falla (sin detalles)", async () => {
    mockInsert.mockReturnValue({ select: async () => ({ data: null, error: { code: "XX000", message: "secreto" } }) });
    const r = await saveProduct(null, form(valid));
    expect(r?.fieldErrors.form).toEqual(["No se pudo guardar el producto."]);
    expect(JSON.stringify(r)).not.toContain("secreto");
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it("editar un id inexistente (0 filas) no es éxito", async () => {
    mockUpdate.mockReturnValue({ eq: () => ({ select: async () => ({ data: [], error: null }) }) });
    const r = await saveProduct(null, form({ ...valid, id: ID }));
    expect(r?.fieldErrors.form).toBeDefined();
  });
});

describe("setProductStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockVerify.mockResolvedValue({ id: "admin", email: "a@b.c" });
    mockUpdate.mockReturnValue({ eq: () => ({ select: async () => ({ data: [{ id: ID }], error: null }) }) });
  });

  it.each(["active", "unavailable", "hidden"] as const)("aplica %s e invalida la caché", async (status) => {
    expect(await setProductStatus(ID, status)).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenCalledWith({ status });
    expect(mockUpdateTag).toHaveBeenCalledWith("products");
  });

  it("rechaza estado o id inválidos sin tocar la base", async () => {
    expect((await setProductStatus(ID, "borrado" as never)).ok).toBe(false);
    expect((await setProductStatus("x", "hidden")).ok).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("exige admin", async () => {
    mockVerify.mockRejectedValue(new Error("redirect"));
    await expect(setProductStatus(ID, "hidden")).rejects.toThrow();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("error de base → mensaje genérico", async () => {
    mockUpdate.mockReturnValue({
      eq: () => ({ select: async () => ({ data: null, error: { code: "XX000", message: "secreto" } }) }),
    });
    expect(await setProductStatus(ID, "hidden")).toEqual({ ok: false, error: "No se pudo cambiar el estado." });
  });
});
