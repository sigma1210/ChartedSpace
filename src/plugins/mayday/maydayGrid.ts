import { axialRadius, type MaydayVector } from "./maydayRules";

interface MaydayGridViewport {
  width: number;
  height: number;
  origin: { x: number; y: number };
  pan: { x: number; y: number };
  hexRadius: number;
  boardRadius: number;
  padding: number;
}

const axialToPixel = (
  position: MaydayVector,
  origin: { x: number; y: number },
  hexRadius: number,
) => ({
  x: origin.x + hexRadius * Math.sqrt(3) * (position.q + position.r / 2),
  y: origin.y + hexRadius * 1.5 * position.r,
});

export const maydayPanToCenter = (
  position: MaydayVector,
  viewport: { width: number; height: number },
  origin: { x: number; y: number },
  hexRadius: number,
) => {
  const point = axialToPixel(position, origin, hexRadius);
  return {
    x: viewport.width / 2 - point.x,
    y: viewport.height / 2 - point.y,
  };
};

export const buildVisibleMaydayHexes = ({
  width,
  height,
  origin,
  pan,
  hexRadius,
  boardRadius,
  padding,
}: MaydayGridViewport): MaydayVector[] => {
  const minWorldY = -padding - pan.y;
  const maxWorldY = height + padding - pan.y;
  const minR = Math.floor((minWorldY - origin.y) / (hexRadius * 1.5)) - 1;
  const maxR = Math.ceil((maxWorldY - origin.y) / (hexRadius * 1.5)) + 1;
  const minWorldX = -padding - pan.x;
  const maxWorldX = width + padding - pan.x;
  const hexes: MaydayVector[] = [];

  for (let r = minR; r <= maxR; r += 1) {
    const minQ = Math.floor(
      (minWorldX - origin.x) / (hexRadius * Math.sqrt(3)) - r / 2,
    ) - 1;
    const maxQ = Math.ceil(
      (maxWorldX - origin.x) / (hexRadius * Math.sqrt(3)) - r / 2,
    ) + 1;

    for (let q = minQ; q <= maxQ; q += 1) {
      const position = { q, r };
      if (axialRadius(position) > boardRadius) continue;

      const center = axialToPixel(position, origin, hexRadius);
      const screenX = center.x + pan.x;
      const screenY = center.y + pan.y;
      if (
        screenX < -padding
        || screenX > width + padding
        || screenY < -padding
        || screenY > height + padding
      ) continue;

      hexes.push(position);
    }
  }

  return hexes;
};
