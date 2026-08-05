/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
  type TacticalScenarioDefinitionFile,
  type TacticalTerrainPlacement,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { TacticalConsoleOperation } from "@/plugins/characterCombat/tacticalConsoleVictory";
import { useTacticalEditorTerrainPlacements } from "../useTacticalEditorTerrainPlacements";

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

const placement = (
  update: Partial<TacticalTerrainPlacement> = {},
): TacticalTerrainPlacement => ({
  id: "console-1",
  terrainDefinitionId: "console-1x1",
  origin: { x: 12, y: 12 },
  rotation: 0,
  ...update,
});

const operation: TacticalConsoleOperation = {
  id: "operation-1",
  consolePlacementId: "console-1",
  label: "Use console",
  prerequisites: { mode: "all", operationIds: [] },
  checks: [{ id: "check-1", skill: "Electronics", difficulty: "average", apCost: 1 }],
  result: { type: "victory" },
};

const renderTerrainPlacements = ({
  initialDraft = emptyDraft(),
  activeDrawingTool = null,
  initialSelectedId = null,
  consoleOperations = [],
}: {
  initialDraft?: TacticalScenarioDefinitionFile;
  activeDrawingTool?: string | null;
  initialSelectedId?: string | null;
  consoleOperations?: TacticalConsoleOperation[];
} = {}) => {
  const setSelectedEnemyId = jest.fn();
  const removePlacementConsoleOperations = jest.fn();
  const showConsoleEditor = jest.fn();
  const hook = renderHook(() => {
    const [draft, setDraft] = useState(initialDraft);
    const [selectedPlacementId, setSelectedPlacementId] = useState(initialSelectedId);
    const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
    const [placementError, setPlacementError] = useState<string | null>(null);
    return {
      ...useTacticalEditorTerrainPlacements({
        draft,
        setDraft,
        activeDrawingTool,
        selectedPlacementId,
        consoleOperations,
        setSelectedPlacementId,
        setSelectedEnemyId,
        setSelectedOperationId,
        removePlacementConsoleOperations,
        showConsoleEditor,
        setPlacementError,
      }),
      draft,
      selectedPlacementId,
      selectedOperationId,
      placementError,
    };
  });
  return {
    ...hook,
    setSelectedEnemyId,
    removePlacementConsoleOperations,
    showConsoleEditor,
  };
};

describe("useTacticalEditorTerrainPlacements", () => {
  it("places an ordinary console and opens its editor", () => {
    const { result, setSelectedEnemyId, showConsoleEditor } = renderTerrainPlacements({
      activeDrawingTool: "console-1x1",
    });

    act(() => result.current.placeOrdinaryTerrain({ x: 12, y: 12 }));

    expect(result.current.draft.terrainPlacements).toEqual([expect.objectContaining({
      id: "console-1x1-1",
      terrainDefinitionId: "console-1x1",
      origin: { x: 12, y: 12 },
    })]);
    expect(result.current.selectedPlacementId).toBe("console-1x1-1");
    expect(setSelectedEnemyId).toHaveBeenCalledWith(null);
    expect(showConsoleEditor).toHaveBeenCalledTimes(1);
    expect(result.current.placementError).toBeNull();
  });

  it("rejects an ordinary placement outside the map", () => {
    const { result } = renderTerrainPlacements({ activeDrawingTool: "console-1x1" });

    act(() => result.current.placeOrdinaryTerrain({ x: -100, y: -100 }));

    expect(result.current.draft.terrainPlacements).toEqual([]);
    expect(result.current.placementError).toBeTruthy();
  });

  it("moves and rotates the selected placement", () => {
    const { result } = renderTerrainPlacements({
      initialDraft: { ...emptyDraft(), terrainPlacements: [placement()] },
      initialSelectedId: "console-1",
    });

    act(() => result.current.moveTerrain("console-1", { x: 16, y: 14 }));
    expect(result.current.selectedPlacement?.origin).toEqual({ x: 16, y: 14 });

    act(() => result.current.rotateSelectedPlacement());
    expect(result.current.selectedPlacement?.rotation).toBe(90);
  });

  it("updates the fill state of selected liquid hydrogen", () => {
    const hydrogen = placement({
      id: "hydrogen-1",
      terrainDefinitionId: "liquid-hydrogen-2x2",
      terrainSettings: { filled: false },
    });
    const { result } = renderTerrainPlacements({
      initialDraft: { ...emptyDraft(), terrainPlacements: [hydrogen] },
      initialSelectedId: "hydrogen-1",
    });

    act(() => result.current.updateSelectedLiquidHydrogen(true));

    expect(result.current.selectedIsLiquidHydrogen).toBe(true);
    expect(result.current.selectedPlacement?.terrainSettings).toEqual({ filled: true });
  });

  it("selects a console operation and removes it when deleting the placement", () => {
    const { result, showConsoleEditor, removePlacementConsoleOperations } = renderTerrainPlacements({
      initialDraft: { ...emptyDraft(), terrainPlacements: [placement()] },
      consoleOperations: [operation],
    });

    act(() => result.current.selectTerrainPlacement("console-1"));
    expect(result.current.selectedPlacementId).toBe("console-1");
    expect(result.current.selectedOperationId).toBe("operation-1");
    expect(showConsoleEditor).toHaveBeenCalledTimes(1);

    act(() => result.current.deleteSelectedPlacement());
    expect(result.current.draft.terrainPlacements).toEqual([]);
    expect(result.current.selectedPlacementId).toBeNull();
    expect(removePlacementConsoleOperations).toHaveBeenCalledWith("console-1");
  });
});
