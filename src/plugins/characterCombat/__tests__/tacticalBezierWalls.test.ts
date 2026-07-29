import { tacticalQuadraticBezierPoint, tacticalQuadraticBezierWallSegments } from "../tacticalBezierWalls";

describe("tactical quadratic Bezier walls", () => {
  const wall = {
    id: "curved-wall",
    from: { x: 2, y: 2 },
    control: { x: 6.25, y: 8.5 },
    to: { x: 10, y: 2 },
  };

  it("evaluates endpoints and the midpoint on a quadratic curve", () => {
    expect(tacticalQuadraticBezierPoint(wall, 0)).toEqual(wall.from);
    expect(tacticalQuadraticBezierPoint(wall, 1)).toEqual(wall.to);
    expect(tacticalQuadraticBezierPoint(wall, 0.5)).toEqual({ x: 6.125, y: 5.25 });
  });

  it("creates stable, continuous, short wall segments", () => {
    const segments = tacticalQuadraticBezierWallSegments(wall, 0.5);

    expect(segments[0]).toMatchObject({ id: "curved-wall:curve:1", from: wall.from });
    expect(segments.at(-1)?.to).toEqual(wall.to);
    segments.forEach((segment, index) => {
      expect(Math.hypot(segment.to.x - segment.from.x, segment.to.y - segment.from.y)).toBeLessThanOrEqual(0.5);
      if (index > 0) expect(segment.from).toEqual(segments[index - 1].to);
    });
  });

  it("rejects invalid maximum segment lengths", () => {
    expect(() => tacticalQuadraticBezierWallSegments(wall, 0)).toThrow("Bezier wall segment length must be positive.");
  });
});
