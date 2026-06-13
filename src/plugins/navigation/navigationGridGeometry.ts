import type { JumpRangeCell } from "@/lib/jumpRange";

const hexRadius = 20 / 3;
const sqrt3 = Math.sqrt(3);
const colStep = hexRadius * 1.5;
const rowStepQ = (hexRadius * sqrt3) / 2;
const rowStepR = hexRadius * sqrt3;
const pad = 4;

export const navigationHexRadius = hexRadius - 0.35;

export interface NavigationDisplayCell extends JumpRangeCell {
  px: number;
  py: number;
}

export interface NavigationGridLayout {
  width: number;
  height: number;
  cells: NavigationDisplayCell[];
}

const axialToPixel = (dq: number, dr: number) => ({
  x: colStep * dq,
  y: rowStepQ * dq + rowStepR * dr,
});

export const navigationHexPoints = (
  cx: number,
  cy: number,
  radius = navigationHexRadius,
) =>
  Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 180) * 60 * index;
    return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");

export const buildNavigationGridLayout = (
  cells: readonly JumpRangeCell[],
): NavigationGridLayout => {
  if (cells.length === 0) {
    return {
      width: hexRadius * 2 + pad * 2,
      height: hexRadius * 2 + pad * 2,
      cells: [],
    };
  }

  const rawCells = cells.map((cell) => ({
    ...cell,
    ...axialToPixel(cell.dq, cell.dr),
  }));
  const xs = rawCells.map((cell) => cell.x);
  const ys = rawCells.map((cell) => cell.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const width = maxX - minX + hexRadius * 2 + pad * 2;
  const height = maxY - minY + hexRadius * 2 + pad * 2;
  const offsetX = -minX + hexRadius + pad;
  const offsetY = -minY + hexRadius + pad;

  return {
    width,
    height,
    cells: rawCells.map((cell) => ({
      ...cell,
      px: cell.x + offsetX,
      py: cell.y + offsetY,
    })),
  };
};
