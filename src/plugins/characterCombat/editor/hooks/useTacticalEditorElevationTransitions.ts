import {
  tacticalElevationEdgeCandidates,
  tacticalNearestElevationEdgeCandidate,
  tacticalRampPlacementCandidate,
} from "@/plugins/characterCombat/tacticalElevationTransitions";
import {
  resolveTacticalScenarioTerrain,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { tacticalElevationTransitionPlacementCandidate } from "@/plugins/characterCombat/editor/lib/tacticalEditorDocument";
import type {
  EditorMapPoint,
  RampDraft,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorInteractionState";
import { tacticalEditorLayerKey } from "@/plugins/characterCombat/editor/lib/tacticalEditorLayers";
import { elevationTransitionKindForTool } from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

type DraftUpdate = TacticalScenarioDefinitionFile
  | ((current: TacticalScenarioDefinitionFile) => TacticalScenarioDefinitionFile);

type UseTacticalEditorElevationTransitionsOptions = {
  draft: TacticalScenarioDefinitionFile;
  setDraft: (update: DraftUpdate) => void;
  activeDrawingTool: string | null;
  rampDraft: RampDraft | null;
  selectedElevationTransitionId: string | null;
  lockedLayerKeys: ReadonlySet<string>;
  setRampDraft: (draft: RampDraft | null) => void;
  setPlacementHover: (point: EditorMapPoint | null) => void;
  setSelectedElevationTransitionId: (id: string | null) => void;
  clearOtherSelections: () => void;
  setPlacementError: (error: string | null) => void;
};

export const useTacticalEditorElevationTransitions = ({
  draft,
  setDraft,
  activeDrawingTool,
  rampDraft,
  selectedElevationTransitionId,
  lockedLayerKeys,
  setRampDraft,
  setPlacementHover,
  setSelectedElevationTransitionId,
  clearOtherSelections,
  setPlacementError,
}: UseTacticalEditorElevationTransitionsOptions) => {
  const selectedElevationTransition = (draft.elevationTransitions ?? [])
    .find((transition) => transition.id === selectedElevationTransitionId) ?? null;

  const placeElevationTransition = (origin: EditorMapPoint) => {
    const transitionKind = elevationTransitionKindForTool(activeDrawingTool);
    if (!transitionKind) return false;
    if (transitionKind === "ramp") return true;
    try {
      const candidate = tacticalElevationTransitionPlacementCandidate(
        draft,
        transitionKind,
        origin,
      );
      setDraft(candidate.definition);
      clearOtherSelections();
      setSelectedElevationTransitionId(candidate.transition.id);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error
        ? error.message
        : "That elevation transition is not valid.");
    }
    return true;
  };

  const beginOrFinishRamp = (point: EditorMapPoint) => {
    if (!rampDraft) {
      const candidates = tacticalElevationEdgeCandidates(draft);
      const edge = tacticalNearestElevationEdgeCandidate(candidates, point);
      if (!edge) {
        setPlacementError(candidates.length === 0
          ? "No unused adjacent-level edge is available for a ramp."
          : "Move closer to a highlighted edge to begin the ramp.");
        return;
      }
      setRampDraft({ edge });
      setPlacementHover(point);
      clearOtherSelections();
      setSelectedElevationTransitionId(null);
      setPlacementError("Extend the ramp at least 2 squares outward, then click again.");
      return;
    }
    try {
      const candidate = tacticalRampPlacementCandidate(draft, rampDraft.edge, point);
      setDraft(candidate.definition);
      setRampDraft(null);
      setSelectedElevationTransitionId(candidate.transition.id);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That ramp is not valid.");
    }
  };

  const cancelRampDrawing = () => {
    setRampDraft(null);
    setPlacementError(null);
  };

  const selectElevationTransition = (id: string | null) => {
    if (id && lockedLayerKeys.has(tacticalEditorLayerKey("elevation-transition", id))) return;
    setSelectedElevationTransitionId(id);
    if (id) clearOtherSelections();
  };

  const deleteSelectedElevationTransition = () => {
    if (!selectedElevationTransition
      || lockedLayerKeys.has(tacticalEditorLayerKey(
        "elevation-transition",
        selectedElevationTransition.id,
      ))) return false;
    const candidate = {
      ...draft,
      elevationTransitions: (draft.elevationTransitions ?? [])
        .filter((transition) => transition.id !== selectedElevationTransition.id),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setSelectedElevationTransitionId(null);
      setPlacementError(null);
      return true;
    } catch (error) {
      setPlacementError(error instanceof Error
        ? error.message
        : "That elevation transition cannot be deleted.");
      return false;
    }
  };

  return {
    selectedElevationTransition,
    placeElevationTransition,
    beginOrFinishRamp,
    cancelRampDrawing,
    selectElevationTransition,
    deleteSelectedElevationTransition,
  };
};
