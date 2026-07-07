import { Router } from 'express';
import { prisma } from '../lib/prisma';

export const dashboardRouter = Router();

dashboardRouter.get('/summary', async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;

  const records = await prisma.monthlyRecord.findMany({
    where: { year },
    include: {
      evidences: true,
      bill: { include: { billType: true, unit: true } },
    },
  });

  const billTypeTotals = new Map<string, number>();
  const monthlyTrendMap = new Map<number, Record<string, number>>();
  const unitTotals = new Map<string, number>();
  let totalPaidThisMonth = 0;
  let pendingCount = 0;

  for (const record of records) {
    const typeName = record.bill.billType.name;
    const unitLabel = record.bill.unit.name || `${record.bill.unit.address} #${record.bill.unit.apartmentNo}`;
    const amount = record.amountPaid ?? 0;

    billTypeTotals.set(typeName, (billTypeTotals.get(typeName) ?? 0) + amount);
    unitTotals.set(unitLabel, (unitTotals.get(unitLabel) ?? 0) + amount);

    const monthEntry = monthlyTrendMap.get(record.month) ?? {};
    monthEntry[typeName] = (monthEntry[typeName] ?? 0) + amount;
    monthlyTrendMap.set(record.month, monthEntry);

    if (record.month === currentMonth && year === now.getFullYear()) {
      totalPaidThisMonth += amount;
    }

    const isPastOrCurrent =
      year < now.getFullYear() || (year === now.getFullYear() && record.month <= currentMonth);
    if (isPastOrCurrent && record.evidences.length === 0 && !record.amountPaid) {
      pendingCount += 1;
    }
  }

  const upcomingDueDates = await prisma.bill.findMany({
    where: { dueDate: { not: null } },
    include: { billType: true, unit: true },
    orderBy: { dueDate: 'asc' },
    take: 5,
  });

  const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return { month, ...(monthlyTrendMap.get(month) ?? {}) };
  });

  const expenseBreakdown = Array.from(billTypeTotals.entries()).map(([name, total]) => ({ name, total }));
  const unitComparison = Array.from(unitTotals.entries()).map(([unit, total]) => ({ unit, total }));

  res.json({
    year,
    kpis: {
      pendingCount,
      totalPaidThisMonth,
      upcomingDueDates: upcomingDueDates.map((b) => ({
        billId: b.id,
        unit: b.unit.name || `${b.unit.address} #${b.unit.apartmentNo}`,
        type: b.billType.name,
        dueDate: b.dueDate,
      })),
    },
    monthlyTrend,
    expenseBreakdown,
    unitComparison,
  });
});
