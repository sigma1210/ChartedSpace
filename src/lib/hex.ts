export const parseHex = (hex: string): { col: number; row: number } | null => {
  if (!hex || hex.length !== 4) return null;
  const col = parseInt(hex.slice(0, 2), 10);
  const row = parseInt(hex.slice(2, 4), 10);
  if (isNaN(col) || isNaN(row)) return null;
  return { col, row };
};

// Flat-top hex, even 1-based columns shift down (odd-q in 0-based terms).
// Converts offset coords to cube and returns the max-norm distance.
export const hexDistance = (
  col1: number, row1: number,
  col2: number, row2: number,
): number => {
  const q1 = col1 - 1;
  const r1 = (row1 - 1) - Math.floor((col1 - 1) / 2);
  const s1 = -q1 - r1;

  const q2 = col2 - 1;
  const r2 = (row2 - 1) - Math.floor((col2 - 1) / 2);
  const s2 = -q2 - r2;

  return Math.max(Math.abs(q1 - q2), Math.abs(r1 - r2), Math.abs(s1 - s2));
};
