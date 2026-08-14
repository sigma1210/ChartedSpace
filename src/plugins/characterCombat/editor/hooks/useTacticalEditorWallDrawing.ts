import {
  resolveTacticalScenarioTerrain,
  type TacticalDrawnWall,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { EditorWallDraft } from "@/plugins/characterCombat/editor/lib/tacticalEditorInteractionState";
import {
  CURVED_WALL_TOOL_ID,
  gridPoint,
  sameGridPoint,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

type DraftUpdate = TacticalScenarioDefinitionFile
  | ((current: TacticalScenarioDefinitionFile) => TacticalScenarioDefinitionFile);
type WallDraftUpdate = EditorWallDraft | null
  | ((current: EditorWallDraft | null) => EditorWallDraft | null);

type UseTacticalEditorWallDrawingOptions = {
  draft: TacticalScenarioDefinitionFile;
  setDraft: (update: DraftUpdate) => void;
  activeDrawingTool: string | null;
  wallDraft: EditorWallDraft | null;
  setWallDraft: (update: WallDraftUpdate) => void;
  setSelectedWallId: (id: string | null) => void;
  clearOtherSelections: () => void;
  showWallProperties: () => void;
  setPlacementError: (error: string | null) => void;
};

export const useTacticalEditorWallDrawing = ({
  draft,
  setDraft,
  activeDrawingTool,
  wallDraft,
  setWallDraft,
  setSelectedWallId,
  clearOtherSelections,
  showWallProperties,
  setPlacementError,
}: UseTacticalEditorWallDrawingOptions) => {
  const beginWall = (from: { x: number; y: number }) => {
    const point = gridPoint(from);
    setWallDraft({
      from: point,
      to: point,
      curved: activeDrawingTool === CURVED_WALL_TOOL_ID,
      awaitingEnd: false,
    });
    clearOtherSelections();
    setSelectedWallId(null);
    setPlacementError(null);
  };

  const updateWall = (to: { x: number; y: number }) => {
    setWallDraft((current) => current ? { ...current, to: gridPoint(to) } : null);
  };

  const finishWall = (to: { x: number; y: number }) => {
    if (!wallDraft) return false;
    const from = gridPoint(wallDraft.from);
    const snappedTo = gridPoint(to);
    setWallDraft(null);
    if (sameGridPoint(from, snappedTo)) {
      setPlacementError("A wall must have different start and end points.");
      return false;
    }
    let suffix = 1;
    let id = `drawn-wall-${suffix}`;
    while ((draft.drawnWalls ?? []).some((wall) => wall.id === id)) {
      suffix += 1;
      id = `drawn-wall-${suffix}`;
    }
    const wall: TacticalDrawnWall = {
      id,
      from,
      to: snappedTo,
      ...(wallDraft.curved
        ? { control: { x: (from.x + snappedTo.x) / 2, y: (from.y + snappedTo.y) / 2 } }
        : {}),
    };
    const candidate = { ...draft, drawnWalls: [...(draft.drawnWalls ?? []), wall] };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setSelectedWallId(id);
      showWallProperties();
      setPlacementError(null);
      return true;
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That wall is not valid.");
      return false;
    }
  };

  const finishWallInteraction = (to: { x: number; y: number }) => {
    if (!wallDraft) return false;
    const snappedTo = gridPoint(to);
    if (sameGridPoint(wallDraft.from, snappedTo)) {
      setWallDraft({ ...wallDraft, to: snappedTo, awaitingEnd: true });
      setPlacementError(null);
      return false;
    }
    return finishWall(snappedTo);
  };

  const cancelWall = () => setWallDraft(null);

  return {
    beginWall,
    updateWall,
    finishWall,
    finishWallInteraction,
    cancelWall,
  };
};
