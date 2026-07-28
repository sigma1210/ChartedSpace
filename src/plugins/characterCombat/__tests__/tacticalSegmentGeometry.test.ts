import {
  tacticalMovementStepCrossesWall,
  tacticalCellsAlongWall,
  tacticalCellsSeparatedBySegment,
  tacticalSegmentsIntersect,
  tacticalWallBlockedMovementEdgeKeys,
  tacticalWallSegmentKey,
} from "../tacticalSegmentGeometry";
import { tacticalMovementEdgeKey } from "../tacticalTerrain";

describe("tactical segment geometry", () => {
  it("detects diagonal crossings, endpoint contact, and separated segments", () => {
    expect(tacticalSegmentsIntersect(
      { x: 0, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
      { x: 4, y: 0 },
    )).toBe(true);
    expect(tacticalSegmentsIntersect(
      { x: 0, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 1 },
      { x: 4, y: 3 },
    )).toBe(true);
    expect(tacticalSegmentsIntersect(
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    )).toBe(false);
  });

  it("treats a cell-center movement crossing a diagonal wall as blocked", () => {
    const wall = { from: { x: 1, y: 0 }, to: { x: 3, y: 2 } };
    expect(tacticalMovementStepCrossesWall({ x: 1, y: 1 }, { x: 2, y: 0 }, wall)).toBe(true);
    expect(tacticalMovementStepCrossesWall({ x: 0, y: 2 }, { x: 1, y: 2 }, wall)).toBe(false);
    expect(tacticalWallBlockedMovementEdgeKeys(wall)).toContain(
      tacticalMovementEdgeKey({ x: 1, y: 1 }, { x: 2, y: 0 }),
    );
  });

  it("normalizes a wall independently of endpoint order", () => {
    expect(tacticalWallSegmentKey({
      from: { x: 2, y: 5 },
      to: { x: 8, y: 1 },
    })).toBe(tacticalWallSegmentKey({
      from: { x: 8, y: 1 },
      to: { x: 2, y: 5 },
    }));
  });

  it("finds cells along the full length of a diagonal wall", () => {
    const cells = tacticalCellsAlongWall({
      from: { x: 1, y: 1 },
      to: { x: 5, y: 3 },
    });
    expect(cells).toEqual(expect.arrayContaining([
      { x: 1, y: 1 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
    ]));
  });

  it("finds the two cells on opposite sides of an angled portal", () => {
    const separated = tacticalCellsSeparatedBySegment({
      from: { x: 1.6464466094, y: 1.6464466094 },
      to: { x: 2.3535533906, y: 2.3535533906 },
    });
    expect([separated.first, separated.second]).toEqual(expect.arrayContaining([
      { x: 1, y: 2 },
      { x: 2, y: 1 },
    ]));
  });
});
