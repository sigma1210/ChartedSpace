import {
  resolveTacticalScenarioTerrain,
  type TacticalNaturalTerrainPlacement,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { NaturalTerrainDrag } from "@/plugins/characterCombat/editor/tacticalEditorInteractionState";
import {
  cellKey,
  defaultNaturalTerrainRadius,
  gridPoint,
  naturalTerrainKindForTool,
} from "@/plugins/characterCombat/editor/tacticalEditorSupport";

type DraftUpdate = TacticalScenarioDefinitionFile
  | ((current: TacticalScenarioDefinitionFile) => TacticalScenarioDefinitionFile);

type UseTacticalEditorNaturalTerrainOptions = {
  draft: TacticalScenarioDefinitionFile;
  setDraft: (update: DraftUpdate) => void;
  activeDrawingTool: string | null;
  selectedNaturalTerrainId: string | null;
  dragNaturalTerrain: NaturalTerrainDrag | null;
  setSelectedNaturalTerrainId: (id: string | null) => void;
  setSelectedPlacementId: (id: string | null) => void;
  setSelectedEnemyId: (id: string | null) => void;
  setDragNaturalTerrain: (drag: NaturalTerrainDrag | null) => void;
  setPlacementError: (error: string | null) => void;
  showObjectProperties: () => void;
};

export const useTacticalEditorNaturalTerrain = ({
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
}: UseTacticalEditorNaturalTerrainOptions) => {
  const selectedNaturalTerrain = (draft.naturalTerrainPlacements ?? [])
    .find((placement) => placement.id === selectedNaturalTerrainId) ?? null;

  const validateCandidate = (
    candidate: TacticalScenarioDefinitionFile,
    placement: TacticalNaturalTerrainPlacement,
    fallbackMessage: string,
  ) => {
    try {
      resolveTacticalScenarioTerrain(candidate);
      if (placement.kind === "tree" && (candidate.enemyPlacements ?? [])
        .some((enemy) => cellKey(enemy.position) === cellKey(placement.position))) {
        throw new Error(`Tree ${placement.id} cannot overlap an enemy.`);
      }
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : fallbackMessage;
    }
  };

  const placeNaturalTerrain = (origin: { x: number; y: number }) => {
    const naturalKind = naturalTerrainKindForTool(activeDrawingTool);
    if (!naturalKind) return false;
    const usedIds = new Set([
      ...draft.terrainPlacements.map((placement) => placement.id),
      ...(draft.drawnWalls ?? []).map((wall) => wall.id),
      ...(draft.drawnRaisedAreas ?? []).map((area) => area.id),
      ...(draft.drawnTerrainRegions ?? []).map((region) => region.id),
      ...(draft.drawnTerrainPrimitives ?? []).map((primitive) => primitive.id),
      ...(draft.naturalTerrainPlacements ?? []).map((placement) => placement.id),
    ]);
    let suffix = 1;
    let id = `${naturalKind}-${suffix}`;
    while (usedIds.has(id)) {
      suffix += 1;
      id = `${naturalKind}-${suffix}`;
    }
    const placement: TacticalNaturalTerrainPlacement = {
      id,
      kind: naturalKind,
      position: gridPoint(origin),
      radius: defaultNaturalTerrainRadius(naturalKind),
    };
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      naturalTerrainPlacements: [...(draft.naturalTerrainPlacements ?? []), placement],
    };
    const error = validateCandidate(candidate, placement, "That natural terrain placement is not valid.");
    if (error) {
      setPlacementError(error);
      return true;
    }
    setDraft(candidate);
    setSelectedNaturalTerrainId(id);
    showObjectProperties();
    setSelectedPlacementId(null);
    setSelectedEnemyId(null);
    setPlacementError(null);
    return true;
  };

  const selectNaturalTerrain = (id: string | null) => {
    setSelectedNaturalTerrainId(id);
    if (id) showObjectProperties();
  };

  const beginNaturalTerrainDrag = (
    id: string,
    kind: NaturalTerrainDrag["kind"],
    point?: { x: number; y: number },
  ) => {
    const placement = (draft.naturalTerrainPlacements ?? [])
      .find((candidate) => candidate.id === id);
    const center = placement ? {
      x: placement.position.x + 0.5,
      y: placement.position.y + 0.5,
    } : null;
    setDragNaturalTerrain({
      id,
      kind,
      ...(kind === "position" && point && center
        ? { offset: { x: point.x - center.x, y: point.y - center.y } }
        : {}),
    });
    setPlacementError(null);
  };

  const updateNaturalTerrainDrag = (point: { x: number; y: number }) => {
    if (!dragNaturalTerrain) return;
    const placement = (draft.naturalTerrainPlacements ?? [])
      .find((candidate) => candidate.id === dragNaturalTerrain.id);
    if (!placement) return;
    const center = {
      x: placement.position.x + 0.5,
      y: placement.position.y + 0.5,
    };
    const updated: TacticalNaturalTerrainPlacement = dragNaturalTerrain.kind === "position"
      ? {
        ...placement,
        position: {
          x: Math.floor(point.x - (dragNaturalTerrain.offset?.x ?? 0)),
          y: Math.floor(point.y - (dragNaturalTerrain.offset?.y ?? 0)),
        },
      }
      : {
        ...placement,
        radius: Math.max(0.25, Math.hypot(point.x - center.x, point.y - center.y)),
      };
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      naturalTerrainPlacements: (draft.naturalTerrainPlacements ?? [])
        .map((item) => item.id === placement.id ? updated : item),
    };
    const error = validateCandidate(candidate, updated, "That natural terrain position is not valid.");
    if (error) {
      setPlacementError(error);
      return;
    }
    setDraft(candidate);
    setPlacementError(null);
  };

  const finishNaturalTerrainDrag = () => setDragNaturalTerrain(null);

  const updateSelectedNaturalTerrainRadius = (radius: number) => {
    if (!selectedNaturalTerrain || !Number.isFinite(radius)) return;
    const updated = { ...selectedNaturalTerrain, radius };
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      naturalTerrainPlacements: (draft.naturalTerrainPlacements ?? [])
        .map((placement) => placement.id === selectedNaturalTerrain.id ? updated : placement),
    };
    const error = validateCandidate(candidate, updated, "That natural terrain radius is not valid.");
    if (error) {
      setPlacementError(error);
      return;
    }
    setDraft(candidate);
    setPlacementError(null);
  };

  const deleteSelectedNaturalTerrain = () => {
    if (!selectedNaturalTerrain) return;
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      naturalTerrainPlacements: (draft.naturalTerrainPlacements ?? [])
        .filter((placement) => placement.id !== selectedNaturalTerrain.id),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setSelectedNaturalTerrainId(null);
      setDragNaturalTerrain(null);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error
        ? error.message
        : "That natural terrain cannot be deleted.");
    }
  };

  return {
    selectedNaturalTerrain,
    placeNaturalTerrain,
    selectNaturalTerrain,
    beginNaturalTerrainDrag,
    updateNaturalTerrainDrag,
    finishNaturalTerrainDrag,
    updateSelectedNaturalTerrainRadius,
    deleteSelectedNaturalTerrain,
  };
};
