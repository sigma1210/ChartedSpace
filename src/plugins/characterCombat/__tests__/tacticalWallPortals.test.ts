import { tacticalWallPortalPlacementCandidate } from "../tacticalWallPortals";

describe("tactical wall portal placement", () => {
  it("snaps to the nearest one-unit slot on an angled wall", () => {
    const candidate = tacticalWallPortalPlacementCandidate(
      [{ id: "wall-1", from: { x: 2, y: 2 }, to: { x: 10, y: 6 } }],
      { x: 6.1, y: 3.9 },
      "sliding-door",
    );

    expect(candidate).toMatchObject({ wallId: "wall-1", kind: "sliding-door", available: true });
    expect(candidate ? Math.hypot(
      candidate.edge.to.x - candidate.edge.from.x,
      candidate.edge.to.y - candidate.edge.from.y,
    ) : 0).toBeCloseTo(1);
  });

  it("chooses the nearest open slot and reports when no slot remains", () => {
    const wall = {
      id: "wall-1",
      from: { x: 0, y: 0 },
      to: { x: 2, y: 0 },
      portals: [{ id: "door-1", kind: "sliding-door" as const, position: 0.25 }],
    };
    expect(tacticalWallPortalPlacementCandidate([wall], { x: 0.5, y: 0.1 }, "iris-valve")).toMatchObject({
      available: true,
      position: 0.75,
    });
    expect(tacticalWallPortalPlacementCandidate([
      { ...wall, portals: [...wall.portals, { id: "door-2", kind: "iris-valve", position: 0.75 }] },
    ], { x: 1.5, y: 0.1 }, "sliding-door")).toMatchObject({ available: false });
  });

  it("requires the pointer to be near a drawn wall", () => {
    expect(tacticalWallPortalPlacementCandidate(
      [{ id: "wall-1", from: { x: 0, y: 0 }, to: { x: 4, y: 0 } }],
      { x: 2, y: 3 },
      "sliding-door",
    )).toBeNull();
  });
});
