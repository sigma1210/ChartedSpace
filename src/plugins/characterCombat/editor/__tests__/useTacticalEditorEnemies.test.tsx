/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
  resolveTacticalScenarioTerrain,
  type TacticalEnemyPlacement,
  type TacticalEnemyType,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { tacticalEditorLayerKey } from "../tacticalEditorLayers";
import { useTacticalEditorEnemies } from "../useTacticalEditorEnemies";

const enemy = (update: Partial<TacticalEnemyPlacement> = {}): TacticalEnemyPlacement => ({
  id: "enemy-1",
  type: "gang-member",
  name: "Gang Member 1",
  position: { x: 3, y: 3 },
  facing: "north",
  avatarPath: "/generated/avatars/enemy.png",
  ...update,
});

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

const renderEnemies = ({
  initialDraft = emptyDraft(),
  activeEnemyType = null,
  initialSelectedEnemyId = null,
  lockedLayerKeys = new Set<string>(),
}: {
  initialDraft?: TacticalScenarioDefinitionFile;
  activeEnemyType?: TacticalEnemyType | null;
  initialSelectedEnemyId?: string | null;
  lockedLayerKeys?: ReadonlySet<string>;
} = {}) => {
  const showEnemyEditor = jest.fn();
  const setSelectedPlacementId = jest.fn();
  const setSelectedFire = jest.fn();
  const hook = renderHook(() => {
    const [draft, setDraft] = useState(initialDraft);
    const [selectedEnemyId, setSelectedEnemyId] = useState(initialSelectedEnemyId);
    const [placementError, setPlacementError] = useState<string | null>(null);
    return {
      ...useTacticalEditorEnemies({
        draft,
        setDraft,
        activeEnemyType,
        selectedEnemyId,
        lockedLayerKeys,
        setSelectedPlacementId,
        setSelectedEnemyId,
        setSelectedFire,
        setPlacementError,
        showEnemyEditor,
      }),
      draft,
      selectedEnemyId,
      placementError,
    };
  });
  return { ...hook, showEnemyEditor, setSelectedPlacementId, setSelectedFire };
};

describe("useTacticalEditorEnemies", () => {
  it("validates map bounds, occupied squares, blocking terrain, and deployment", () => {
    const draft = {
      ...emptyDraft(),
      enemyPlacements: [enemy()],
      naturalTerrainPlacements: [{
        id: "tree-1",
        kind: "tree" as const,
        position: { x: 10, y: 10 },
        radius: 1.5,
      }],
    };
    const deploymentCell = resolveTacticalScenarioTerrain(draft).deploymentCells[0]!;
    const { result } = renderEnemies({ initialDraft: draft });

    expect(result.current.enemyPositionError({ x: -1, y: 0 }))
      .toBe("Enemies must be placed inside the map.");
    expect(result.current.enemyPositionError({ x: 3, y: 3 }))
      .toBe("Another enemy already occupies 3:3.");
    expect(result.current.enemyPositionError({ x: 10, y: 10 }))
      .toBe("An enemy cannot occupy blocked terrain at 10:10.");
    expect(result.current.enemyPositionError(deploymentCell))
      .toContain("crew deployment zone");
  });

  it("places and selects an enemy with a unique ID", () => {
    const draft = { ...emptyDraft(), enemyPlacements: [enemy()] };
    const { result, showEnemyEditor, setSelectedPlacementId, setSelectedFire } = renderEnemies({
      initialDraft: draft,
      activeEnemyType: "gang-member",
    });

    act(() => result.current.placeEnemy({ x: 12, y: 12 }));

    expect(result.current.draft.enemyPlacements).toHaveLength(2);
    expect(result.current.draft.enemyPlacements?.[1]).toMatchObject({
      id: "gang-member-1",
      name: "Gang Member 1",
      position: { x: 12, y: 12 },
      facing: "north",
    });
    expect(result.current.selectedEnemyId).toBe("gang-member-1");
    expect(setSelectedPlacementId).toHaveBeenCalledWith(null);
    expect(setSelectedFire).toHaveBeenCalledWith(null);
    expect(showEnemyEditor).toHaveBeenCalledTimes(1);
  });

  it("moves, renames, rotates, and deletes the selected enemy", () => {
    const { result } = renderEnemies({
      initialDraft: { ...emptyDraft(), enemyPlacements: [enemy()] },
      initialSelectedEnemyId: "enemy-1",
    });

    act(() => result.current.moveEnemy("enemy-1", { x: 8, y: 8 }));
    expect(result.current.selectedEnemy?.position).toEqual({ x: 8, y: 8 });
    act(() => result.current.updateSelectedEnemyName("New Name"));
    expect(result.current.selectedEnemy?.name).toBe("New Name");
    act(() => result.current.rotateSelectedEnemy());
    expect(result.current.selectedEnemy?.facing).toBe("east");
    act(() => result.current.deleteSelectedEnemy());
    expect(result.current.draft.enemyPlacements).toEqual([]);
    expect(result.current.selectedEnemyId).toBeNull();
  });

  it("does not move, edit, or delete a locked enemy", () => {
    const initialDraft = { ...emptyDraft(), enemyPlacements: [enemy()] };
    const { result } = renderEnemies({
      initialDraft,
      initialSelectedEnemyId: "enemy-1",
      lockedLayerKeys: new Set([tacticalEditorLayerKey("enemy", "enemy-1")]),
    });

    act(() => {
      result.current.moveEnemy("enemy-1", { x: 8, y: 8 });
      result.current.updateSelectedEnemyName("Changed");
      result.current.rotateSelectedEnemy();
      result.current.deleteSelectedEnemy();
    });

    expect(result.current.selectedEnemyLocked).toBe(true);
    expect(result.current.draft.enemyPlacements).toEqual(initialDraft.enemyPlacements);
    expect(result.current.selectedEnemyId).toBe("enemy-1");
  });

  it("opens the editor when selecting an enemy", () => {
    const { result, showEnemyEditor } = renderEnemies({
      initialDraft: { ...emptyDraft(), enemyPlacements: [enemy()] },
    });

    act(() => result.current.selectEnemy("enemy-1"));

    expect(result.current.selectedEnemyId).toBe("enemy-1");
    expect(showEnemyEditor).toHaveBeenCalledTimes(1);
  });
});
