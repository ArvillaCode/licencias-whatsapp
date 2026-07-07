import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { v4 as uuid } from 'uuid';

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads', 'evidence');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const monthlyRecordId = req.params.id;
    const dir = path.join(UPLOAD_ROOT, monthlyRecordId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${uuid()}${ext}`);
  },
});

export const uploadEvidence = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new Error('Formato de imagen no soportado'));
      return;
    }
    cb(null, true);
  },
});

export { UPLOAD_ROOT };
