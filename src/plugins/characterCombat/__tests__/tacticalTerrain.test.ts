import { pointKey, reachableOpenMapMovement, sidestepAndBackstepMoves } from "../geometry";
import { createControlRoom, tacticalMovementEdgeKey, tacticalTerrainBlockedCells, tacticalTerrainBlockedEdges, tacticalWallCornerPoints, tacticalWallVisualRuns } from "../tacticalTerrain";

describe("tactical Control Room", () => {
  it("creates a 9 by 9 room with independent perimeter targets and four centered doors", () => {
    const room = createControlRoom({ id: "bridge", origin: { x: 10, y: 20 }, terminal: { kind: "navigation", label: "Helm" } });
    const walls = room.objects.filter((object) => object.kind === "wall");
    const doors = room.objects.filter((object) => object.kind === "door");

    expect(room).toMatchObject({ width: 9, height: 9 });
    expect(walls).toHaveLength(32);
    expect(doors).toHaveLength(4);
    expect(new Set(room.objects.map((object) => object.id)).size).toBe(room.objects.length);
    expect(doors.map((door) => door.edge)).toEqual(expect.arrayContaining([
      { from: { x: 14, y: 20 }, to: { x: 15, y: 20 } },
      { from: { x: 14, y: 29 }, to: { x: 15, y: 29 } },
      { from: { x: 10, y: 24 }, to: { x: 10, y: 25 } },
      { from: { x: 19, y: 24 }, to: { x: 19, y: 25 } },
    ]));
  });

  it("uses the supplied terminal definition at the room center", () => {
    const room = createControlRoom({ id: "engineering", origin: { x: 2, y: 3 }, terminal: { kind: "engineering", label: "Reactor Control", operational: false } });
    expect(room.objects.find((object) => object.kind === "terminal")).toMatchObject({
      id: "engineering:terminal", position: { x: 6, y: 7 }, terminalKind: "engineering", label: "Reactor Control", operational: false,
    });
  });

  it("rotates wall orientation and terminal facing while preserving the footprint", () => {
    const room = createControlRoom({ id: "comms", origin: { x: 30, y: 40 }, rotation: 90, terminal: { kind: "communications", label: "Comms", facing: 90 } });
    expect(room.objects.find((object) => object.id === "comms:north:wall:0")).toMatchObject({ edge: { from: { x: 39, y: 40 }, to: { x: 39, y: 41 } } });
    expect(room.objects.find((object) => object.kind === "terminal")).toMatchObject({ position: { x: 34, y: 44 }, facing: 180 });
  });

  it("blocks the terminal cell and represents walls and doors as blocked edges", () => {
    const room = createControlRoom({ id: "security", origin: { x: 0, y: 0 }, terminal: { kind: "security", label: "Security" } });
    const blockedCells = tacticalTerrainBlockedCells(room.objects);
    const blockedEdges = tacticalTerrainBlockedEdges(room.objects);
    expect(blockedCells).toEqual(new Set(["4:4"]));
    expect(blockedEdges.size).toBe(36);
  });

  it("prevents orthogonal and diagonal movement through the continuous boundary", () => {
    const room = createControlRoom({ id: "security", origin: { x: 10, y: 20 }, terminal: { kind: "security", label: "Security" } });
    const moves = reachableOpenMapMovement({
      width: 100, height: 100, origin: { x: 14, y: 19 }, facing: "south", allowance: 3, trotting: false,
      blockedCells: tacticalTerrainBlockedCells(room.objects), blockedEdges: tacticalTerrainBlockedEdges(room.objects),
    });
    expect(moves.has(pointKey({ x: 14, y: 20 }))).toBe(false);
    expect(moves.has(pointKey({ x: 15, y: 20 }))).toBe(false);
  });

  it("offers the five AHL sidestep and backstep squares for 4 AP without changing facing", () => {
    const moves = sidestepAndBackstepMoves({ width: 10, height: 10, origin: { x: 5, y: 5 }, facing: "north", allowance: 4 });

    expect([...moves.keys()].sort()).toEqual(["4:5", "4:6", "5:6", "6:5", "6:6"]);
    expect([...moves.values()].every((move) => move.cost === 4 && move.path.length === 1 && move.finalFacing === "north")).toBe(true);
    expect(moves.has("5:4")).toBe(false);
    expect(moves.has("4:4")).toBe(false);
    expect(moves.has("6:4")).toBe(false);
  });

  it("does not offer sidestep and backstep through blocked cells or edges", () => {
    const origin = { x: 5, y: 5 };
    const moves = sidestepAndBackstepMoves({
      width: 10,
      height: 10,
      origin,
      facing: "north",
      allowance: 4,
      blockedCells: new Set(["4:5"]),
      blockedEdges: new Set([tacticalMovementEdgeKey(origin, { x: 6, y: 5 })]),
    });

    expect(moves.has("4:5")).toBe(false);
    expect(moves.has("6:5")).toBe(false);
    expect(moves.has("5:6")).toBe(true);
  });

  it("adds AHL active-occupant congestion to movement and enforces the four-character limit", () => {
    const congested = reachableOpenMapMovement({
      width: 10,
      height: 10,
      origin: { x: 5, y: 5 },
      facing: "south",
      allowance: 6,
      trotting: false,
      activeOccupantsByCell: new Map([["5:6", 2]]),
    });
    expect(congested.get("5:6")).toMatchObject({ cost: 4, costBreakdown: ["congestion +2"] });

    const full = reachableOpenMapMovement({
      width: 10,
      height: 10,
      origin: { x: 5, y: 5 },
      facing: "south",
      allowance: 6,
      trotting: false,
      activeOccupantsByCell: new Map([["5:6", 4]]),
    });
    expect(full.has("5:6")).toBe(false);
  });

  it("adds congestion to the fixed AHL sidestep and backstep cost", () => {
    const moves = sidestepAndBackstepMoves({
      width: 10,
      height: 10,
      origin: { x: 5, y: 5 },
      facing: "north",
      allowance: 5,
      activeOccupantsByCell: new Map([["5:6", 1]]),
    });
    expect(moves.get("5:6")).toMatchObject({ cost: 5, costBreakdown: ["congestion +1"], finalFacing: "north" });
  });

  it("combines intact targets into smooth visual runs with clean corner joins", () => {
    const room = createControlRoom({ id: "bridge", origin: { x: 10, y: 20 }, terminal: { kind: "navigation", label: "Helm" } });
    const runs = tacticalWallVisualRuns(room.objects);
    expect(runs).toHaveLength(8);
    expect(runs.every((run) => run.segmentIds.length === 4)).toBe(true);
    expect(tacticalWallCornerPoints(room.objects)).toEqual(expect.arrayContaining([
      { x: 10, y: 20 }, { x: 19, y: 20 }, { x: 10, y: 29 }, { x: 19, y: 29 },
    ]));
    expect(tacticalWallCornerPoints(room.objects)).toHaveLength(4);
  });
});
