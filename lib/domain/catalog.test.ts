import { describe, expect, it } from "vitest";
import { groupBySection, motivesOf, type Product } from "./catalog";

const p = (over: Partial<Product>): Product => ({
  id: "a0000000-0000-4000-8000-000000000001",
  name: "X",
  description: "",
  price: 1000,
  section: "desayunos",
  motive: null,
  imageUrl: null,
  status: "active",
  sortOrder: 0,
  ...over,
});

describe("motivesOf", () => {
  it("devuelve los motivos distintos en el orden en que aparecen", () => {
    const list = [
      p({ motive: "Cumpleaños" }),
      p({ motive: "Aniversario" }),
      p({ motive: "Cumpleaños" }),
      p({ motive: "Día del Niño" }),
    ];
    expect(motivesOf(list)).toEqual(["Cumpleaños", "Aniversario", "Día del Niño"]);
  });

  it("ignora productos sin motivo (dulces)", () => {
    expect(motivesOf([p({ motive: null }), p({ motive: "" })])).toEqual([]);
    expect(motivesOf([])).toEqual([]);
  });

  it("no mezcla mayúsculas: 'Cumpleaños' y 'cumpleaños' son distintos", () => {
    expect(motivesOf([p({ motive: "Cumpleaños" }), p({ motive: "cumpleaños" })])).toHaveLength(2);
  });
});

describe("groupBySection", () => {
  it("separa por sección y conserva el orden recibido", () => {
    const list = [
      p({ name: "d1", section: "desayunos" }),
      p({ name: "t1", section: "tortas" }),
      p({ name: "d2", section: "desayunos" }),
      p({ name: "s1", section: "dulces" }),
    ];
    const g = groupBySection(list);
    expect(g.desayunos.map((x) => x.name)).toEqual(["d1", "d2"]);
    expect(g.tortas.map((x) => x.name)).toEqual(["t1"]);
    expect(g.dulces.map((x) => x.name)).toEqual(["s1"]);
  });

  it("siempre devuelve las tres secciones, aunque estén vacías", () => {
    expect(groupBySection([])).toEqual({ desayunos: [], tortas: [], dulces: [] });
  });
});
