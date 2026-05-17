export const HEX_RADIUS = 20;
export const COL_SPACING = HEX_RADIUS * 1.5;                 // 30  — horizontal center-to-center
export const ROW_SPACING = HEX_RADIUS * Math.sqrt(3);        // ≈34.6 — vertical center-to-center
export const EVEN_COL_OFFSET = ROW_SPACING / 2;              // ≈17.3 — even-column downward shift
export const HEX_PAD = 4;

export const hexSvgWidth = (cols: number) =>
  (cols - 1) * COL_SPACING + HEX_RADIUS * 2 + HEX_PAD * 2;

export const hexSvgHeight = (rows: number) =>
  rows * ROW_SPACING + EVEN_COL_OFFSET + HEX_PAD * 2;

export const hexCenter = (col: number, row: number): { cx: number; cy: number } => ({
  cx: (col - 1) * COL_SPACING + HEX_RADIUS + HEX_PAD,
  cy: (row - 1) * ROW_SPACING + ROW_SPACING / 2 + HEX_PAD + (col % 2 === 0 ? EVEN_COL_OFFSET : 0),
});
