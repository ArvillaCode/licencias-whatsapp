import path from 'path';
import multer from 'multer';

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads', 'evidence');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

// Guardamos en memoria: en Vercel subimos el buffer a Blob; en local lo escribimos a disco.
const storage = multer.memoryStorage();

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
