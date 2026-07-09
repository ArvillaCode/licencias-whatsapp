export interface Unit {
  id: number;
  address: string;
  apartmentNo: string;
  name: string | null;
  tenantName: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface BillType {
  id: number;
  name: string;
  order: number;
  active: boolean;
  paymentUrl: string | null;
}

export interface Bill {
  id: number;
  unitId: number;
  billTypeId: number;
  billNumber: string | null;
  dueDay: number | null;
  billType: BillType;
}

export interface Evidence {
  id: number;
  monthlyRecordId: number;
  fileName: string;
  url: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface MonthlyRecord {
  id: number;
  billId: number;
  month: number;
  year: number;
  responsible: string | null;
  amountPaid: number | null;
  paymentMethod: string | null;
  paidAt: string | null;
  notes: string | null;
  evidences: Evidence[];
}

export interface CatalogItem {
  id: number;
  name: string;
  active: boolean;
}

export interface Tenant {
  id: number;
  unitId: number;
  name: string;
  phone: string | null;
  rentAmount: number | null;
  rentDueDay: number | null;
  contractStartDate: string | null;
  moveOutDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  unit?: Unit;
}

export interface DashboardKpis {
  pendingCount: number;
  totalPaidThisMonth: number;
  upcomingDueDates: Array<{ billId: number; unit: string; type: string; dueDay: number; nextDate: string }>;
}

export interface DashboardSummary {
  year: number;
  kpis: DashboardKpis;
  monthlyTrend: Array<Record<string, number>>;
  expenseBreakdown: Array<{ name: string; total: number }>;
  unitComparison: Array<{ unit: string; total: number }>;
}
