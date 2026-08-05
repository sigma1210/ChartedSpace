import {
  resolveTacticalScenarioTerrain,
  type TacticalDrawnCirclePrimitive,
  type TacticalScenarioDefinitionFile,
  type TacticalTerrainPrimitiveType,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type {
  CircleDraft,
  CirclePrimitiveDrag,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorInteractionState";
import { removeDrawnTerrainPrimitiveCandidate } from "@/plugins/characterCombat/editor/lib/tacticalEditorDocument";
import {
  CIRCLE_AREA_TOOL_ID,
  gridPoint,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

type DraftUpdate = TacticalScenarioDefinitionFile
  | ((current: TacticalScenarioDefinitionFile) => TacticalScenarioDefinitionFile);
type CircleDraftUpdate = CircleDraft | null
  | ((current: CircleDraft | null) => CircleDraft | null);

type UseTacticalEditorCirclePrimitivesOptions = {
  draft: TacticalScenarioDefinitionFile;
  setDraft: (update: DraftUpdate) => void;
  activeDrawingTool: string | null;
  creationTerrainType: TacticalTerrainPrimitiveType;
  circleDraft: CircleDraft | null;
  dragCirclePrimitive: CirclePrimitiveDrag | null;
  selectedPrimitiveId: string | null;
  setCircleDraft: (update: CircleDraftUpdate) => void;
  setDragCirclePrimitive: (drag: CirclePrimitiveDrag | null) => void;
  setSelectedPrimitiveId: (id: string | null) => void;
  setCreationTerrainType: (terrainType: TacticalTerrainPrimitiveType) => void;
  clearDrawingTool: () => void;
  clearSelections: () => void;
  createCircleArea: (center: { x: number; y: number }, radius: number) => unknown;
  showCircleProperties: () => void;
  setPlacementError: (error: string | null) => void;
};

const circleRadiusTo = (
  center: { x: number; y: number },
  point: { x: number; y: number },
) => Number(Math.hypot(point.x - center.x, point.y - center.y).toFixed(4));

export const useTacticalEditorCirclePrimitives = ({
  draft,
  setDraft,
  activeDrawingTool,
  creationTerrainType,
  circleDraft,
  dragCirclePrimitive,
  selectedPrimitiveId,
  setCircleDraft,
  setDragCirclePrimitive,
  setSelectedPrimitiveId,
  setCreationTerrainType,
  clearDrawingTool,
  clearSelections,
  createCircleArea,
  showCircleProperties,
  setPlacementError,
}: UseTacticalEditorCirclePrimitivesOptions) => {
  const selectedPrimitive = (draft.drawnTerrainPrimitives ?? [])
    .find((primitive) => primitive.id === selectedPrimitiveId) ?? null;

  const beginCircle = (center: { x: number; y: number }) => {
    setCircleDraft({ center: gridPoint(center), radius: 0 });
    clearSelections();
    setPlacementError(null);
  };

  const updateCircle = (point: { x: number; y: number }) => {
    setCircleDraft((current) => current
      ? { ...current, radius: circleRadiusTo(current.center, point) }
      : null);
  };

  const finishCircle = (point: { x: number; y: number }) => {
    if (!circleDraft) return false;
    const radius = circleRadiusTo(circleDraft.center, point);
    setCircleDraft(null);
    if (activeDrawingTool === CIRCLE_AREA_TOOL_ID) {
      createCircleArea(circleDraft.center, radius);
      return radius > 0;
    }
    if (radius <= 0) {
      setPlacementError("A circle must have a positive radius.");
      return false;
    }
    const usedIds = new Set([
      ...draft.terrainPlacements.map((placement) => placement.id),
      ...(draft.drawnWalls ?? []).map((wall) => wall.id),
      ...(draft.drawnAreas ?? []).map((area) => area.id),
      ...(draft.drawnRaisedAreas ?? []).map((area) => area.id),
      ...(draft.drawnTerrainRegions ?? []).map((region) => region.id),
      ...(draft.drawnTerrainPrimitives ?? []).map((primitive) => primitive.id),
      ...(draft.naturalTerrainPlacements ?? []).map((placement) => placement.id),
    ]);
    let suffix = 1;
    let id = `terrain-circle-${suffix}`;
    while (usedIds.has(id)) {
      suffix += 1;
      id = `terrain-circle-${suffix}`;
    }
    const primitive: TacticalDrawnCirclePrimitive = {
      id,
      shape: "circle",
      center: gridPoint(circleDraft.center),
      radius,
      terrainType: creationTerrainType,
    };
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      drawnTerrainPrimitives: [...(draft.drawnTerrainPrimitives ?? []), primitive],
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setSelectedPrimitiveId(id);
      clearDrawingTool();
      setPlacementError(null);
      return true;
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That circle is not valid.");
      return false;
    }
  };

  const cancelCircleDrawing = () => {
    setCircleDraft(null);
    setPlacementError(null);
  };

  const selectTerrainPrimitive = (id: string | null) => {
    setSelectedPrimitiveId(id);
    if (!id) return;
    const primitive = (draft.drawnTerrainPrimitives ?? [])
      .find((candidate) => candidate.id === id);
    if (!primitive) return;
    setCreationTerrainType(primitive.terrainType);
    showCircleProperties();
  };

  const beginCirclePrimitiveDrag = (id: string, kind: CirclePrimitiveDrag["kind"]) => {
    setDragCirclePrimitive({ id, kind });
    setPlacementError(null);
  };

  const updateCirclePrimitiveDrag = (point: { x: number; y: number }) => {
    if (!dragCirclePrimitive) return;
    const primitive = (draft.drawnTerrainPrimitives ?? [])
      .find((candidate) => candidate.id === dragCirclePrimitive.id);
    if (!primitive) return;
    const updated: TacticalDrawnCirclePrimitive = dragCirclePrimitive.kind === "center"
      ? { ...primitive, center: gridPoint(point) }
      : { ...primitive, radius: circleRadiusTo(primitive.center, point) };
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      drawnTerrainPrimitives: (draft.drawnTerrainPrimitives ?? [])
        .map((item) => item.id === primitive.id ? updated : item),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That circle position is not valid.");
    }
  };

  const finishCirclePrimitiveDrag = () => setDragCirclePrimitive(null);

  const updateSelectedPrimitive = (
    update: Partial<Pick<TacticalDrawnCirclePrimitive, "center" | "radius" | "terrainType" | "settings" | "portals">>,
  ) => {
    if (!selectedPrimitive) return;
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      drawnTerrainPrimitives: (draft.drawnTerrainPrimitives ?? [])
        .map((primitive) => primitive.id === selectedPrimitive.id
          ? { ...primitive, ...update }
          : primitive),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That circle setting is not valid.");
    }
  };

  const changeLegacyCircleTerrainType = (terrainType: TacticalTerrainPrimitiveType) => {
    setCreationTerrainType(terrainType);
    if (!selectedPrimitive) return;
    updateSelectedPrimitive({
      terrainType,
      ...(terrainType === "liquid-hydrogen"
        ? { settings: { filled: selectedPrimitive.settings?.filled ?? true } }
        : { settings: undefined }),
      ...(terrainType === "wall" ? {} : { portals: undefined }),
    });
  };

  const deleteSelectedPrimitive = () => {
    if (!selectedPrimitive) return false;
    try {
      const candidate = removeDrawnTerrainPrimitiveCandidate(draft, selectedPrimitive.id);
      setDraft(candidate.definition);
      setSelectedPrimitiveId(null);
      setDragCirclePrimitive(null);
      setPlacementError(candidate.removedTransitionIds.length > 0
        ? `Deleted the circle and ${candidate.removedTransitionIds.length} attached elevation ${candidate.removedTransitionIds.length === 1 ? "transition" : "transitions"}.`
        : null);
      return true;
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That circle cannot be deleted.");
      return false;
    }
  };

  return {
    selectedPrimitive,
    beginCircle,
    updateCircle,
    finishCircle,
    cancelCircleDrawing,
    selectTerrainPrimitive,
    beginCirclePrimitiveDrag,
    updateCirclePrimitiveDrag,
    finishCirclePrimitiveDrag,
    updateSelectedPrimitive,
    changeLegacyCircleTerrainType,
    deleteSelectedPrimitive,
  };
};
