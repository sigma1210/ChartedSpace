import type { TacticalEnemyType } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { RaisedAreaDraft } from "@/plugins/characterCombat/editor/tacticalEditorInteractionState";
import {
  CIRCLE_TOOL_ID,
  areaTargetForTool,
} from "@/plugins/characterCombat/editor/tacticalEditorSupport";

type PrimaryTool = "select" | "node" | "hand";

type UseTacticalEditorToolActivationOptions = {
  areaDraftTarget: RaisedAreaDraft["target"] | null;
  setPrimaryTool: (tool: PrimaryTool) => void;
  setDrawingTool: (tool: string) => void;
  setEnemyTool: (kind: TacticalEnemyType) => void;
  closeToolGroup: () => void;
  clearPlacementHover: () => void;
  clearEnemyHover: () => void;
  clearPortalHover: () => void;
  clearWallDraft: () => void;
  clearCircleDraft: () => void;
  clearRampDraft: () => void;
  clearAreaDraft: () => void;
  clearAreaControlDrag: () => void;
  clearPlacementError: () => void;
  showCircleProperties: () => void;
};

export const useTacticalEditorToolActivation = ({
  areaDraftTarget,
  setPrimaryTool,
  setDrawingTool,
  setEnemyTool,
  closeToolGroup,
  clearPlacementHover,
  clearEnemyHover,
  clearPortalHover,
  clearWallDraft,
  clearCircleDraft,
  clearRampDraft,
  clearAreaDraft,
  clearAreaControlDrag,
  clearPlacementError,
  showCircleProperties,
}: UseTacticalEditorToolActivationOptions) => {
  const clearActiveToolDrafts = (
    preserveAreaTarget: RaisedAreaDraft["target"] | null = null,
  ) => {
    clearPlacementHover();
    clearEnemyHover();
    clearPortalHover();
    clearWallDraft();
    clearCircleDraft();
    clearRampDraft();
    if (!preserveAreaTarget || areaDraftTarget !== preserveAreaTarget) {
      clearAreaDraft();
      clearAreaControlDrag();
    }
    clearPlacementError();
  };

  const activatePrimaryTool = (tool: PrimaryTool) => {
    setPrimaryTool(tool);
    clearActiveToolDrafts();
  };

  const activatePrimaryToolFromHud = (tool: PrimaryTool) => {
    closeToolGroup();
    activatePrimaryTool(tool);
  };

  const activateDrawingTool = (tool: string) => {
    setDrawingTool(tool);
    clearActiveToolDrafts(areaTargetForTool(tool));
    if (tool === CIRCLE_TOOL_ID) showCircleProperties();
  };

  const activateEnemyTool = (kind: TacticalEnemyType) => {
    setEnemyTool(kind);
    clearActiveToolDrafts();
  };

  return {
    clearActiveToolDrafts,
    activatePrimaryTool,
    activatePrimaryToolFromHud,
    activateDrawingTool,
    activateEnemyTool,
  };
};
