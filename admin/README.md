# Panel de Administración — Licencias

Panel local para emitir y firmar licencias para la extensión "Contact Extract for WhatsApp".

## Cómo funciona (criptografía local, sin servidor)

- **RSA-2048 + SHA-256**: el panel genera un par de claves. La **privada** firma licencias (se guarda en el `localStorage` del navegador del admin). La **pública** se incrusta en la extensión para verificarlas.
- Nadie puede falsificar licencias sin la clave privada, aunque descompile la extensión (la pública no permite firmar, solo verificar).
- 100% offline: no hay servidor ni conexión a internet.

## Pasos iniciales (solo la primera vez)

1. Abre `admin/admin.html` en el navegador con doble-clic.
2. Pulsa **Generar nuevo par de claves**.
3. En el cuadro **"Clave pública"** aparecerá el contenido SPKI en formato PEM.
4. Pulsa **Exportar clave privada (backup)** y guarda el archivo `contact-extract-priv-key-backup.json` en un lugar SEGURO (es la llave maestra; si la pierdes, no podrás emitir licencias).
5. **Importante**: en el cuadro **"Clave pública"** aparecerá una línea del tipo:
   ```js
   window.__CE_PUB_KEY_JWK = { "kty": "RSA", "n": "...", "e": "AQAB", "ext": true };
   ```
   Pulsa **Copiar al portapapeles**, abre el archivo `popup/public-key.js` de la extensión y reemplaza TODO su contenido por lo copiado.
6. Recarga la extensión en `chrome://extensions` (↻).

## Emitir una licencia

1. Abre `admin/admin.html`.
2. Completa: **Email** del cliente, **Número de WhatsApp** (con + y código de país, ej. `+573166123761`).
3. **Fecha de inicio** = hoy por defecto (puedes cambiarla).
4. **Fecha de fin** = +30 días por defecto — usa los botones rápidos (+30, +90, +365) o pon la fecha que quieras.
5. Pulsa **Emitir licencia**.
6. Copia la **clave de licencia** mostrada (base64url) y envíala al cliente por correo/mensaje.

El cliente la pega en el popup de la extensión cuando lo abra (pantalla "Activar licencia") y pulsa **Activar**. Si la firma es válida y la fecha fin no ha pasado, la extensión se desbloquea.

## restaurar tras formatear/cambiar de PC

1. Abre `admin/admin.html` en el nuevo navegador.
2. Pulsa **Importar clave privada**.
3. Pega el contenido del backup `contact-extract-priv-key-backup.json`.
4. Listo — puedes seguir emitiendo licencias con la misma clave.

## Verificar una licencia (prueba)

Antes de enviarla al cliente, pégala en la sección **"4. Verificar una licencia (prueba)"** y pulsa **Verificar**. Confirmarás que la clave pública y privada coinciden y que la licencia es válida.

## Registro de licencias emitidas

El panel guarda un registro local (localStorage del navegador) con email, whatsapp, fechas y prefijo de la clave. Puedes exportarlo a CSV con **Exportar CSV**. Ojo: este registro **solo está en el navegador** donde emitiste las licencias — exporta CSV periódicamente como backup.

## Cómo revocar una licencia

Como la validación es local (sin servidor), no se puede revocar una licencia ya emitida antes de su fecha fin. Para "revocarla" effectively, en la próxima versión del par de claves, deja sin actualizar al cliente — su licencia antigua dejará de validarse contra la nueva clave pública.

Para revocación real en tiempo real se necesitaría un backend (lista de licencias revocadas). En esta versión local no se incluye.

## Limitaciones de la versión local

- No se puede revocar una licencia antes de su fecha fin (sin servidor).
- La fecha fin se comprueba contra el reloj del equipo del cliente. Si el cliente manipula el reloj, podría saltarse la expiración. Mitigación: la extensión también guarda `checkedAt` y, si la fecha "retrocede", podría avisar (no implementado en v1).
- Si el cliente comparte su clave de licencia, otra persona podría activarla en otra máquina (la validación no ata la licencia a un equipo concreto). Para atar la licencia a un equipo se necesitaría fingerprinting de hardware + un backend.