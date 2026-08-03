import {
  tacticalAreaBoundaryPortalLayout,
  tacticalAreaBoundaryPortalPlacementCandidate,
  tacticalAreaBoundaryPortalRepositionCandidate,
} from "../tacticalAreaBoundaryPortals";
import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
  resolveTacticalScenarioTerrain,
  tacticalClosedAreaGeometrySegments,
  type TacticalDrawnArea,
} from "../tacticalScenarioDefinitions";

const rectangleArea = (portals: TacticalDrawnArea["portals"] = []): TacticalDrawnArea => ({
  id: "rectangle-area-1",
  geometry: { kind: "rectangle", x: 2, y: 2, width: 6, height: 4 },
  segments: tacticalClosedAreaGeometrySegments({ kind: "rectangle", x: 2, y: 2, width: 6, height: 4 }),
  surface: "none",
  elevation: 0,
  boundary: "wall",
  portals,
});

describe("area boundary portals", () => {
  it("places and cuts doors into rectangle boundary walls", () => {
    const candidate = tacticalAreaBoundaryPortalPlacementCandidate(
      [rectangleArea()],
      { x: 5.1, y: 2.1 },
      "sliding-door",
    );

    expect(candidate).toMatchObject({
      wallId: "rectangle-area-1",
      kind: "sliding-door",
      available: true,
    });
    const layout = tacticalAreaBoundaryPortalLayout(rectangleArea([{
      id: "rectangle-door",
      kind: "sliding-door",
      position: candidate!.position,
    }]));
    expect(layout.portals).toHaveLength(1);
    expect(Math.hypot(
      layout.portals[0]!.to.x - layout.portals[0]!.from.x,
      layout.portals[0]!.to.y - layout.portals[0]!.from.y,
    )).toBeCloseTo(1);
    expect(layout.walls.some((wall) =>
      Math.abs((wall.from.x + wall.to.x) / 2 - candidate!.center.x) < 0.1
      && Math.abs((wall.from.y + wall.to.y) / 2 - candidate!.center.y) < 0.1)).toBe(false);
  });

  it("supports an iris valve across the closing seam of a circle wall", () => {
    const area: TacticalDrawnArea = {
      id: "circle-area-1",
      geometry: { kind: "circle", center: { x: 10, y: 10 }, radius: 3 },
      segments: tacticalClosedAreaGeometrySegments({ kind: "circle", center: { x: 10, y: 10 }, radius: 3 }),
      surface: "none",
      elevation: 0,
      boundary: "wall",
    };
    const candidate = tacticalAreaBoundaryPortalPlacementCandidate([area], { x: 13.1, y: 10 }, "iris-valve");
    expect(candidate).toMatchObject({ wallId: "circle-area-1", position: 0, available: true });

    const layout = tacticalAreaBoundaryPortalLayout({
      ...area,
      portals: [{ id: "circle-iris", kind: "iris-valve", position: 0 }],
    });
    expect(layout.portals).toHaveLength(1);
    expect(layout.walls.every((wall) =>
      Math.hypot(wall.to.x - wall.from.x, wall.to.y - wall.from.y) > 0)).toBe(true);
  });

  it("places and repositions portals on curved Pen boundaries", () => {
    const area: TacticalDrawnArea = {
      id: "pen-area-1",
      segments: [
        { kind: "cubic", from: { x: 2, y: 6 }, control1: { x: 4, y: 2 }, control2: { x: 6, y: 2 }, to: { x: 8, y: 6 } },
        { kind: "line", from: { x: 8, y: 6 }, to: { x: 8, y: 10 } },
        { kind: "line", from: { x: 8, y: 10 }, to: { x: 2, y: 10 } },
        { kind: "line", from: { x: 2, y: 10 }, to: { x: 2, y: 6 } },
      ],
      surface: "none",
      elevation: 0,
      boundary: "wall",
    };
    const placement = tacticalAreaBoundaryPortalPlacementCandidate([area], { x: 5, y: 3 }, "sliding-door");
    expect(placement).toMatchObject({ wallId: "pen-area-1", available: true });

    const withDoor = { ...area, portals: [{ id: "pen-door", kind: "sliding-door" as const, position: placement!.position }] };
    const moved = tacticalAreaBoundaryPortalRepositionCandidate([withDoor], area.id, "pen-door", { x: 8, y: 8 });
    expect(moved).toMatchObject({ wallId: "pen-area-1", available: true });
    expect(moved!.position).not.toBeCloseTo(placement!.position);
  });

  it("reports a full boundary when every one-unit slot is occupied", () => {
    const small = rectangleArea(Array.from({ length: 20 }, (_, index) => ({
      id: `portal-${index}`,
      kind: "sliding-door" as const,
      position: index / 20,
    })));
    expect(tacticalAreaBoundaryPortalPlacementCandidate([small], { x: 5, y: 2 }, "iris-valve"))
      .toMatchObject({ available: false });
  });

  it("uses the owning area's elevation when a circular boundary borders mixed levels", () => {
    const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    const outerGeometry = { kind: "circle" as const, center: { x: 20, y: 30 }, radius: 2.8284 };
    const innerGeometry = { kind: "circle" as const, center: { x: 20, y: 30 }, radius: 2 };
    definition.drawnAreas = [{
      id: "outer-rise",
      geometry: outerGeometry,
      segments: tacticalClosedAreaGeometrySegments(outerGeometry),
      surface: "sand",
      elevation: 0.5,
      boundary: "none",
    }, {
      id: "inner-room",
      geometry: innerGeometry,
      segments: tacticalClosedAreaGeometrySegments(innerGeometry),
      surface: "sand",
      elevation: 0,
      boundary: "wall",
    }];

    const resolved = resolveTacticalScenarioTerrain(definition);
    const boundaryWalls = resolved.terrainObjects.filter((object) =>
      object.kind === "wall" && object.id.startsWith("inner-room:boundary:"));
    expect(boundaryWalls.length).toBeGreaterThan(0);
    expect(boundaryWalls.every((wall) => wall.kind === "wall" && wall.elevationLevel === 0)).toBe(true);
  });
});
