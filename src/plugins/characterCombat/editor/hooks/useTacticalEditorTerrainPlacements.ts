import {
  resolveTacticalScenarioTerrain,
  tacticalPlacementSupportsConsoleOperations,
  type TacticalScenarioDefinitionFile,
  type TacticalTerrainPlacement,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { TacticalConsoleOperation } from "@/plugins/characterCombat/tacticalConsoleVictory";
import { cellKey, placementCandidates } from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

type DraftUpdate = TacticalScenarioDefinitionFile
  | ((current: TacticalScenarioDefinitionFile) => TacticalScenarioDefinitionFile);

type UseTacticalEditorTerrainPlacementsOptions = {
  draft: TacticalScenarioDefinitionFile;
  setDraft: (update: DraftUpdate) => void;
  activeDrawingTool: string | null;
  selectedPlacementId: string | null;
  consoleOperations: TacticalConsoleOperation[];
  setSelectedPlacementId: (id: string | null) => void;
  setSelectedEnemyId: (id: string | null) => void;
  setSelectedOperationId: (id: string | null) => void;
  removePlacementConsoleOperations: (placementId: string) => void;
  showConsoleEditor: () => void;
  setPlacementError: (error: string | null) => void;
};

export const useTacticalEditorTerrainPlacements = ({
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
}: UseTacticalEditorTerrainPlacementsOptions) => {
  const selectedPlacement = draft.terrainPlacements
    .find((placement) => placement.id === selectedPlacementId) ?? null;
  const selectedIsLiquidHydrogen = selectedPlacement
    ?.terrainDefinitionId.startsWith("liquid-hydrogen-") ?? false;

  const updatePlacements = (placements: TacticalTerrainPlacement[]) => {
    const candidate = { ...draft, terrainPlacements: placements };
    try {
      const terrain = resolveTacticalScenarioTerrain(candidate);
      const deploymentCells = new Set(terrain.deploymentCells.map(cellKey));
      const enemy = (candidate.enemyPlacements ?? [])
        .find((item) => deploymentCells.has(cellKey(item.position)));
      if (enemy) {
        throw new Error(
          `Enemy ${enemy.name} cannot occupy the crew deployment zone at ${cellKey(enemy.position)}.`,
        );
      }
      setDraft(candidate);
      setPlacementError(null);
      return true;
    } catch (error) {
      setPlacementError(error instanceof Error
        ? error.message
        : "That terrain placement is not valid.");
      return false;
    }
  };

  const placeOrdinaryTerrain = (origin: { x: number; y: number }) => {
    if (!activeDrawingTool) return;
    let suffix = 1;
    let id = `${activeDrawingTool}-${suffix}`;
    while (draft.terrainPlacements.some((placement) => placement.id === id)) {
      suffix += 1;
      id = `${activeDrawingTool}-${suffix}`;
    }
    let lastError = "That terrain placement is not valid.";
    for (const placementCandidate of placementCandidates(activeDrawingTool, origin)) {
      const placement: TacticalTerrainPlacement = {
        id,
        terrainDefinitionId: activeDrawingTool,
        origin: placementCandidate.origin,
        rotation: placementCandidate.rotation,
      };
      const candidate = {
        ...draft,
        terrainPlacements: [...draft.terrainPlacements, placement],
      };
      try {
        const terrain = resolveTacticalScenarioTerrain(candidate);
        const deploymentCells = new Set(terrain.deploymentCells.map(cellKey));
        const enemy = (candidate.enemyPlacements ?? [])
          .find((item) => deploymentCells.has(cellKey(item.position)));
        if (enemy) {
          throw new Error(
            `Enemy ${enemy.name} cannot occupy the crew deployment zone at ${cellKey(enemy.position)}.`,
          );
        }
        setDraft(candidate);
        setPlacementError(null);
        setSelectedPlacementId(id);
        setSelectedEnemyId(null);
        if (tacticalPlacementSupportsConsoleOperations(placement)) showConsoleEditor();
        return;
      } catch (error) {
        lastError = error instanceof Error ? error.message : lastError;
      }
    }
    setPlacementError(lastError);
  };

  const moveTerrain = (id: string, origin: { x: number; y: number }) => {
    const placement = draft.terrainPlacements.find((item) => item.id === id);
    if (!placement || (placement.origin.x === origin.x && placement.origin.y === origin.y)) return;
    updatePlacements(draft.terrainPlacements.map((item) => (
      item.id === id ? { ...item, origin } : item
    )));
  };

  const selectTerrainPlacement = (id: string | null) => {
    setSelectedPlacementId(id);
    setSelectedOperationId(id
      ? consoleOperations.find((operation) => operation.consolePlacementId === id)?.id ?? null
      : null);
    if (!id) return;
    const placement = draft.terrainPlacements.find((item) => item.id === id);
    if (placement && tacticalPlacementSupportsConsoleOperations(placement)) showConsoleEditor();
  };

  const rotateSelectedPlacement = () => {
    if (!selectedPlacement) return;
    const rotation = ((selectedPlacement.rotation + 90) % 360) as TacticalTerrainPlacement["rotation"];
    updatePlacements(draft.terrainPlacements.map((placement) => (
      placement.id === selectedPlacement.id ? { ...placement, rotation } : placement
    )));
  };

  const updateSelectedLiquidHydrogen = (filled: boolean) => {
    if (!selectedPlacement || !selectedIsLiquidHydrogen) return;
    updatePlacements(draft.terrainPlacements.map((placement) => (
      placement.id === selectedPlacement.id
        ? { ...placement, terrainSettings: { ...placement.terrainSettings, filled } }
        : placement
    )));
  };

  const deleteSelectedPlacement = () => {
    if (!selectedPlacement) return false;
    const candidate = {
      ...draft,
      terrainPlacements: draft.terrainPlacements
        .filter((placement) => placement.id !== selectedPlacement.id),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      removePlacementConsoleOperations(selectedPlacement.id);
      setSelectedPlacementId(null);
      setPlacementError(null);
      return true;
    } catch (error) {
      setPlacementError(error instanceof Error
        ? error.message
        : "That terrain placement cannot be deleted.");
      return false;
    }
  };

  return {
    selectedPlacement,
    selectedIsLiquidHydrogen,
    updatePlacements,
    placeOrdinaryTerrain,
    moveTerrain,
    selectTerrainPlacement,
    rotateSelectedPlacement,
    updateSelectedLiquidHydrogen,
    deleteSelectedPlacement,
  };
};
