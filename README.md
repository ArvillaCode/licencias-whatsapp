# Apto Admin

Administración de recibos de servicios públicos (agua, luz, gas), arriendo y gastos
locativos para las unidades de Urb El Rodeo Sec 3 Mz 10 Lt 6 (aptos 101-302) y Pradera.

## Stack

- **Backend**: Node.js + Express + TypeScript, Prisma ORM sobre SQLite, JWT en cookie
  httpOnly, Multer para evidencia fotográfica.
- **Frontend**: React + Vite + TypeScript, React Router, TanStack Query, Recharts,
  identidad visual Upfunnel (dark/light).

## Primer arranque

```bash
npm run install:all      # instala backend y frontend
cd backend
npx prisma migrate dev   # crea la base de datos SQLite y aplica el esquema
npx prisma db seed       # siembra las 7 unidades, tipos de recibo, medios de pago y el usuario admin
```

Usuario y contraseña iniciales están en `backend/.env` (`ADMIN_USERNAME` / `ADMIN_PASSWORD`,
por defecto `admin` / `admin123`). **Cámbialos antes de usar la app fuera de una red de confianza.**

## Desarrollo (dos servidores, con recarga en caliente)

```bash
npm run dev:backend    # http://localhost:4000
npm run dev:frontend   # http://localhost:5173 (proxy /api y /uploads hacia el backend)
```

Abre `http://localhost:5173` en el navegador del PC.

## Uso diario / producción (un solo puerto, recomendado para acceso desde el celular)

```bash
cd frontend && npm run build
cd ../backend && npm run build && npm start
```

Esto sirve el frontend ya compilado y la API desde el mismo puerto (4000 por defecto).

### Acceder desde el celular

1. Con el backend corriendo (modo producción, un solo puerto), obtén la IP local del PC:
   - Windows: `ipconfig` → busca la "Dirección IPv4" de tu red WiFi (ej. `192.168.1.23`).
2. En el celular, conectado a la **misma red WiFi**, abre en el navegador:
   `http://<IP-DEL-PC>:4000`
3. Inicia sesión con el mismo usuario/contraseña.

## Respaldo de datos

Los datos viven en dos lugares dentro de `backend/`:

- `backend/data/apto_admin.db` — toda la información (unidades, recibos, registros mensuales).
- `backend/uploads/evidence/` — las fotos de evidencia subidas.

Para respaldar, copia ambas carpetas periódicamente (ej. a una carpeta sincronizada con
la nube). No hay respaldo automático incluido todavía.

## Estructura

```
backend/    API Express + Prisma + SQLite
frontend/   App React (SPA)
```

Ver el plan completo y la hoja de ruta del proyecto para más detalle de arquitectura y
decisiones de diseño.
