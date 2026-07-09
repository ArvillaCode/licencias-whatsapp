const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** Formatea un monto como pesos colombianos, p. ej. "$ 1.234.567". */
export function formatCOP(value: number): string {
  return COP.format(value ?? 0);
}
