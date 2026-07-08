# Backend de Licencias

Servidor Node.js para emitir, validar y revocar licencias de la extensión **Contact Extract for WhatsApp**. Trabaja junto al panel admin (`admin/admin.html`) y a la extensión (`popup/`).

## Ventajas sobre el modo local

- **Revocación en tiempo real**: marca una licencia como revocada y la extensión la detecta al re-validar (cada ~1h o al abrir el popup).
- **Registro central**: todas las licencias vivas en una DB JSON (`data/db.json`), inspeccionable y exportable.
- **Clave privada segura en el servidor**: nunca sale del backend. La pública se sirve automáticamente; la extensión la descarga sola (sin copiar `public-key.js` a mano).
- **Estadísticas de activación**: cada licencia registra cuántas veces y desde qué IP se activó.
- **Fallback offline**: si el backend no responde, la extensión valida con la clave pública cacheada localmente (las licencias activadas siguen funcionando sin internet).

## Arranque rápido

```bash
cd backend
cp .env.example .env      # editar ADMIN_TOKEN
npm install
npm start
```

El servidor se levanta en `http://localhost:3000` (o el puerto elegido). En el primer arranque genera automáticamente el par de claves RSA-2048 en `data/private-key.json`.

## Variables de entorno (`.env`)

| Variable | Descripción | Por defecto |
|----------|-------------|-------------|
| `PORT` | Puerto HTTP | `3000` |
| `ADMIN_TOKEN` | Token secreto para endpoints admin (cámbialo por una cadena larga) | `cambia-esto-...` |
| `CORS_ORIGIN` | Origen permitido (`*` para cualquiera, o lista separada por comas) | `*` |

## Endpoints

### Públicos (los usa la extensión)

| Método | Ruta | Body | Descripción |
|--------|------|------|-------------|
| `GET` | `/health` | — | Health check |
| `GET` | `/api/pubkey` | — | Devuelve la clave pública JWK (la extensión la descarga) |
| `POST` | `/api/license/activate` | `{ license: "<clave>" }` | Activa una licencia. Verifica firma, registra la activación. Devuelve `{ ok, payload, daysLeft, licenseId, revoked }` |
| `POST` | `/api/license/check` | `{ license, payload }` | Re-validación periódica. Detecta revocación. Devuelve `{ ok, daysLeft, revoked }` |

### Admin (requieren `Authorization: Bearer <ADMIN_TOKEN>`)

| Método | Ruta | Body | Descripción |
|--------|------|------|-------------|
| `POST` | `/admin/license/issue` | `{ email, whatsapp, startDate?, endDate }` | Emite una licencia firmada. Devuelve `{ ok, license, licenseId }` |
| `GET` | `/admin/licenses` | — | Lista todas las licencias con `expired`, `daysLeft`, `revoked`, `activations` |
| `POST` | `/admin/license/:id/revoke` | — | Revoca una licencia (la extensión la rechazará al re-validar) |
| `POST` | `/admin/license/:id/restore` | — | Restaura una licencia revocada |
| `DELETE` | `/admin/license/:id` | — | Elimina una licencia del registro |

## Archivos generados (no commitear)

- `data/private-key.json` — clave privada RSA (se crea sola en el primer arranque). **Haz un backup seguro.**
- `data/db.json` — base de datos de licencias.

## Despliegue

Funciona en cualquier host con Node 18+:

- **VPS /local**: `npm install && npm start` (usa `pm2` o `systemd` para mantenerlo vivo).
- **Render / Railway / Fly.io**: sube la carpeta `backend/` con un build `npm install` y start `npm start`. Ojo: en planes gratuitos efímeros el sistema de archivos se pierde en cada deploy → para persistencia usa un volumen o reemplaza lowdb por Postgres (modifica `initDb`).
- **Docker**: (no incluido en v1) basta con un Dockerfile Node 18 + `npm install && npm start` exponiendo el `PORT`.

## Migración desde el modo local

Si ya emitiste licencias locales con `admin/admin.html`:
1. Those licencias **no** funcionarán contra el backend nuevo (usa otra clave privada). Vuelve a emitirlas desde el panel admin conectado al backend (ver sección siguiente).
2. En la extensión, configura `BACKEND_URL` en `popup/config.js`. Las licencias antiguas dejarán de validarse; los usuarios deberán re-activar con las nuevas claves.

## Backup

- `data/private-key.json` → la llave maestra. Si la pierdes, **no puedes emitir licencias** ni validar las existentes. Haz copias offsite.
- `data/db.json` → registro de licencias. Exporta también desde el panel admin (`Exportar CSV`).