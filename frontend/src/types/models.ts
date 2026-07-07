export interface Unit {
  id: number;
  address: string;
  apartmentNo: string;
  name: string | null;
  tenantName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillType {
  id: number;
  name: string;
  order: number;
  active: boolean;
}

export interface Bill {
  id: number;
  unitId: number;
  billTypeId: number;
  billNumber: string | null;
  dueDate: string | null;
  billType: BillType;
}

export interface Evidence {
  id: number;
  monthlyRecordId: number;
  fileName: string;
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

export interface DashboardKpis {
  pendingCount: number;
  totalPaidThisMonth: number;
  upcomingDueDates: Array<{ billId: number; unit: string; type: string; dueDate: string }>;
}

export interface DashboardSummary {
  year: number;
  kpis: DashboardKpis;
  monthlyTrend: Array<Record<string, number>>;
  expenseBreakdown: Array<{ name: string; total: number }>;
  unitComparison: Array<{ unit: string; total: number }>;
}
