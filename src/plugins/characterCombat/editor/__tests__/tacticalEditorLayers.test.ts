import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import {
  moveTacticalEditorLayerObject,
  moveTacticalEditorLayerObjectInDefinition,
  tacticalEditorLayerGroups,
  tacticalEditorLayerKey,
  tacticalEditorVisibleDefinition,
} from "../tacticalEditorLayers";

const reorderDefinition = (): TacticalScenarioDefinitionFile => {
  const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
  const segments = [
    { kind: "line" as const, from: { x: 1, y: 1 }, to: { x: 3, y: 1 } },
    { kind: "line" as const, from: { x: 3, y: 1 }, to: { x: 2, y: 3 } },
    { kind: "line" as const, from: { x: 2, y: 3 }, to: { x: 1, y: 1 } },
  ];
  definition.terrainPlacements = ["placement-a", "placement-b"].map((id, index) => ({
    id,
    terrainDefinitionId: "console-1x1",
    origin: { x: index, y: 0 },
    rotation: 0,
  }));
  definition.drawnAreas = ["area-a", "area-b"].map((id) => ({
    id,
    segments,
    surface: "none",
    elevation: 0,
    boundary: "none",
  }));
  definition.enemyPlacements = ["enemy-a", "enemy-b"].map((id, index) => ({
    id,
    type: "gang-member",
    name: id,
    position: { x: index, y: 1 },
    avatarPath: `/avatars/${id}.png`,
  }));
  definition.drawnWalls = ["wall-a", "wall-b"].map((id, index) => ({
    id,
    from: { x: index, y: 2 },
    to: { x: index + 1, y: 2 },
  }));
  definition.drawnRaisedAreas = ["raised-a", "raised-b"].map((id) => ({ id, segments }));
  definition.drawnTerrainRegions = ["region-a", "region-b"].map((id) => ({
    id,
    kind: "sand",
    segments,
  }));
  definition.drawnTerrainPrimitives = ["primitive-a", "primitive-b"].map((id, index) => ({
    id,
    shape: "circle",
    center: { x: 10 + index, y: 10 },
    radius: 1,
    terrainType: "wall",
  }));
  definition.naturalTerrainPlacements = ["natural-a", "natural-b"].map((id, index) => ({
    id,
    kind: "tree",
    position: { x: index, y: 3 },
    radius: 1,
  }));
  definition.elevationTransitions = ["transition-a", "transition-b"].map((id, index) => ({
    id,
    kind: "stairs",
    lower: { x: index, y: 4 },
    upper: { x: index + 1, y: 4 },
  }));
  definition.fireCells = [{ x: 1, y: 5 }, { x: 2, y: 5 }];
  return definition;
};

