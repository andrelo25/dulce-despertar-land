/**
 * Teléfonos: solo Argentina, 10 dígitos (característica sin 0 + número sin 15),
 * con o sin espacios, guiones o paréntesis. Ej.: 351-3445566.
 */
const ALLOWED_CHARS = /^[\d\s\-()]+$/;

/** Devuelve los 10 dígitos o `null` si el número no es válido. */
export function normalizePhone(input: string): string | null {
  if (!ALLOWED_CHARS.test(input)) return null; // rechaza "+", letras, ".", "/"
  const digits = input.replace(/\D/g, "");
  if (digits.length !== 10) return null;
  // Ninguna característica argentina empieza con 0 ni con 15 (el 15 es el prefijo de celular).
  if (digits.startsWith("0") || digits.startsWith("15")) return null;
  return digits;
}

export function isValidPhone(input: string): boolean {
  return normalizePhone(input) !== null;
}

/** Id de WhatsApp (formato internacional de celular argentino): 549 + 10 dígitos. */
export function toWhatsappId(input: string): string | null {
  const digits = normalizePhone(input);
  return digits ? `549${digits}` : null;
}
