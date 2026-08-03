import {
  removeConsolePlacementOperations,
  removeDrawnRaisedAreaCandidate,
  tacticalElevationTransitionPlacementCandidate,
  upgradeLegacyTacticalEditorAreas,
} from "../tacticalEditorDocument";
import {
  cloneTacticalConsoleVictoryDefinition,
  defaultTacticalConsoleVictoryDefinition,
} from "@/plugins/characterCombat/tacticalConsoleVictory";
import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
  resolveTacticalScenarioTerrain,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";

describe("tacticalEditorDocument", () => {
  it("upgrades matching legacy surface and elevation outlines into one editable area", () => {
    const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    const segments = [
      { kind: "line" as const, from: { x: 2, y: 2 }, to: { x: 6, y: 2 } },
      { kind: "line" as const, from: { x: 6, y: 2 }, to: { x: 6, y: 6 } },
      { kind: "line" as const, from: { x: 6, y: 6 }, to: { x: 2, y: 6 } },
      { kind: "line" as const, from: { x: 2, y: 6 }, to: { x: 2, y: 2 } },
    ];
    definition.drawnAreas = [];
    definition.drawnRaisedAreas = [{ id: "legacy-hill", segments }];
    definition.drawnTerrainRegions = [{ id: "legacy-sand", kind: "sand", segments }];

    const upgraded = upgradeLegacyTacticalEditorAreas(definition);

    expect(upgraded.drawnAreas).toEqual([expect.objectContaining({
      id: "legacy-hill",
      surface: "sand",
      elevation: 1,
      boundary: "none",
    })]);
    expect(upgraded.drawnRaisedAreas).toEqual([]);
    expect(upgraded.drawnTerrainRegions).toEqual([]);
  });

  it("upgrades legacy circles without portals into editable closed areas", () => {
    const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    definition.drawnTerrainPrimitives = [
      { id: "legacy-wall-circle", shape: "circle", center: { x: 10, y: 10 }, radius: 3, terrainType: "wall" },
      { id: "legacy-raised-circle", shape: "circle", center: { x: 20, y: 10 }, radius: 3, terrainType: "raised-area" },
      {
        id: "legacy-portal-circle",
        shape: "circle",
        center: { x: 30, y: 10 },
        radius: 3,
        terrainType: "wall",
        portals: [{ id: "legacy-door", kind: "sliding-door", position: 0 }],
      },
    ];

    const upgraded = upgradeLegacyTacticalEditorAreas(definition);

    expect(upgraded.drawnAreas).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "legacy-wall-circle", geometry: { kind: "circle", center: { x: 10, y: 10 }, radius: 3 }, surface: "none", elevation: 0, boundary: "wall" }),
      expect.objectContaining({ id: "legacy-raised-circle", geometry: { kind: "circle", center: { x: 20, y: 10 }, radius: 3 }, surface: "none", elevation: 1, boundary: "none" }),
    ]));
    expect(upgraded.drawnAreas?.find((area) => area.id === "legacy-wall-circle")?.segments).toHaveLength(8);
    expect(upgraded.drawnTerrainPrimitives).toEqual([
      expect.objectContaining({ id: "legacy-portal-circle", portals: [expect.objectContaining({ id: "legacy-door" })] }),
    ]);

    const savedAndReloaded = upgradeLegacyTacticalEditorAreas(
      cloneTacticalScenarioDefinition(upgraded),
    );
    const reloadedCircle = savedAndReloaded.drawnAreas?.find(
      (area) => area.id === "legacy-wall-circle",
    );
    expect(reloadedCircle?.geometry).toEqual({
      kind: "circle",
      center: { x: 10, y: 10 },
      radius: 3,
    });
    expect(reloadedCircle?.segments[0]?.from).toEqual({ x: 13, y: 10 });
  });

  it.each(["stairs", "ladder"] as const)("places a %s across the selected edge between adjacent levels", (kind) => {
    const definition = raisedPlatformDefinition("transition-platform");
    const candidate = tacticalElevationTransitionPlacementCandidate(
      definition,
      kind,
      {
        x: 9,
        y: 11,
        edgeRotation: 90,
        mapX: 9.6,
        mapY: 11.5,
      },
    );

    expect(candidate.transition.kind).toBe(kind);
    expect(candidate.definition.elevationTransitions).toContainEqual(candidate.transition);
    expect(resolveTacticalScenarioTerrain(candidate.definition).elevationTransitions).toHaveLength(1);
  });

  it("snaps stairs to a nearby highlighted edge even when the raw cell edge is not valid", () => {
    const definition = raisedPlatformDefinition("snap-platform");

    const candidate = tacticalElevationTransitionPlacementCandidate(definition, "stairs", {
      x: 9,
      y: 11,
      edgeRotation: 0,
      mapX: 9.62,
      mapY: 11.4,
    });

    expect(candidate.transition).toMatchObject({
      lower: { x: 9, y: 11 },
      upper: { x: 10, y: 11 },
    });
  });

  it("deletes a drawn raised area and any transition that depended on it", () => {
    const definition = raisedPlatformDefinition("raised-area-to-delete");
    const withLadder = tacticalElevationTransitionPlacementCandidate(
      definition,
      "ladder",
      { x: 9, y: 11, edgeRotation: 90 },
    ).definition;

    const removed = removeDrawnRaisedAreaCandidate(withLadder, "raised-area-to-delete");

    expect(removed.definition.drawnRaisedAreas).toEqual([]);
    expect(removed.definition.elevationTransitions).toEqual([]);
    expect(removed.removedTransitionIds).toEqual(["ladder-1"]);
    expect(() => resolveTacticalScenarioTerrain(removed.definition)).not.toThrow();
  });

  it("removes console operations when their terrain placement is deleted", () => {
    const definition = cloneTacticalConsoleVictoryDefinition(defaultTacticalConsoleVictoryDefinition);

    const updated = removeConsolePlacementOperations(definition, "control-room-alpha");

    expect(updated.operations).toEqual([]);
  });
});

const raisedPlatformDefinition = (id: string) => {
  const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
  definition.terrainPlacements = [];
  definition.drawnRaisedAreas = [{
    id,
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
