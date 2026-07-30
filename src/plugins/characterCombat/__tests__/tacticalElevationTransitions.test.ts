import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
} from "../tacticalScenarioDefinitions";
import {
  tacticalElevationEdgeCandidateAt,
  tacticalElevationEdgeCandidates,
  tacticalElevationEdgeKey,
  tacticalNearestElevationEdgeCandidate,
  tacticalRampPlacementCandidate,
  tacticalRampPlacementPreview,
} from "../tacticalElevationTransitions";

const raisedAreaDefinition = () => {
  const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
  definition.terrainPlacements = [];
  definition.drawnRaisedAreas = [{
    id: "edge-test-platform",
    segments: [
      { kind: "line", from: { x: 10, y: 10 }, to: { x: 13, y: 10 } },
      { kind: "line", from: { x: 13, y: 10 }, to: { x: 13, y: 13 } },
      { kind: "line", from: { x: 13, y: 13 }, to: { x: 10, y: 13 } },
      { kind: "line", from: { x: 10, y: 13 }, to: { x: 10, y: 10 } },
    ],
  }];
  definition.elevationTransitions = [];
  return definition;
};

describe("tactical elevation transition edge candidates", () => {
  it.each([
    {
      label: "west",
      pointer: { x: 9, y: 11, edgeRotation: 90 as const },
      lower: { x: 9, y: 11 },
      upper: { x: 10, y: 11 },
      edge: { from: { x: 10, y: 11 }, to: { x: 10, y: 12 } },
    },
    {
      label: "east",
      pointer: { x: 13, y: 11, edgeRotation: 270 as const },
      lower: { x: 13, y: 11 },
      upper: { x: 12, y: 11 },
      edge: { from: { x: 13, y: 11 }, to: { x: 13, y: 12 } },
    },
    {
      label: "north",
      pointer: { x: 11, y: 9, edgeRotation: 180 as const },
      lower: { x: 11, y: 9 },
      upper: { x: 11, y: 10 },
      edge: { from: { x: 11, y: 10 }, to: { x: 12, y: 10 } },
    },
    {
      label: "south",
      pointer: { x: 11, y: 13, edgeRotation: 0 as const },
      lower: { x: 11, y: 13 },
      upper: { x: 11, y: 12 },
      edge: { from: { x: 11, y: 13 }, to: { x: 12, y: 13 } },
    },
  ])("provides lower, upper, and preview geometry on the $label edge", ({ pointer, lower, upper, edge }) => {
    const candidate = tacticalElevationEdgeCandidateAt(
      tacticalElevationEdgeCandidates(raisedAreaDefinition()),
      pointer,
    );

    expect(candidate).toMatchObject({
      lower,
      upper,
      lowerLevel: 0,
      upperLevel: 1,
      edge,
    });
  });

  it("does not offer an edge already occupied by another elevation transition", () => {
    const definition = raisedAreaDefinition();
    const lower = { x: 9, y: 11 };
    const upper = { x: 10, y: 11 };
    definition.elevationTransitions = [{
      id: "occupied-ladder",
      kind: "ladder",
      lower,
      upper,
    }];

    const candidates = tacticalElevationEdgeCandidates(definition);

    expect(candidates.some((candidate) =>
      candidate.key === tacticalElevationEdgeKey(lower, upper))).toBe(false);
    expect(tacticalElevationEdgeCandidateAt(candidates, {
      ...lower,
      edgeRotation: 90,
    })).toBeNull();
  });

  it("snaps precise pointer positions to a nearby valid edge but not a distant edge", () => {
    const candidates = tacticalElevationEdgeCandidates(raisedAreaDefinition());

    expect(tacticalNearestElevationEdgeCandidate(candidates, {
      x: 9,
      y: 11,
      edgeRotation: 0,
      mapX: 9.62,
      mapY: 11.4,
    })).toMatchObject({
      lower: { x: 9, y: 11 },
      upper: { x: 10, y: 11 },
    });
    expect(tacticalNearestElevationEdgeCandidate(candidates, {
      x: 0,
      y: 0,
      edgeRotation: 0,
      mapX: 0.5,
      mapY: 0.5,
    })).toBeNull();
  });

  it("previews and creates a straight ramp with a minimum two-square run", () => {
    const definition = raisedAreaDefinition();
    const edge = tacticalElevationEdgeCandidateAt(
      tacticalElevationEdgeCandidates(definition),
      { x: 9, y: 11, edgeRotation: 90 },
    )!;

    expect(tacticalRampPlacementPreview(definition, edge, {
      x: 9,
      y: 11,
      mapX: 9.5,
      mapY: 11.5,
    })).toMatchObject({
      valid: false,
      error: "A ramp must extend at least 2 squares from the platform.",
    });

    const preview = tacticalRampPlacementPreview(definition, edge, {
      x: 8,
      y: 11,
      mapX: 8.5,
      mapY: 11.5,
    });
    expect(preview).toMatchObject({
      valid: true,
      lower: { x: 8, y: 11 },
      upper: { x: 10, y: 11 },
      path: [{ x: 8, y: 11 }, { x: 9, y: 11 }, { x: 10, y: 11 }],
    });

    const candidate = tacticalRampPlacementCandidate(definition, edge, {
      x: 8,
      y: 11,
      mapX: 8.5,
      mapY: 11.5,
    });
    expect(candidate.transition).toMatchObject({
      id: "ramp-1",
      kind: "ramp",
      lower: { x: 8, y: 11 },
      upper: { x: 10, y: 11 },
      path: [{ x: 8, y: 11 }, { x: 9, y: 11 }, { x: 10, y: 11 }],
    });
  });

  it("rejects a ramp draft that bends away from the selected edge direction", () => {
    const definition = raisedAreaDefinition();
    const edge = tacticalElevationEdgeCandidateAt(
      tacticalElevationEdgeCandidates(definition),
      { x: 9, y: 11, edgeRotation: 90 },
    )!;

    expect(tacticalRampPlacementPreview(definition, edge, {
      x: 8,
      y: 13,
      mapX: 8.5,
      mapY: 13.5,
    })).toMatchObject({
      valid: false,
      error: "A ramp must extend straight outward from the selected platform edge.",
    });
  });
});
