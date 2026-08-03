import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/store";
import { tacticalEditorSelectionLayerKey } from "@/plugins/characterCombat/editor/state/tacticalEditorSlice";

export const selectTacticalEditorSelectionState = (state: RootState) => state.tacticalEditor.selection;
export const selectTacticalEditorSelection = (state: RootState) => state.tacticalEditor.selection.object;
export const selectTacticalEditorAreaAnchor = (state: RootState) => state.tacticalEditor.selection.areaAnchor;
export const selectTacticalEditorOperationId = (state: RootState) => state.tacticalEditor.selection.operationId;
export const selectTacticalEditorToolState = (state: RootState) => state.tacticalEditor.tools;
export const selectTacticalEditorToolMode = (state: RootState) => state.tacticalEditor.tools.mode;
export const selectTacticalEditorPrimaryTool = createSelector(
  [selectTacticalEditorToolMode],
  (mode) => mode.kind === "primary" ? mode.tool : "select",
);
export const selectTacticalEditorPlacementKind = createSelector(
  [selectTacticalEditorToolMode],
  (mode) => mode.kind === "drawing" ? mode.toolId : null,
);
export const selectTacticalEditorEnemyKind = createSelector(
  [selectTacticalEditorToolMode],
  (mode) => mode.kind === "enemy" ? mode.enemyType : null,
);
export const selectTacticalEditorCircleTerrainType = (state: RootState) => state.tacticalEditor.tools.circleTerrainType;
export const selectTacticalEditorOpenToolGroup = (state: RootState) => state.tacticalEditor.tools.openGroup;
export const selectTacticalEditorFileState = (state: RootState) => state.tacticalEditor.file;
export const selectTacticalEditorCurrentScenario = (state: RootState) => state.tacticalEditor.file.currentScenario;
export const selectTacticalEditorScenarioIndex = (state: RootState) => state.tacticalEditor.file.scenarioIndex;
export const selectTacticalEditorFileOperation = (state: RootState) => state.tacticalEditor.file.operation;
export const selectTacticalEditorFileMessage = (state: RootState) => state.tacticalEditor.file.message;
export const selectTacticalEditorHeaderMenu = (state: RootState) => state.tacticalEditor.file.openHeaderMenu;
export const selectTacticalEditorFileDialog = (state: RootState) => state.tacticalEditor.file.dialog;
export const selectTacticalEditorLayerState = (state: RootState) => state.tacticalEditor.layers;
export const selectTacticalEditorHudLayouts = (state: RootState) => state.tacticalEditor.hudLayouts;
export const selectTacticalEditorHudLayoutsReady = (state: RootState) => state.tacticalEditor.hudLayoutsReady;
export const selectTacticalEditorDocument = (state: RootState) => state.tacticalEditor.document;
export const selectTacticalEditorDocumentDirty = createSelector(
  [selectTacticalEditorDocument],
  ({ draft, baseline, consoleVictory, consoleVictoryBaseline }) => (
    JSON.stringify(draft) !== JSON.stringify(baseline)
    || JSON.stringify(consoleVictory) !== JSON.stringify(consoleVictoryBaseline)
  ),
);
export const selectTacticalEditorTemplates = (state: RootState) => state.tacticalEditor.templates;
export const selectTacticalEditorHiddenLayerKeys = createSelector(
  [(state: RootState) => state.tacticalEditor.layers.hiddenByKey],
  (hiddenByKey) => new Set(Object.keys(hiddenByKey)),
);
export const selectTacticalEditorLockedLayerKeys = createSelector(
  [(state: RootState) => state.tacticalEditor.layers.lockedByKey],
  (lockedByKey) => new Set(Object.keys(lockedByKey)),
);

export const selectTacticalEditorLayerKey = createSelector(
  [selectTacticalEditorSelection],
  tacticalEditorSelectionLayerKey,
);
