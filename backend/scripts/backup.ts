import { execSync } from 'child_process';
import { createReadStream, unlinkSync } from 'fs';
import { put } from '@vercel/blob';

const DATABASE_URL = process.env.DATABASE_URL;
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

if (!DATABASE_URL) {
  console.error('Falta DATABASE_URL');
  process.exit(1);
}

async function backup() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const file = `/tmp/apto-admin-${ts}.sql`;
  const gzFile = `${file}.gz`;

  console.log(`Respaldando BD → ${gzFile}`);

  execSync(
    `pg_dump "${DATABASE_URL}" --no-owner --no-acl -f "${file}"`,
    { stdio: 'inherit', timeout: 120_000 },
  );

  execSync(`gzip -f "${file}"`, { stdio: 'inherit' });

  if (BLOB_TOKEN) {
    const blob = await put(`backups/apto-admin-${ts}.sql.gz`, createReadStream(gzFile), {
      access: 'private',
      addRandomSuffix: false,
    });
    console.log('Backup subido a Vercel Blob:', blob.url);
  } else {
    console.log('Backup guardado en:', gzFile);
  }

  unlinkSync(gzFile);
  console.log('Backup completado.');
}

backup().catch((err) => {
  console.error('Error en backup:', err);
  process.exit(1);
});
