import { cloneTacticalScenarioDefinition, defaultTacticalScenarioDefinition } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import {
  moveTacticalEditorLayerObject,
  tacticalEditorLayerGroups,
  tacticalEditorLayerKey,
  tacticalEditorVisibleDefinition,
} from "../tacticalEditorLayers";

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
