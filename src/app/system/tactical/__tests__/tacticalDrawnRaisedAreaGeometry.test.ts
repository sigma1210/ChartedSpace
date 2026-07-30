import type { TacticalDrawnRaisedArea } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import {
  tacticalDrawnRaisedAreaCellKeys,
  tacticalDrawnRaisedAreaLevelsByCell,
  tacticalDrawnRaisedAreaShape,
  tacticalDrawnRaisedAreaTopLevelByCell,
} from "../tacticalDrawnRaisedAreaGeometry";

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

  it("identifies gameplay cells replaced by the smooth visual mesh", () => {
    const keys = tacticalDrawnRaisedAreaCellKeys([curvedArea], 10, 10);

    expect(keys.has("3:3")).toBe(true);
    expect(keys.has("6:3")).toBe(true);
    expect(keys.has("1:3")).toBe(false);
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
