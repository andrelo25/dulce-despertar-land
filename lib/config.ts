// Constantes de negocio fijas (ver specs/tienda-buen-dia/spec.md, "Reglas de negocio").

export const TZ_OFFSET = "-03:00"; // Argentina: sin horario de verano

export const MIN_LEAD_HOURS = 12;
export const SHIPPING_FEE = 3000;
export const MAX_PER_PRODUCT = 20;
export const MAX_TOTAL = 50;
export const MESSAGE_MAX = 150;
export const NOTE_MAX = 300;
export const CONFIRM_WINDOW_MINUTES = 30;

export const SECTIONS = ["desayunos", "tortas", "dulces"] as const;
export type Section = (typeof SECTIONS)[number];

export const PERSONALIZABLE_SECTIONS: readonly Section[] = ["desayunos", "tortas"];

export const SLOTS = [
  "07:00-08:00",
  "08:00-09:00",
  "09:00-10:00",
  "10:00-11:00",
  "11:00-12:00",
  "16:00-17:00",
  "17:00-18:00",
  "18:00-19:00",
] as const;
export type Slot = (typeof SLOTS)[number];

export const STORE = {
  name: "Buen Día",
  // TODO(usuario): reemplazar por la dirección real del local antes de T11.
  address: "Dirección del local (a definir)",
  paymentAlias: "BUENDIA.DESAYUNOS",
} as const;
