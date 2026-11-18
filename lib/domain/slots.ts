import { MIN_LEAD_HOURS, SLOTS, TZ_OFFSET, type Slot } from "../config";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const ART_MS = 3 * HOUR_MS; // UTC-3 fijo (Argentina no usa horario de verano)

/** "AAAA-MM-DD" real (rechaza formato incorrecto y fechas inexistentes como 2026-02-30). */
export function isValidDateString(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/** Instante de inicio de la franja, interpretado siempre en hora argentina. */
export function slotStart(date: string, slot: string): Date {
  return new Date(`${date}T${slot.slice(0, 5)}:00${TZ_OFFSET}`);
}

/** Fecha "AAAA-MM-DD" vigente en Argentina para un instante dado. */
export function artDateString(now: Date): string {
  return new Date(now.getTime() - ART_MS).toISOString().slice(0, 10);
}

function isSlot(slot: string): slot is Slot {
  return (SLOTS as readonly string[]).includes(slot);
}

/** Regla de la spec: el inicio de la franja debe estar al menos 12 h después de `now` (12 h exactas valen). */
export function isSlotAllowed(date: string, slot: string, now: Date): boolean {
  if (!isValidDateString(date) || !isSlot(slot)) return false;
  return slotStart(date, slot).getTime() - now.getTime() >= MIN_LEAD_HOURS * HOUR_MS;
}

export function availableSlots(date: string, now: Date): Slot[] {
  return SLOTS.filter((slot) => isSlotAllowed(date, slot, now));
}

/** Primera fecha y franja elegibles a partir de `now` (se usa para preseleccionar en el formulario). */
export function firstAvailableSlot(now: Date): { date: string; slot: Slot } {
  const today = new Date(`${artDateString(now)}T00:00:00Z`).getTime();
  // La última franja del día termina de ser elegible, como mucho, 2 días después.
  for (let i = 0; i < 3; i++) {
    const date = new Date(today + i * DAY_MS).toISOString().slice(0, 10);
    const [slot] = availableSlots(date, now);
    if (slot) return { date, slot };
  }
  throw new Error("No hay franjas disponibles"); // inalcanzable: 12 h < 3 días
}
