import {
  tacticalDrawnRaisedAreaCells,
  tacticalRaisedAreaOutlineLines,
} from "../tacticalDrawnRaisedAreas";
import type { TacticalDrawnRaisedArea } from "../tacticalScenarioDefinitions";

const line = (
  from: { x: number; y: number },
  to: { x: number; y: number },
) => ({ kind: "line" as const, from, to });

describe("drawn tactical raised areas", () => {
  it("fills cells whose centers are inside a closed straight outline", () => {
    const area: TacticalDrawnRaisedArea = {
      id: "square-platform",
      segments: [
        line({ x: 2, y: 2 }, { x: 6, y: 2 }),
        line({ x: 6, y: 2 }, { x: 6, y: 6 }),
        line({ x: 6, y: 6 }, { x: 2, y: 6 }),
        line({ x: 2, y: 6 }, { x: 2, y: 2 }),
      ],
    };

    const cells = tacticalDrawnRaisedAreaCells(area, 10, 10);

    expect(cells).toHaveLength(16);
    expect(cells).toContainEqual({ x: 2, y: 2 });
    expect(cells).toContainEqual({ x: 5, y: 5 });
    expect(cells).not.toContainEqual({ x: 6, y: 5 });
  });

  it("supports concave outlines", () => {
    const area: TacticalDrawnRaisedArea = {
      id: "concave-platform",
      segments: [
        line({ x: 1, y: 1 }, { x: 5, y: 1 }),
        line({ x: 5, y: 1 }, { x: 5, y: 3 }),
        line({ x: 5, y: 3 }, { x: 3, y: 3 }),
        line({ x: 3, y: 3 }, { x: 3, y: 5 }),
        line({ x: 3, y: 5 }, { x: 1, y: 5 }),
        line({ x: 1, y: 5 }, { x: 1, y: 1 }),
      ],
    };

    const cells = tacticalDrawnRaisedAreaCells(area, 8, 8);

    expect(cells).toHaveLength(12);
    expect(cells).toContainEqual({ x: 2, y: 4 });
    expect(cells).not.toContainEqual({ x: 4, y: 4 });
  });

  it("rasterizes a freeform outline from cell centers without rounding vertices", () => {
    const area: TacticalDrawnRaisedArea = {
      id: "fractional-platform",
      segments: [
        line({ x: 1.25, y: 1.25 }, { x: 4.75, y: 1.25 }),
        line({ x: 4.75, y: 1.25 }, { x: 4.75, y: 4.75 }),
        line({ x: 4.75, y: 4.75 }, { x: 1.25, y: 4.75 }),
        line({ x: 1.25, y: 4.75 }, { x: 1.25, y: 1.25 }),
      ],
    };

    const cells = tacticalDrawnRaisedAreaCells(area, 8, 8);

    expect(cells).toHaveLength(16);
    expect(cells).toEqual(expect.arrayContaining([
      { x: 1, y: 1 },
      { x: 4, y: 4 },
    ]));
    expect(cells).not.toContainEqual({ x: 5, y: 4 });
  });

  it("flattens quadratic segments and fills beneath the curve", () => {
    const area: TacticalDrawnRaisedArea = {
      id: "curved-platform",
      segments: [
        {
          kind: "quadratic",
          from: { x: 2, y: 2 },
          control: { x: 4, y: 0 },
          to: { x: 6, y: 2 },
        },
        line({ x: 6, y: 2 }, { x: 6, y: 6 }),
        line({ x: 6, y: 6 }, { x: 2, y: 6 }),
        line({ x: 2, y: 6 }, { x: 2, y: 2 }),
      ],
    };

    expect(tacticalRaisedAreaOutlineLines(area).length).toBeGreaterThan(4);
    expect(tacticalDrawnRaisedAreaCells(area, 10, 10)).toContainEqual({
      x: 3,
      y: 1,
    });
  });

  it("rejects open and self-intersecting outlines", () => {
    const open: TacticalDrawnRaisedArea = {
      id: "open-platform",
      segments: [
        line({ x: 1, y: 1 }, { x: 4, y: 1 }),
        line({ x: 4, y: 1 }, { x: 4, y: 4 }),
        line({ x: 4, y: 4 }, { x: 2, y: 4 }),
      ],
    };
    const crossed: TacticalDrawnRaisedArea = {
      id: "crossed-platform",
      segments: [
        line({ x: 1, y: 1 }, { x: 5, y: 5 }),
        line({ x: 5, y: 5 }, { x: 1, y: 5 }),
        line({ x: 1, y: 5 }, { x: 5, y: 1 }),
        line({ x: 5, y: 1 }, { x: 1, y: 1 }),
      ],
    };

    expect(() => tacticalDrawnRaisedAreaCells(open, 8, 8)).toThrow(
      "outline must be closed",
    );
    expect(() => tacticalDrawnRaisedAreaCells(crossed, 8, 8)).toThrow(
      "intersects itself",
    );
  });
});
