/** Formato de moneda es-AR: "$18.500". `useGrouping: "always"` fuerza el punto también en 4 dígitos ($3.000). */
const nf = new Intl.NumberFormat("es-AR", { useGrouping: "always", maximumFractionDigits: 0 });

export function formatMoney(n: number): string {
  return `$${nf.format(n)}`;
}
