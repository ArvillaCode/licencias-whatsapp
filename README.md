# Contact Extract for WhatsApp

Extensión de Chrome (Manifest V3) que extrae los contactos (participantes) de un
grupo de WhatsApp Web del que eres miembro, y los exporta a **CSV**, **JSON** y
**XLSX**.

## Campos extraídos

| Campo | Descripción |
|-------|-------------|
| Nombre | Nombre visible del contacto |
| Pushname | Nombre que el contacto definió en su WhatsApp |
| Teléfono | Número, cuando es posible resolverlo |
| LID | Identificador LID (cuando el número no está disponible) |
| Rol | `admin`, `superadmin` o `miembro` |
| Acerca de | Mensaje "Acerca de" del contacto (opcional, más lento) |

## Limitaciones conocidas

- **El teléfono puede no estar disponible para todos los participantes.**
  WhatsApp Web ahora usa "modo LID" en muchos grupos: los participantes se
  identifican con un `LID` (`xxx@lid`) en lugar de un número de teléfono. La
  extensión intenta convertir LID → teléfono, pero cuando no es posible se deja
  el campo `Teléfono` vacío y se guarda el `LID`.
- **"Acerca de" puede fallar o quedar vacío** en grupos grandes, porque WhatsApp
  limita cuántos perfiles puedes consultar. Puedes desactivar esa opción en el
  popup para acelerar la extracción.
- **Frágil ante actualizaciones de WhatsApp Web**: los nombres de los módulos
  internos pueden cambiar y requerir ajustes en `content/inject.js`.

## ⚠️ Advertencia de uso

Extraer contactos mediante scraping de WhatsApp Web **viola los Términos de
Servicio de WhatsApp** y puede causar el **baneo de tu cuenta**. Úsalo con
moderación, en grupos pequeños y con tu propia cuenta, bajo tu responsabilidad.

La extensión:
- Solo **lee** datos (nunca envía mensajes ni marca como visto).
- Hace **pausas** entre consultas para ser discreta.
- No se conecta a ningún servidor externo; todo ocurre localmente en tu
  navegador.

## Instalación (modo desarrollador)

1. Abre Chrome y ve a `chrome://extensions`.
2. Activa **Modo desarrollador** (esquina superior derecha).
3. Click en **Cargar descomprimida**.
4. Selecciona la carpeta `ContactExtract` (la que contiene `manifest.json`).
5. Abre `https://web.whatsapp.com` e inicia sesión.
6. Click en el icono de la extensión para abrir el popup.

## Uso

1. En el popup, selecciona el grupo en el desplegable.
2. Marca/desmarca "Incluir Acerca de" según prefieras.
3. Pulsa **Extraer contactos** y espera a que termine la barra de progreso.
4. Exporta con los botones **CSV**, **JSON** o **XLSX**.

## Cómo funciona (técnico)

- `content/inject.js` se ejecuta en el **MAIN world** de WhatsApp Web. Parasita
  `window.webpackChunkwhatsapp_web_client` empujando un módulo falso que captura
  el `__webpack_require__` real, luego llama a módulos por nombre
  (`WAWebCollections`, `WAWebWidFactory`, `WAWebContactGetters`,
  `WAWebLidMigrationUtils`...) para leer grupos, participantes y contactos.
- `content/content.js` (isolated world) hace de puente entre el popup y el
  inyector mediante `window.postMessage`, y orquesta la extracción con pausas
  (rate-limiting) entre consultas.
- `popup/` contiene la UI. Los archivos se descargan con `chrome.downloads`. La
  exportación XLSX usa SheetJS (`lib/xlsx.full.min.js`).

## Estructura

```
ContactExtract/
├── manifest.json
├── content/
│   ├── inject.js      # MAIN world: acceso a la API interna de WhatsApp Web
│   └── content.js     # puente + orquestación + rate-limit
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── lib/
│   └── xlsx.full.min.js   # SheetJS
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```
