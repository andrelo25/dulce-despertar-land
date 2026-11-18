import { describe, expect, it } from "vitest";
import {
  artDateString,
  availableSlots,
  firstAvailableSlot,
  isSlotAllowed,
  isValidDateString,
  slotStart,
} from "./slots";

// 2026-11-16 es lunes. Los tests usan offsets explícitos: no dependen de la TZ de la máquina.
const at = (iso: string) => new Date(iso);
const MON_20 = at("2026-11-16T20:00:00-03:00");

describe("isValidDateString", () => {
  it("acepta fechas reales", () => {
    expect(isValidDateString("2026-11-17")).toBe(true);
    expect(isValidDateString("2028-02-29")).toBe(true); // bisiesto
  });

  it("rechaza formato incorrecto y fechas inexistentes", () => {
    expect(isValidDateString("17/11/2026")).toBe(false);
    expect(isValidDateString("2026-1-7")).toBe(false);
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(isValidDateString("2027-02-29")).toBe(false);
    expect(isValidDateString("2026-13-01")).toBe(false);
    expect(isValidDateString("")).toBe(false);
  });
});

describe("slotStart", () => {
  it("interpreta la franja en hora argentina", () => {
    expect(slotStart("2026-11-17", "08:00-09:00").toISOString()).toBe("2026-11-17T11:00:00.000Z");
    expect(slotStart("2026-11-17", "18:00-19:00").toISOString()).toBe("2026-11-17T21:00:00.000Z");
  });
});

describe("artDateString", () => {
  it("devuelve la fecha argentina aunque en UTC ya sea el día siguiente", () => {
    // 23:30 ART del lunes = 02:30Z del martes
    expect(artDateString(at("2026-11-16T23:30:00-03:00"))).toBe("2026-11-16");
    expect(artDateString(at("2026-11-17T00:00:00-03:00"))).toBe("2026-11-17");
  });
});

describe("isSlotAllowed (regla de 12 horas)", () => {
  it("ejemplo de la spec: lunes 20:00 -> primera franja el martes 08:00-09:00", () => {
    expect(isSlotAllowed("2026-11-17", "07:00-08:00", MON_20)).toBe(false); // 11 h
    expect(isSlotAllowed("2026-11-17", "08:00-09:00", MON_20)).toBe(true); // 12 h exactas
    expect(isSlotAllowed("2026-11-17", "16:00-17:00", MON_20)).toBe(true);
  });

  it("12 h exactas valen; 1 ms menos no", () => {
    expect(isSlotAllowed("2026-11-17", "08:00-09:00", at("2026-11-16T20:00:00.000-03:00"))).toBe(true);
    expect(isSlotAllowed("2026-11-17", "08:00-09:00", at("2026-11-16T20:00:00.001-03:00"))).toBe(false);
  });

  it("11 h 59 min no vale", () => {
    expect(isSlotAllowed("2026-11-17", "08:00-09:00", at("2026-11-16T20:01:00-03:00"))).toBe(false);
  });

  it("rechaza el mismo día, el pasado, franjas inexistentes y fechas inválidas", () => {
    expect(isSlotAllowed("2026-11-16", "18:00-19:00", at("2026-11-16T08:00:00-03:00"))).toBe(false);
    expect(isSlotAllowed("2026-11-10", "08:00-09:00", MON_20)).toBe(false);
    expect(isSlotAllowed("2026-11-17", "06:00-07:00", MON_20)).toBe(false);
    expect(isSlotAllowed("2026-02-30", "08:00-09:00", MON_20)).toBe(false);
  });

  it("pedido de madrugada puede ser para esa misma tarde del día siguiente a partir de 12 h", () => {
    // martes 03:00 -> mismo martes 16:00 es 13 h: válido; 11:00 es 8 h: no
    const now = at("2026-11-17T03:00:00-03:00");
    expect(isSlotAllowed("2026-11-17", "16:00-17:00", now)).toBe(true);
    expect(isSlotAllowed("2026-11-17", "11:00-12:00", now)).toBe(false);
  });
});

describe("availableSlots", () => {
  it("lista las franjas elegibles de un día", () => {
    expect(availableSlots("2026-11-17", MON_20)).toEqual([
      "08:00-09:00",
      "09:00-10:00",
      "10:00-11:00",
      "11:00-12:00",
      "16:00-17:00",
      "17:00-18:00",
      "18:00-19:00",
    ]);
  });

  it("devuelve vacío si el día ya no admite pedidos", () => {
    expect(availableSlots("2026-11-16", MON_20)).toEqual([]);
  });
});

describe("firstAvailableSlot", () => {
  it("lunes 20:00 -> martes 08:00-09:00", () => {
    expect(firstAvailableSlot(MON_20)).toEqual({ date: "2026-11-17", slot: "08:00-09:00" });
  });

  it("cuando no hay franja temprana salta al día siguiente (lunes 23:00 -> martes 11:00)", () => {
    expect(firstAvailableSlot(at("2026-11-16T23:00:00-03:00"))).toEqual({
      date: "2026-11-17",
      slot: "11:00-12:00",
    });
  });

  it("después de las 19:00 de ayer el primer horario cae a la tarde (lunes 05:00 -> lunes 17:00)", () => {
    expect(firstAvailableSlot(at("2026-11-16T05:00:00-03:00"))).toEqual({
      date: "2026-11-16",
      slot: "17:00-18:00",
    });
  });

});
