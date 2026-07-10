import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { ah } from '../lib/asyncHandler';

export const csvRouter = Router();

const MONTHS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

csvRouter.get(
  '/export/monthly-records',
  ah(async (req, res) => {
    const year = Number(req.query.year) || new Date().getFullYear();

    const records = await prisma.monthlyRecord.findMany({
      where: { year },
      include: {
        bill: { include: { unit: true, billType: true } },
        evidences: true,
      },
      orderBy: [{ bill: { unitId: 'asc' } }, { month: 'asc' }],
    });

    const headers = [
      'Unidad', 'Dirección', 'Tipo', 'Mes', 'Año',
      'Responsable', 'Valor Pagado', 'Método de Pago', 'Fecha de Pago',
      'Notas', 'Evidencias',
    ];

    const rows = records.map((r) => [
      r.bill.unit.apartmentNo,
      r.bill.unit.address,
      r.bill.billType.name,
      MONTHS[r.month - 1],
      String(r.year),
      r.responsible ?? '',
      r.amountPaid?.toString() ?? '',
      r.paymentMethod ?? '',
      r.paidAt ? new Date(r.paidAt).toISOString().slice(0, 10) : '',
      r.notes ?? '',
      r.evidences.length > 0 ? r.evidences.map((e) => e.url).join('; ') : '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="apto-admin-${year}.csv"`);
    res.send('\uFEFF' + csv);
  }),
);
