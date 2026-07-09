---
name: upfunnel-adn-visual
description: "ADN visual oficial de Upfunnel (marca de Gabriel/Juan). Define la paleta de colores, tipografía, logo, estética y reglas de composición que TODA pieza visual de Upfunnel debe seguir sin variación. Usa este skill SIEMPRE que el usuario pida crear algo visual para Upfunnel — prompts para generar imágenes o banners, flyers, miniaturas de YouTube, portadas, landing pages, componentes web, presentaciones/slides, plantillas de anuncios, o cualquier pieza gráfica — incluso si no menciona 'brand book', 'ADN visual' o 'identidad' explícitamente. También úsalo para validar o corregir piezas visuales existentes contra la marca. Es el complemento visual del skill upfunnel-adn-writer (escritura): si un pedido incluye texto + visual, usa ambos."
compatibility: "Requiere Python 3.9+ solo para el validador opcional (librería estándar, sin dependencias)."
---

# ADN Visual — Upfunnel

## Por qué existe

Igual que el ADN de escritura, el usuario quiere CERO variación en la identidad
visual de Upfunnel, sin importar quién o qué genere la pieza. Este skill separa:

- **Lo que nunca cambia** (paleta exacta, tipografía, reglas de logo,
  estética prohibida): codificado abajo y en `references/brand-data.md`.
- **Lo que sí cambia cada vez** (el mensaje, el formato, el contenido de la
  pieza): lo completas tú (Claude) según lo que pida el usuario.

Fuente de verdad: el Brand Book oficial de Upfunnel (Pomelli). Si el usuario
actualiza el brand book, actualiza este skill — no dejes reglas nuevas solo
en la conversación.

## Identidad en una frase

**"Upfunnel converts AI into real execution."**
Upfunnel es un AI Operating System que centraliza la ejecución de negocio
para solopreneurs y agencias modernas (74+ agentes IA calibrados + copiloto
'Matchmaker'). Toda pieza visual debe transmitir: ejecución, orden, autoridad
técnica — nunca caos, nunca decoración vacía.

## Paleta oficial (EXACTA, sin sustitutos)

| Rol | Nombre | Hex | Uso |
|---|---|---|---|
| Fondo dominante | Jet Black | `#080C14` | Fondos principales, base de casi toda pieza |
| Acento / energía | Cyan Blue | `#00E5FF` | CTAs, highlights, líneas, glow, datos clave. Máx ~10-15% del área |
| Contraste / texto | Pure White | `#FFFFFF` | Titulares y texto principal sobre fondo oscuro |
| Secundario | Slate Mist | `#94A3B8` | Texto secundario, subtítulos, bordes suaves, metadata |

**Prohibido**: introducir otros colores de acento (verdes lima, morados,
naranjas, rojos) — el lime green `#C8F04A` es de CuratorAI, NO de Upfunnel;
no mezclar marcas. Degradados solo entre colores de esta paleta.
La única excepción multicolor es el logo oficial (embudo), que ya trae sus
propios colores y no se recolorea.

## Tipografía

- **Única tipografía: Inter** (todas las jerarquías: títulos, cuerpo, UI).
- Titulares: Inter Bold/ExtraBold, alto contraste, tracking normal o
  ligeramente amplio para etiquetas en mayúsculas.
- Cuerpo: Inter Regular/Medium.
- En prompts de imagen donde no se puede exigir Inter: pedir
  "clean modern sans-serif typography" (nunca serif, nunca script,
  nunca display decorativa).

## Logo

- Logo = embudo multicolor + wordmark "UpFunnel" (con ".click" pequeño).
- Espacio libre: 100 px a cada lado. Tamaño mínimo: 152 px de ancho.
- No recolorear, no distorsionar, no poner sobre fondos que compitan.
- Versiones: sobre claro y sobre negro (usar la que corresponda al fondo).
- En piezas generadas por IA: NO pedirle al generador que dibuje el logo
  (lo deforma). Dejar espacio reservado y superponer el logo real después.

### Archivos oficiales del logo (usar SIEMPRE estos, nunca recrearlo)

- `assets/upfunnel-logo-cuadrado-fondo-negro.png` — 1080x1080, fondo negro
  sólido. Para avatares, piezas cuadradas y montaje sobre fondos Jet Black.
- `assets/upfunnel-logo-horizontal-blanco-transparente.png` — 810x308,
  wordmark blanco con fondo transparente. Para headers, banners, footers
  de documentos y cualquier superposición sobre fondo oscuro.

Para montarlo sobre una pieza usa PIL/Pillow (paste con máscara alpha para
el transparente), respetando el espacio libre de 100 px y el ancho mínimo
de 152 px.

## Estética (dirección de arte fija)

Palabras clave del brand book — úsalas literalmente en prompts de imagen:
**futuristic minimalism, cyber-sophistication, high-contrast tech,
data-centric, authoritative AI aesthetic**.

Reglas de composición:
- Fondo oscuro dominante (Jet Black), mucho espacio negativo.
- Un solo punto focal; jerarquía clara: titular > dato > CTA.
- Elementos permitidos: grids sutiles, líneas de circuito, nodos/redes,
  glow cian discreto, gráficos de datos abstractos.
- Prohibido: stock photos genéricas de robots/manos cyborg, cliparts,
  sombras duras estilo 2010, arcoíris de colores, tipografías distorsionadas,
  saturación visual (máximo 3 elementos gráficos por pieza).
- Estilo: flat con profundidad sutil (glow, blur ligero), NUNCA
  skeuomorfismo ni 3D cartoon.

## Flujo de trabajo obligatorio

1. **Identifica el tipo de pieza**: prompt de imagen IA, pieza web
   (HTML/React), slide, miniatura, flyer, etc.
2. **Lee `references/brand-data.md`** si necesitas los valores completos
   (RGB/CMYK/HSL, plantillas de prompt por formato, tokens CSS listos).
3. **Genera la pieza** aplicando las reglas de arriba. Para prompts de
   imagen, parte de las plantillas de `references/brand-data.md` y solo
   cambia el contenido variable (mensaje, formato, elementos del tema).
4. **Valida** (opcional pero recomendado para prompts y código):
   ```bash
   python3 scripts/visual_validator.py --file /tmp/pieza.txt
   ```
   El validador revisa que estén los hex oficiales, que no haya colores
   prohibidos, y que aparezcan las palabras clave estéticas en prompts.
5. **Si hay observaciones, corrígelas** antes de entregar. No entregues
   una pieza que no pase la validación sin decírselo al usuario.

## Coherencia con el ADN de escritura (obligatoria)

Este skill gobierna el CÓMO SE VE; `upfunnel-adn-writer` gobierna el CÓMO
SE DICE. Regla de integración: TODO texto de Upfunnel que acompañe una
pieza visual o documento generado con este skill — copy de flyers y slides,
anuncios, guiones, textos de landing pages, documentos Word/PDF, posts —
debe generarse y validarse con `upfunnel-adn-writer` ANTES de montarse en
la pieza. Nunca redactes el texto libremente y nunca entregues la pieza
con texto sin validar. Voz compartida: profesional, técnica, autoritaria,
práctica.
