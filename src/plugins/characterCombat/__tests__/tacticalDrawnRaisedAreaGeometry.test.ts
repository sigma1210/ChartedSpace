import type { TacticalDrawnRaisedArea } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import {
  tacticalAreaInteriorDetailScale,
  tacticalAreaOutlinePoints,
  tacticalDrawnRaisedAreaCellKeys,
  tacticalDrawnRaisedAreaGridLinePositions,
  tacticalDrawnRaisedAreaLevelsByCell,
  tacticalDrawnRaisedAreaShape,
  tacticalDrawnRaisedAreaTopLevelByCell,
  tacticalFrontmostContainedAreaHoles,
} from "../tacticalDrawnRaisedAreaGeometry";
import {
  TACTICAL_TERRAIN_GRID_LIFT,
  TACTICAL_WALL_HEIGHT,
} from "../tacticalSceneGeometry";

describe("drawn raised-area play geometry", () => {
  const curvedArea: TacticalDrawnRaisedArea = {
    id: "curved-platform",
    segments: [
      { kind: "line", from: { x: 2, y: 2 }, to: { x: 6, y: 2 } },
      {
        kind: "quadratic",
        from: { x: 6, y: 2 },
        control: { x: 8, y: 4 },
        to: { x: 6, y: 6 },
      },
      { kind: "line", from: { x: 6, y: 6 }, to: { x: 2, y: 6 } },
      { kind: "line", from: { x: 2, y: 6 }, to: { x: 2, y: 2 } },
    ],
  };

  it("preserves quadratic curves as a smooth Three shape", () => {
    const points = tacticalDrawnRaisedAreaShape(curvedArea, 10, 10).getPoints(32);

    expect(points.length).toBeGreaterThan(curvedArea.segments.length);
    expect(points.some((point) => !Number.isInteger(point.x) || !Number.isInteger(point.y))).toBe(true);
    expect(Math.max(...points.map((point) => point.x))).toBeGreaterThan(1);
  });

  it("preserves cubic curves as a smooth Three shape", () => {
    const cubicArea: TacticalDrawnRaisedArea = {
      ...curvedArea,
      id: "cubic-platform",
      segments: curvedArea.segments.map((segment) => segment.kind === "quadratic" ? {
        kind: "cubic" as const,
        from: segment.from,
        control1: { x: 8, y: 3 },
        control2: { x: 8, y: 5 },
        to: segment.to,
      } : segment),
    };

    const points = tacticalDrawnRaisedAreaShape(cubicArea, 10, 10).getPoints(32);
    expect(points.length).toBeGreaterThan(cubicArea.segments.length);
    expect(Math.max(...points.map((point) => point.x))).toBeGreaterThan(1);
    expect(tacticalAreaOutlinePoints(cubicArea)[0]).toEqual(tacticalAreaOutlinePoints(cubicArea).at(-1));
  });

  it("cuts a frontmost nested area out of the containing terrain shape", () => {
    const inner: TacticalDrawnRaisedArea = {
      id: "depression",
      segments: [
        { kind: "line", from: { x: 3, y: 3 }, to: { x: 5, y: 3 } },
        { kind: "line", from: { x: 5, y: 3 }, to: { x: 5, y: 5 } },
        { kind: "line", from: { x: 5, y: 5 }, to: { x: 3, y: 5 } },
        { kind: "line", from: { x: 3, y: 5 }, to: { x: 3, y: 3 } },
      ],
    };
    const holes = tacticalFrontmostContainedAreaHoles([curvedArea, inner], 10, 10);
    const outerShape = tacticalDrawnRaisedAreaShape(curvedArea, 10, 10, holes[0]);

    expect(holes[0]).toEqual([inner]);
    expect(holes[1]).toEqual([]);
    expect(outerShape.holes).toHaveLength(1);
    expect(outerShape.holes[0]?.getPoints()).toHaveLength(5);
  });

  it("creates direct holes at each level of a three-area nesting hierarchy", () => {
    const rectangle = (id: string, from: number, to: number): TacticalDrawnRaisedArea => ({
      id,
      segments: [
        { kind: "line", from: { x: from, y: from }, to: { x: to, y: from } },
        { kind: "line", from: { x: to, y: from }, to: { x: to, y: to } },
        { kind: "line", from: { x: to, y: to }, to: { x: from, y: to } },
        { kind: "line", from: { x: from, y: to }, to: { x: from, y: from } },
      ],
    });
    const outer = rectangle("outer", 1, 9);
    const middle = rectangle("middle", 2, 8);
    const inner = rectangle("inner", 3, 7);

    const holes = tacticalFrontmostContainedAreaHoles([outer, middle, inner], 10, 10);

    expect(holes).toEqual([[middle], [inner], []]);
  });

  it("samples a closed smooth boundary for shaped terrain-region rims", () => {
    const points = tacticalAreaOutlinePoints(curvedArea);

    expect(points.length).toBeGreaterThan(curvedArea.segments.length);
    expect(points[0]).toEqual(points.at(-1));
    expect(points.some((point) => !Number.isInteger(point.x) || !Number.isInteger(point.y))).toBe(true);
    expect(Math.max(...points.map((point) => point.x))).toBeGreaterThan(6);
  });

  it("shrinks machinery details as their centers approach an outline", () => {
    expect(tacticalAreaInteriorDetailScale(curvedArea, { x: 4, y: 4 })).toBe(1);
    expect(tacticalAreaInteriorDetailScale(curvedArea, { x: 2.1, y: 4 })).toBeLessThan(0.16);
    expect(tacticalAreaInteriorDetailScale(curvedArea, { x: 2.5, y: 4 })).toBeGreaterThan(0.8);
  });

  it("identifies gameplay cells replaced by the smooth visual mesh", () => {
    const keys = tacticalDrawnRaisedAreaCellKeys([curvedArea], 10, 10);

    expect(keys.has("3:3")).toBe(true);
    expect(keys.has("6:3")).toBe(true);
    expect(keys.has("1:3")).toBe(false);
  });

  it("clips world-aligned grid lines to the curved visual outline", () => {
    const positions = Array.from(tacticalDrawnRaisedAreaGridLinePositions(
      curvedArea,
      1,
      10,
      10,
    ));
    const points = Array.from(
      { length: positions.length / 3 },
      (_, index) => ({
        x: positions[index * 3]!,
        height: positions[index * 3 + 1]!,
        y: positions[index * 3 + 2]!,
      }),
    );

    expect(points.length).toBeGreaterThan(0);
    points.forEach((point) => {
      expect(point.height).toBeCloseTo(
        TACTICAL_WALL_HEIGHT + TACTICAL_TERRAIN_GRID_LIFT,
      );
      expect(point.x).toBeGreaterThanOrEqual(-3);
      expect(point.x).toBeLessThanOrEqual(2);
      expect(point.y).toBeGreaterThanOrEqual(-3);
      expect(point.y).toBeLessThanOrEqual(1);
    });

    const horizontalAtMapY3 = points.filter((point) =>
      Math.abs(point.y - (3 - 10 / 2)) < 1e-6);
    expect(Math.max(...horizontalAtMapY3.map((point) => point.x)))
      .toBeCloseTo(6.75 - 10 / 2, 2);
  });

  it("places clipped grids at each drawn platform's own level", () => {
    [1, 2].forEach((level) => {
      const positions = tacticalDrawnRaisedAreaGridLinePositions(
        curvedArea,
        level,
        10,
        10,
      );
      Array.from(positions).filter((_, index) => index % 3 === 1)
        .forEach((height) => expect(height).toBeCloseTo(
          level * TACTICAL_WALL_HEIGHT + TACTICAL_TERRAIN_GRID_LIFT,
        ));
    });
  });

  it("tracks the highest smooth platform level covering each cell", () => {
    const upper: TacticalDrawnRaisedArea = {
      id: "upper",
      segments: [
        { kind: "line", from: { x: 3, y: 3 }, to: { x: 5, y: 3 } },
        { kind: "line", from: { x: 5, y: 3 }, to: { x: 5, y: 5 } },
        { kind: "line", from: { x: 5, y: 5 }, to: { x: 3, y: 5 } },
        { kind: "line", from: { x: 3, y: 5 }, to: { x: 3, y: 3 } },
      ],
    };
    const levels = tacticalDrawnRaisedAreaTopLevelByCell(
      [curvedArea, upper],
      { "curved-platform": 1, upper: 2 },
      10,
      10,
    );

    expect(levels.get("2:2")).toBe(1);
    expect(levels.get("3:3")).toBe(2);

    const allLevels = tacticalDrawnRaisedAreaLevelsByCell(
      [curvedArea, upper],
      { "curved-platform": 1, upper: 2 },
      10,
      10,
    );
    expect(allLevels.get("2:2")).toEqual(new Set([1]));
    expect(allLevels.get("3:3")).toEqual(new Set([1, 2]));
  });
});
