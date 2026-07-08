import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { uploadEvidence, UPLOAD_ROOT } from '../middleware/upload';
import { ah } from '../lib/asyncHandler';

export const evidenceRouter = Router();

evidenceRouter.get(
  '/monthly-records/:id/evidence',
  ah(async (req, res) => {
    const evidences = await prisma.evidence.findMany({
      where: { monthlyRecordId: Number(req.params.id) },
      orderBy: { uploadedAt: 'asc' },
    });
    res.json(evidences);
  })
);

evidenceRouter.post(
  '/monthly-records/:id/evidence',
  uploadEvidence.array('files', 10),
  ah(async (req, res) => {
    const monthlyRecordId = Number(req.params.id);
    const files = (req.files as Express.Multer.File[]) ?? [];
    if (files.length === 0) {
      return res.status(400).json({ error: 'No se recibió ningún archivo' });
    }
    const created = await Promise.all(
      files.map((file) =>
        prisma.evidence.create({
          data: {
            monthlyRecordId,
            fileName: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: file.size,
          },
        })
      )
    );
    res.status(201).json(created);
  })
);

evidenceRouter.delete(
  '/evidence/:id',
  ah(async (req, res) => {
    const evidence = await prisma.evidence.findUnique({ where: { id: Number(req.params.id) } });
    if (!evidence) return res.status(404).json({ error: 'Evidencia no encontrada' });

    const filePath = path.join(UPLOAD_ROOT, String(evidence.monthlyRecordId), evidence.fileName);
    fs.unlink(filePath, () => {});

    await prisma.evidence.delete({ where: { id: evidence.id } });
    res.status(204).end();
  })
);
