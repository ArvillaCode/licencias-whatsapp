export const PERMISSION_KEYS = ['dashboard', 'units', 'bills', 'catalogs'] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  dashboard: 'Dashboard',
  units: 'Unidades',
  bills: 'Recibos y Pagos',
  catalogs: 'Catálogos (tipos, medios de pago, responsables)',
};
