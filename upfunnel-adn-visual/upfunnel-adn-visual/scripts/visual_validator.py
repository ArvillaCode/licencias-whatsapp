#!/usr/bin/env python3
"""Validador de ADN visual de Upfunnel.

Revisa un archivo (prompt de imagen, HTML/CSS/JSX, o descripción de pieza)
contra las reglas fijas del brand book. No modifica nada: solo reporta.

Uso:
    python3 visual_validator.py --file /tmp/pieza.txt [--type prompt|code]

Si no se pasa --type, se detecta: si el contenido parece HTML/CSS/JS se
valida como 'code'; si no, como 'prompt'.
"""

import argparse
import re
import sys

# --- Reglas fijas (fuente: Brand Book Upfunnel) ---

PALETTE = {
    "Jet Black": "#080C14",
    "Cyan Blue": "#00E5FF",
    "Pure White": "#FFFFFF",
    "Slate Mist": "#94A3B8",
}

# Colores explícitamente prohibidos (otras marcas / fuera de paleta)
FORBIDDEN_HEX = {
    "#C8F04A": "lime green de CuratorAI — no mezclar marcas",
    "#00FF88": "verde de SnapEdit — no mezclar marcas",
}

AESTHETIC_KEYWORDS = [
    "futuristic minimalism",
    "cyber-sophistication",
    "high-contrast",
    "data-centric",
    "authoritative",
]

FORBIDDEN_TERMS_PROMPT = [
    (r"\brainbow\b", "arcoíris de colores — fuera del ADN"),
    (r"\bcartoon\b", "estilo cartoon — fuera del ADN"),
    (r"\bskeuomorph", "skeuomorfismo — fuera del ADN"),
    (r"(?<!sans)(?<!sans-)\bserif\b", "tipografía serif — solo sans-serif (Inter)"),
    (r"draw(ing)? the (upfunnel )?logo|include the (upfunnel )?logo",
     "no pedir al generador que dibuje el logo — se superpone después"),
]

FORBIDDEN_FONTS_CODE = [
    "comic sans", "papyrus", "times new roman", "georgia", "lobster",
    "montserrat", "roboto", "poppins", "dm sans", "jetbrains mono",
]

HEX_RE = re.compile(r"#[0-9a-fA-F]{6}\b")


def norm_hexes(text: str):
    return {h.upper() for h in HEX_RE.findall(text)}


def validate_prompt(text: str):
    issues, warnings = [], []
    low = text.lower()
    hexes = norm_hexes(text)

    if PALETTE["Jet Black"].upper() not in hexes and "jet black" not in low:
        issues.append("Falta el fondo Jet Black (#080C14) — es el fondo dominante obligatorio.")
    if PALETTE["Cyan Blue"].upper() not in hexes and "cyan" not in low:
        issues.append("Falta el acento Cyan Blue (#00E5FF) — único color de acento permitido.")

    for hex_code, reason in FORBIDDEN_HEX.items():
        if hex_code.upper() in hexes:
            issues.append(f"Color prohibido {hex_code}: {reason}.")

    missing_kw = [k for k in AESTHETIC_KEYWORDS if k not in low]
    if len(missing_kw) >= 3:
        issues.append(
            "Faltan las palabras clave estéticas del brand book: "
            + ", ".join(missing_kw)
        )
    elif missing_kw:
        warnings.append("Palabras clave estéticas ausentes (opcional añadir): " + ", ".join(missing_kw))

    for pattern, reason in FORBIDDEN_TERMS_PROMPT:
        if re.search(pattern, low):
            issues.append(f"Término prohibido en el prompt: {reason}.")

    if "sans-serif" not in low and "inter" not in low:
        warnings.append("No se especifica tipografía — añadir 'clean modern sans-serif typography'.")

    return issues, warnings


def validate_code(text: str):
    issues, warnings = [], []
    low = text.lower()
    hexes = norm_hexes(text)

    unknown = hexes - {v.upper() for v in PALETTE.values()}
    # Tolerar negros/grises neutros muy cercanos y transparencias comunes
    tolerated = {h for h in unknown if re.match(r"#0[0-9A-F]0?[0-9A-F]{3,4}", h)}
    unknown -= tolerated
    for hex_code, reason in FORBIDDEN_HEX.items():
        if hex_code.upper() in hexes:
            issues.append(f"Color prohibido {hex_code}: {reason}.")
            unknown.discard(hex_code.upper())
    if unknown:
        warnings.append(
            "Colores fuera de paleta detectados (verificar si son necesarios): "
            + ", ".join(sorted(unknown))
        )

    if PALETTE["Jet Black"].upper() not in hexes:
        issues.append("No se usa Jet Black (#080C14) — debe ser el fondo dominante.")
    if PALETTE["Cyan Blue"].upper() not in hexes:
        warnings.append("No se usa Cyan Blue (#00E5FF) — verificar si la pieza necesita acento.")

    if "inter" not in low:
        issues.append("La tipografía Inter no aparece — es la única tipografía de marca.")
    for font in FORBIDDEN_FONTS_CODE:
        if font in low:
            issues.append(f"Tipografía fuera de marca detectada: '{font}' — usar solo Inter.")

    return issues, warnings


def detect_type(text: str) -> str:
    if re.search(r"<\w+[^>]*>|\{[^}]*:[^}]*;|\bclassName=|\bfont-family", text):
        return "code"
    return "prompt"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", required=True)
    ap.add_argument("--type", choices=["prompt", "code"], default=None)
    args = ap.parse_args()

    try:
        with open(args.file, encoding="utf-8") as f:
            text = f.read()
    except OSError as e:
        print(f"❌ No se pudo leer el archivo: {e}")
        sys.exit(2)

    kind = args.type or detect_type(text)
    issues, warnings = (validate_code(text) if kind == "code" else validate_prompt(text))

    print(f"Tipo de pieza validada: {kind}")
    if not issues and not warnings:
        print("✅ La pieza cumple con el ADN visual de Upfunnel. Sin observaciones.")
        sys.exit(0)
    if issues:
        print(f"\n❌ Observaciones obligatorias ({len(issues)}):")
        for i in issues:
            print(f"  - {i}")
    if warnings:
        print(f"\n⚠️  Advertencias ({len(warnings)}):")
        for w in warnings:
            print(f"  - {w}")
    sys.exit(1 if issues else 0)


if __name__ == "__main__":
    main()
