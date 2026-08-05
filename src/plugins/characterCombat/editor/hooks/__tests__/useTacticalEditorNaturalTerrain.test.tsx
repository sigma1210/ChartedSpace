/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
  type TacticalNaturalTerrainPlacement,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import {
  BUSH_TOOL_ID,
  ROCK_TOOL_ID,
  TREE_TOOL_ID,
} from "../../lib/tacticalEditorSupport";
import { useTacticalEditorNaturalTerrain } from "../useTacticalEditorNaturalTerrain";

const emptyDraft = (): TacticalScenarioDefinitionFile => ({
  ...cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition),
  terrainPlacements: [],
  drawnWalls: [],
  drawnAreas: [],
  drawnRaisedAreas: [],
  drawnTerrainRegions: [],
  drawnTerrainPrimitives: [],
  naturalTerrainPlacements: [],
  elevationTransitions: [],
  fireCells: [],
  enemyPlacements: [],
});

const naturalTerrain = (
  update: Partial<TacticalNaturalTerrainPlacement> = {},
): TacticalNaturalTerrainPlacement => ({
  id: "bush-1",
  kind: "bush",
  position: { x: 4, y: 4 },
  radius: 0.5,
  ...update,
});

const renderNaturalTerrain = ({
  initialDraft = emptyDraft(),
  activeDrawingTool = null,
  initialSelectedId = null,
}: {
  initialDraft?: TacticalScenarioDefinitionFile;
  activeDrawingTool?: string | null;
  initialSelectedId?: string | null;
} = {}) => {
  const showObjectProperties = jest.fn();
  const setSelectedPlacementId = jest.fn();
  const setSelectedEnemyId = jest.fn();
  const hook = renderHook(() => {
    const [draft, setDraft] = useState(initialDraft);
    const [selectedNaturalTerrainId, setSelectedNaturalTerrainId] = useState(initialSelectedId);
    const [dragNaturalTerrain, setDragNaturalTerrain] = useState<{
      id: string;
      kind: "position" | "radius";
      offset?: { x: number; y: number };
    } | null>(null);
    const [placementError, setPlacementError] = useState<string | null>(null);
    return {
      ...useTacticalEditorNaturalTerrain({
        draft,
        setDraft,
        activeDrawingTool,
        selectedNaturalTerrainId,
        dragNaturalTerrain,
        setSelectedNaturalTerrainId,
        setSelectedPlacementId,
        setSelectedEnemyId,
        setDragNaturalTerrain,
        setPlacementError,
        showObjectProperties,
      }),
      draft,
      selectedNaturalTerrainId,
      dragNaturalTerrain,
      placementError,
    };
  });
  return {
    ...hook,
    showObjectProperties,
    setSelectedPlacementId,
    setSelectedEnemyId,
  };
};

describe("useTacticalEditorNaturalTerrain", () => {
  it.each([
    [TREE_TOOL_ID, "tree", 1.5],
    [BUSH_TOOL_ID, "bush", 0.5],
    [ROCK_TOOL_ID, "rock", 0.5],
  ] as const)("places %s terrain", (toolId, kind, radius) => {
    const { result, showObjectProperties, setSelectedPlacementId, setSelectedEnemyId } = renderNaturalTerrain({
      activeDrawingTool: toolId,
    });

    act(() => result.current.placeNaturalTerrain({ x: 12, y: 12 }));

    expect(result.current.draft.naturalTerrainPlacements).toEqual([expect.objectContaining({
      id: `${kind}-1`,
      kind,
      position: { x: 12, y: 12 },
      radius,
    })]);
    expect(result.current.selectedNaturalTerrainId).toBe(`${kind}-1`);
    expect(showObjectProperties).toHaveBeenCalledTimes(1);
    expect(setSelectedPlacementId).toHaveBeenCalledWith(null);
    expect(setSelectedEnemyId).toHaveBeenCalledWith(null);
  });

  it("rejects a tree that overlaps an enemy", () => {
    const draft = {
      ...emptyDraft(),
      enemyPlacements: [{
        id: "enemy-1",
        type: "gang-member" as const,
        name: "Enemy",
        position: { x: 10, y: 10 },
        facing: "north" as const,
        avatarPath: "/generated/avatars/enemy.png",
      }],
    };
    const { result } = renderNaturalTerrain({
      initialDraft: draft,
      activeDrawingTool: TREE_TOOL_ID,
    });

    act(() => result.current.placeNaturalTerrain({ x: 10, y: 10 }));

    expect(result.current.draft.naturalTerrainPlacements).toEqual([]);
    expect(result.current.placementError).toBe("Tree tree-1 cannot overlap an enemy.");
  });

  it("moves and resizes natural terrain through drag commands", () => {
    const { result } = renderNaturalTerrain({
      initialDraft: { ...emptyDraft(), naturalTerrainPlacements: [naturalTerrain()] },
      initialSelectedId: "bush-1",
    });

    act(() => result.current.beginNaturalTerrainDrag("bush-1", "position", { x: 4.5, y: 4.5 }));
    act(() => result.current.updateNaturalTerrainDrag({ x: 7.5, y: 8.5 }));
    expect(result.current.selectedNaturalTerrain?.position).toEqual({ x: 7, y: 8 });
    act(() => result.current.finishNaturalTerrainDrag());

    act(() => result.current.beginNaturalTerrainDrag("bush-1", "radius"));
    act(() => result.current.updateNaturalTerrainDrag({ x: 10.5, y: 8.5 }));
    expect(result.current.selectedNaturalTerrain?.radius).toBe(3);
  });

  it("updates radius, reports an invalid radius, and deletes the selection", () => {
    const { result } = renderNaturalTerrain({
      initialDraft: { ...emptyDraft(), naturalTerrainPlacements: [naturalTerrain()] },
      initialSelectedId: "bush-1",
    });

    act(() => result.current.updateSelectedNaturalTerrainRadius(2));
    expect(result.current.selectedNaturalTerrain?.radius).toBe(2);
    act(() => result.current.updateSelectedNaturalTerrainRadius(-1));
    expect(result.current.selectedNaturalTerrain?.radius).toBe(2);
    expect(result.current.placementError).toBeTruthy();
    act(() => result.current.deleteSelectedNaturalTerrain());
    expect(result.current.draft.naturalTerrainPlacements).toEqual([]);
    expect(result.current.selectedNaturalTerrainId).toBeNull();
  });

  it("selects terrain and opens Object Properties", () => {
    const { result, showObjectProperties } = renderNaturalTerrain({
      initialDraft: { ...emptyDraft(), naturalTerrainPlacements: [naturalTerrain()] },
    });

    act(() => result.current.selectNaturalTerrain("bush-1"));

    expect(result.current.selectedNaturalTerrainId).toBe("bush-1");
    expect(showObjectProperties).toHaveBeenCalledTimes(1);
  });
});
