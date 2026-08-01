import {
  tacticalCirclePortalPlacementCandidate,
  tacticalCirclePortalRepositionCandidate,
  tacticalCirclePrimitiveOutline,
  tacticalCircleWallBoundary,
} from "../tacticalTerrainPrimitives";

describe("tactical terrain primitives", () => {
  it("converts a circle into a continuous closed quadratic outline", () => {
    const segments = tacticalCirclePrimitiveOutline({
      center: { x: 10.25, y: 8.5 },
      radius: 3.25,
    });

    expect(segments).toHaveLength(8);
    expect(segments[0].from).toEqual({ x: 13.5, y: 8.5 });
    expect(segments.at(-1)?.to).toEqual(segments[0].from);
    segments.forEach((segment, index) => {
      expect(segment.kind).toBe("quadratic");
      expect(segment.to).toEqual(segments[(index + 1) % segments.length].from);
    });
  });

  it("snaps portals to a circle and cuts a one-unit opening from its wall", () => {
    const circle = {
      id: "circle-wall",
      shape: "circle" as const,
      center: { x: 10, y: 10 },
      radius: 3,
      terrainType: "wall" as const,
      portals: [{
        id: "circle-door",
        kind: "sliding-door" as const,
        position: 0,
      }],
    };
    const candidate = tacticalCirclePortalPlacementCandidate(
      [circle],
      { x: 13.2, y: 10.1 },
      "iris-valve",
    );
    const boundary = tacticalCircleWallBoundary(circle);

    expect(candidate).toMatchObject({
      wallId: "circle-wall",
      available: false,
    });
    expect(boundary.portals).toHaveLength(1);
    expect(Math.hypot(
      boundary.portals[0].to.x - boundary.portals[0].from.x,
      boundary.portals[0].to.y - boundary.portals[0].from.y,
    )).toBeCloseTo(1, 2);
    expect(boundary.walls.some((wall) =>
      Math.abs((wall.from.x + wall.to.x) / 2 - 13) < 0.01
      && Math.abs((wall.from.y + wall.to.y) / 2 - 10) < 0.1)).toBe(false);
  });

  it("repositions a circle portal while ignoring its current opening", () => {
    const circle = {
      id: "circle-wall",
      shape: "circle" as const,
      center: { x: 10, y: 10 },
      radius: 3,
      terrainType: "wall" as const,
      portals: [{
        id: "circle-door",
        kind: "sliding-door" as const,
        position: 0,
      }],
    };

    expect(tacticalCirclePortalRepositionCandidate(
      [circle],
      "circle-wall",
      "circle-door",
      { x: 10, y: 7 },
    )).toMatchObject({
      wallId: "circle-wall",
      position: 0.75,
      available: true,
    });
  });
});
