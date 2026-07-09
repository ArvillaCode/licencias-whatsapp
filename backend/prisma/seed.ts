import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createBillsForUnit } from '../src/lib/billHelpers';

const prisma = new PrismaClient();

const BILL_TYPES = ['Agua', 'Luz', 'Gas', 'Arriendo', 'Gastos Locativos'];

const UNITS = [
  { address: 'Urb El Rodeo Sec 3 Mz 10 Lt 6', apartmentNo: '101' },
  { address: 'Urb El Rodeo Sec 3 Mz 10 Lt 6', apartmentNo: '102' },
  { address: 'Urb El Rodeo Sec 3 Mz 10 Lt 6', apartmentNo: '201' },
  { address: 'Urb El Rodeo Sec 3 Mz 10 Lt 6', apartmentNo: '202' },
  { address: 'Urb El Rodeo Sec 3 Mz 10 Lt 6', apartmentNo: '301' },
  { address: 'Urb El Rodeo Sec 3 Mz 10 Lt 6', apartmentNo: '302' },
  { address: 'Pradera', apartmentNo: '-', name: 'Pradera' },
];

const PAYMENT_METHODS = ['Transferencia', 'Efectivo', 'Pago Móvil', 'Zelle'];

async function main() {
  const year = new Date().getFullYear();

  for (let i = 0; i < BILL_TYPES.length; i++) {
    await prisma.billType.upsert({
      where: { name: BILL_TYPES[i] },
      update: {},
      create: { name: BILL_TYPES[i], order: i },
    });
  }

  for (const unit of UNITS) {
    const existing = await prisma.unit.findFirst({
      where: { address: unit.address, apartmentNo: unit.apartmentNo },
    });
    const unitRecord = existing ?? (await prisma.unit.create({ data: unit }));

    await createBillsForUnit(prisma, unitRecord.id, year);
  }

  for (const name of PAYMENT_METHODS) {
    await prisma.paymentMethod.upsert({ where: { name }, update: {}, create: { name } });
  }

  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@example.com').toLowerCase();
  const adminName = process.env.ADMIN_NAME ?? 'Administrador';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'ADMIN', name: adminName, active: true },
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash,
      role: 'ADMIN',
      active: true,
    },
  });

  console.log(`Seed completo. Admin: ${adminEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
