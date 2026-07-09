export const PERMISSION_KEYS = ['dashboard', 'units', 'bills', 'catalogs'] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  dashboard: 'Dashboard',
  units: 'Unidades',
  bills: 'Recibos y Pagos',
  catalogs: 'Catálogos',
};

export function sanitizePermissions(input: unknown): PermissionKey[] {
  if (!Array.isArray(input)) return [];
  return PERMISSION_KEYS.filter((key) => input.includes(key));
}
