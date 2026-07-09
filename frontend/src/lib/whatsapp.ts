/** Normaliza un teléfono colombiano a dígitos, anteponiendo el código de país 57 si hace falta. */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `57${digits}`;
  return digits;
}

export function whatsappUrl(phone: string, message: string): string {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`;
}

export function buildPaymentMessage({
  tenantName,
  billType,
  unitLabel,
  monthLabel,
  year,
  amount,
  paymentUrl,
}: {
  tenantName: string;
  billType: string;
  unitLabel: string;
  monthLabel: string;
  year: number;
  amount?: number | null;
  paymentUrl?: string | null;
}): string {
  const lines = [
    `Hola ${tenantName}. Recibo de ${billType} — ${unitLabel}, ${monthLabel} ${year}.`,
  ];
  if (amount != null) {
    lines.push(`Valor: ${amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}`);
  }
  if (paymentUrl) {
    lines.push(`Paga aquí: ${paymentUrl}`);
  }
  return lines.join('\n');
}
