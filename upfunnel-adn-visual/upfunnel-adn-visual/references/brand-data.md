# Upfunnel — Datos completos de marca y plantillas

Fuente: Brand Book oficial de Upfunnel (Pomelli).

## 1. Colores (valores completos)

| Nombre | Hex | RGB | CMYK | HSL |
|---|---|---|---|---|
| Jet Black | #080C14 | 8, 12, 20 | 60, 40, 0, 92 | 220, 43%, 5% |
| Cyan Blue | #00E5FF | 0, 229, 255 | 100, 10, 0, 0 | 186, 100%, 50% |
| Pure White | #FFFFFF | 255, 255, 255 | 0, 0, 0, 0 | 0, 0%, 100% |
| Slate Mist | #94A3B8 | 148, 163, 184 | 20, 11, 0, 28 | 215, 20%, 65% |

## 2. Tokens CSS listos para piezas web

```css
:root {
  --uf-bg: #080C14;        /* Jet Black — fondo dominante */
  --uf-accent: #00E5FF;    /* Cyan Blue — CTAs, highlights, glow */
  --uf-text: #FFFFFF;      /* Pure White — titulares y texto principal */
  --uf-muted: #94A3B8;     /* Slate Mist — texto secundario, bordes */
  --uf-font: 'Inter', sans-serif;
}
/* Glow de acento característico */
.uf-glow { box-shadow: 0 0 24px rgba(0, 229, 255, 0.35); }
/* Borde sutil sobre fondo oscuro */
.uf-border { border: 1px solid rgba(148, 163, 184, 0.25); }
```

Cargar Inter: `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap`

## 3. Plantillas de prompt para generación de imágenes

Reemplaza solo los corchetes. NUNCA cambies la paleta ni las palabras
clave estéticas. NUNCA pidas que el generador dibuje el logo de UpFunnel.

### 3a. Anuncio / flyer vertical (WhatsApp, Instagram feed — 1080x1350)

```
Modern promotional poster for [TEMA DE LA PIEZA], dark background (jet black
#080C14) with vibrant cyan (#00E5FF) accents, subtle glowing circuit and
data-network patterns, generous negative space. Central bold headline in
Spanish: "[TITULAR]". Subtitle: "[SUBTITULO]". Clearly visible info block:
"[DATO CLAVE: fecha/cifra]". Clean modern sans-serif typography, pure white
(#FFFFFF) primary text, slate gray (#94A3B8) secondary text. Futuristic
minimalism, cyber-sophistication, high-contrast tech, data-centric,
authoritative AI aesthetic. Flat design with subtle depth and cyan glow
effects, single focal point, no photographs, no people, no robots, vertical
format 1080x1350. Leave empty space at the [top/bottom] corner for a logo.
```

### 3b. Banner horizontal / portada (comunidad, YouTube — 1920x1080 o 2560x1440)

```
Wide horizontal tech banner for [TEMA], jet black background #080C14, thin
cyan #00E5FF accent lines and a subtle abstract data-grid on one side,
strong negative space on the other side for text overlay. Futuristic
minimalism, cyber-sophistication, high-contrast, data-centric, authoritative
AI aesthetic. Flat with subtle cyan glow, no text, no logos, no people,
16:9 format.
```
(Los banners se generan SIN texto; el texto se superpone después con Inter.)

### 3c. Miniatura de YouTube (1280x720)

```
YouTube thumbnail background for an AI tech video about [TEMA], jet black
#080C14 base, one large abstract [ELEMENTO: neural node / funnel shape /
data stream] in cyan #00E5FF with glow, high contrast, futuristic
minimalism, huge negative space on the [left/right] for bold title text
overlay, no text, no faces, no logos, 16:9.
```

### 3d. Slide de presentación (fondo)

```
Minimal presentation slide background, solid jet black #080C14, a single
thin cyan #00E5FF geometric accent line near the [bottom/left] edge,
extremely subtle dark grid texture, futuristic minimalism, high-contrast
tech aesthetic, 90% empty space for content, no text, 16:9.
```

## 4. Reglas de logo (recordatorio operativo)

- Espacio libre: 100 px por lado. Ancho mínimo: 152 px (1.58 in).
- Variantes: fondo claro y fondo negro. Elegir según el fondo de la pieza.
- El embudo multicolor NO se recolorea a la paleta — es la única pieza
  multicolor permitida de la marca.
- En piezas IA: reservar espacio vacío y montar el logo real en edición.

## 5. Checklist de entrega (toda pieza visual)

1. ¿El fondo dominante es Jet Black (o Pure White en piezas invertidas)?
2. ¿El único color de acento es Cyan #00E5FF y ocupa menos del ~15%?
3. ¿La tipografía es Inter (o "clean sans-serif" en prompts)?
4. ¿Hay un solo punto focal y máximo 3 elementos gráficos?
5. ¿Aparecen las 5 palabras clave estéticas si es un prompt de imagen?
6. ¿No hay colores de otras marcas (lime #C8F04A = CuratorAI)?
7. ¿El logo se superpone después, no lo dibuja el generador?
8. Si lleva copy en español: ¿pasó por upfunnel-adn-writer?
