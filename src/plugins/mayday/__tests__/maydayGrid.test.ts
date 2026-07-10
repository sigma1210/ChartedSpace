import { buildVisibleMaydayHexes, maydayPanToCenter } from "../maydayGrid";

const viewport = {
  width: 760,
  height: 560,
  origin: { x: 380, y: 280 },
  pan: { x: 0, y: 0 },
  hexRadius: 28,
  boardRadius: 60,
  padding: 70,
};

describe("buildVisibleMaydayHexes", () => {
  it("calculates pan that centers a requested hex", () => {
    const pan = maydayPanToCenter(
      { q: 10, r: -4 },
      { width: 760, height: 560 },
      { x: 380, y: 280 },
      28,
    );
    const centeredX = 380 + 28 * Math.sqrt(3) * (10 - 4 / 2) + pan.x;
    const centeredY = 280 + 28 * 1.5 * -4 + pan.y;

    expect(centeredX).toBeCloseTo(380);
    expect(centeredY).toBeCloseTo(280);
  });

  it("renders a bounded number of hexes for a large logical board", () => {
    const hexes = buildVisibleMaydayHexes(viewport);

    expect(hexes.length).toBeGreaterThan(100);
    expect(hexes.length).toBeLessThan(400);
  });

  it("includes newly visible distant hexes after panning", () => {
    const hexes = buildVisibleMaydayHexes({
      ...viewport,
      pan: { x: -1455, y: 0 },
    });

    expect(hexes.some((hex) => hex.q === 30 && hex.r === 0)).toBe(true);
    expect(hexes.some((hex) => hex.q === 0 && hex.r === 0)).toBe(false);
  });

  it("does not render cells outside the logical board radius", () => {
    const hexes = buildVisibleMaydayHexes({
      ...viewport,
      boardRadius: 18,
      pan: { x: -1455, y: 0 },
    });

    expect(hexes.every((hex) =>
      Math.max(Math.abs(hex.q), Math.abs(hex.r), Math.abs(hex.q + hex.r)) <= 18
    )).toBe(true);
    expect(hexes.some((hex) => hex.q === 30 && hex.r === 0)).toBe(false);
  });
});