describe("tactical editor layers", () => {
  it("adapts scenario objects into stable CAD-style groups", () => {
    const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    definition.drawnTerrainRegions = [{
      id: "sand-court",
      kind: "sand",
      segments: [
        { kind: "line", from: { x: 1, y: 1 }, to: { x: 3, y: 1 } },
        { kind: "line", from: { x: 3, y: 1 }, to: { x: 3, y: 3 } },
        { kind: "line", from: { x: 3, y: 3 }, to: { x: 1, y: 3 } },
        { kind: "line", from: { x: 1, y: 3 }, to: { x: 1, y: 1 } },
      ],
    }];
    definition.drawnWalls = [{
      id: "north-wall",
      from: { x: 1, y: 1 },
      to: { x: 4, y: 1 },
      portals: [{ id: "north-door", kind: "sliding-door", position: 0.5 }],
    }];
    definition.drawnAreas = [{
      id: "room",
      segments: [
        { kind: "line", from: { x: 8, y: 8 }, to: { x: 12, y: 8 } },
        { kind: "line", from: { x: 12, y: 8 }, to: { x: 12, y: 12 } },
        { kind: "line", from: { x: 12, y: 12 }, to: { x: 8, y: 12 } },
        { kind: "line", from: { x: 8, y: 12 }, to: { x: 8, y: 8 } },
      ],
      surface: "none",
      elevation: 0,
      boundary: "wall",
      portals: [{ id: "room-iris", kind: "iris-valve", position: 0.25 }],
    }];
    definition.fireCells = [{ x: 5, y: 6 }];

    const groups = tacticalEditorLayerGroups(definition);
    expect(groups.map((group) => group.id)).toEqual([
      "areas",
      "walls",
      "elevation",
      "terrain",
      "fixtures",
      "combatants",
      "effects",
    ]);
    expect(groups.find((group) => group.id === "areas")?.objects).toContainEqual(expect.objectContaining({
      key: tacticalEditorLayerKey("terrain-region", "sand-court"),
      detail: "Sand · 4 segments",
    }));
    expect(groups.find((group) => group.id === "areas")?.objects).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: tacticalEditorLayerKey("area", "room") }),
      expect.objectContaining({ key: tacticalEditorLayerKey("portal", "room-iris"), parentKey: tacticalEditorLayerKey("area", "room") }),
    ]));
    expect(groups.find((group) => group.id === "walls")?.objects).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: tacticalEditorLayerKey("wall", "north-wall") }),
      expect.objectContaining({ key: tacticalEditorLayerKey("portal", "north-door"), parentKey: tacticalEditorLayerKey("wall", "north-wall") }),
    ]));
    expect(groups.find((group) => group.id === "effects")?.objects[0]?.key)
      .toBe(tacticalEditorLayerKey("fire", "5:6"));
  });

  it("moves objects one layer at a time without mutating the source", () => {
    const source = ["back", "middle", "front"];
    expect(moveTacticalEditorLayerObject(source, 1, 1)).toEqual(["back", "front", "middle"]);
    expect(moveTacticalEditorLayerObject(source, 0, -1)).toEqual(source);
    expect(source).toEqual(["back", "middle", "front"]);
  });

  it.each([
    ["terrain-placement", "placement-b", (definition: TacticalScenarioDefinitionFile) => definition.terrainPlacements.map((item) => item.id)],
    ["area", "area-b", (definition: TacticalScenarioDefinitionFile) => definition.drawnAreas?.map((item) => item.id)],
    ["enemy", "enemy-b", (definition: TacticalScenarioDefinitionFile) => definition.enemyPlacements.map((item) => item.id)],
    ["wall", "wall-b", (definition: TacticalScenarioDefinitionFile) => definition.drawnWalls?.map((item) => item.id)],
    ["raised-area", "raised-b", (definition: TacticalScenarioDefinitionFile) => definition.drawnRaisedAreas?.map((item) => item.id)],
    ["terrain-region", "region-b", (definition: TacticalScenarioDefinitionFile) => definition.drawnTerrainRegions?.map((item) => item.id)],
    ["primitive", "primitive-b", (definition: TacticalScenarioDefinitionFile) => definition.drawnTerrainPrimitives?.map((item) => item.id)],
    ["natural-terrain", "natural-b", (definition: TacticalScenarioDefinitionFile) => definition.naturalTerrainPlacements?.map((item) => item.id)],
    ["elevation-transition", "transition-b", (definition: TacticalScenarioDefinitionFile) => definition.elevationTransitions?.map((item) => item.id)],
    ["fire", "2:5", (definition: TacticalScenarioDefinitionFile) => definition.fireCells.map((point) => `${point.x}:${point.y}`)],
  ] as const)("reorders the %s definition collection", (kind, id, readIds) => {
    const source = reorderDefinition();

    const reordered = moveTacticalEditorLayerObjectInDefinition(source, { kind, id }, -1);

    expect(readIds(reordered)).toEqual([id, readIds(source)?.[0]]);
    expect(readIds(source)?.[1]).toBe(id);
  });

  it("leaves boundary and missing objects in place", () => {
    const source = reorderDefinition();

    const boundary = moveTacticalEditorLayerObjectInDefinition(
      source,
      { kind: "terrain-placement", id: "placement-a" },
      -1,
    );
    const missing = moveTacticalEditorLayerObjectInDefinition(
      source,
      { kind: "wall", id: "missing-wall" },
      1,
    );

    expect(boundary.terrainPlacements.map((item) => item.id)).toEqual(["placement-a", "placement-b"]);
    expect(missing.drawnWalls?.map((item) => item.id)).toEqual(["wall-a", "wall-b"]);
  });

  it("ignores non-reorderable layer objects", () => {
    const source = reorderDefinition();

    expect(moveTacticalEditorLayerObjectInDefinition(
      source,
      { kind: "portal", id: "door-1" },
      1,
    )).toBe(source);
  });

  it("builds a non-persistent preview with hidden objects removed", () => {
    const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    definition.fireCells = [{ x: 1, y: 1 }, { x: 2, y: 2 }];
    const preview = tacticalEditorVisibleDefinition(definition, new Set([
      tacticalEditorLayerKey("fire", "1:1"),
    ]));

    expect(preview.fireCells).toEqual([{ x: 2, y: 2 }]);
    expect(definition.fireCells).toEqual([{ x: 1, y: 1 }, { x: 2, y: 2 }]);
  });

  it("can hide an area portal without hiding its parent boundary", () => {
    const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    definition.drawnAreas = [{
      id: "room",
      segments: [
        { kind: "line", from: { x: 8, y: 8 }, to: { x: 12, y: 8 } },
        { kind: "line", from: { x: 12, y: 8 }, to: { x: 12, y: 12 } },
        { kind: "line", from: { x: 12, y: 12 }, to: { x: 8, y: 12 } },
        { kind: "line", from: { x: 8, y: 12 }, to: { x: 8, y: 8 } },
      ],
      surface: "none",
      elevation: 0,
      boundary: "wall",
      portals: [{ id: "room-door", kind: "sliding-door", position: 0.25 }],
    }];

    const preview = tacticalEditorVisibleDefinition(definition, new Set([
      tacticalEditorLayerKey("portal", "room-door"),
    ]));
    expect(preview.drawnAreas).toHaveLength(1);
    expect(preview.drawnAreas?.[0]?.portals).toEqual([]);
    expect(definition.drawnAreas[0]?.portals).toHaveLength(1);
  });
});
