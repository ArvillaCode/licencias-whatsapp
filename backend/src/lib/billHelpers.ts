import { PrismaClient } from '@prisma/client';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export async function ensureMonthlyRecordsForYear(db: PrismaClient, billId: number, year: number) {
  const existing = await db.monthlyRecord.findMany({
    where: { billId, year },
    select: { month: true },
  });
  const existingMonths = new Set(existing.map((r) => r.month));
  const missing = MONTHS.filter((m) => !existingMonths.has(m));
  if (missing.length > 0) {
    await db.monthlyRecord.createMany({
      data: missing.map((month) => ({ billId, month, year })),
    });
  }
}

export async function createBillsForUnit(db: PrismaClient, unitId: number, year: number) {
  const billTypes = await db.billType.findMany({ where: { active: true } });
  for (const billType of billTypes) {
    const bill = await db.bill.upsert({
      where: { unitId_billTypeId: { unitId, billTypeId: billType.id } },
      update: {},
      create: { unitId, billTypeId: billType.id },
    });
    await ensureMonthlyRecordsForYear(db, bill.id, year);
  }
}

export async function backfillBillForNewType(db: PrismaClient, billTypeId: number, year: number) {
  const units = await db.unit.findMany({ select: { id: true } });
  for (const unit of units) {
    const bill = await db.bill.upsert({
      where: { unitId_billTypeId: { unitId: unit.id, billTypeId } },
      update: {},
      create: { unitId: unit.id, billTypeId },
    });
    await ensureMonthlyRecordsForYear(db, bill.id, year);
  }
}

/**
 * El día de pago del arriendo (dato del inquilino) fija el vencimiento del
 * recibo "Arriendo" de su unidad, para no tener que configurarlo aparte.
 */
export async function syncArriendoDueDay(db: PrismaClient, unitId: number, dueDay: number | null) {
  const arriendoType = await db.billType.findFirst({ where: { name: 'Arriendo' } });
  if (!arriendoType) return;
  await db.bill.updateMany({
    where: { unitId, billTypeId: arriendoType.id },
    data: { dueDay },
  });
}
