// Paleta categórica derivada del cyan de marca Upfunnel + Slate Mist, validada con la skill
// `dataviz` (scripts/validate_palette.js) para lightness band, chroma floor, separación CVD y
// contraste en modo dark y light. Orden fijo — nunca se cicla ni se reordena por valor.
export const CHART_CATEGORICAL_PALETTE = [
  '#0891B2', // slot 1
  '#2563EB', // slot 2
  '#0D9488', // slot 3
  '#0369A1', // slot 4
  '#079AAA', // slot 5
  '#0EA394', // slot 6
];

export function colorForIndex(index: number) {
  return CHART_CATEGORICAL_PALETTE[index % CHART_CATEGORICAL_PALETTE.length];
}
