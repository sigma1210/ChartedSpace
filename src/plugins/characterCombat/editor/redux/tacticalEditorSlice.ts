import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { GridPoint } from "@/plugins/characterCombat/types";
import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
  type TacticalDeploymentEdge,
  type TacticalEnemyType,
  type TacticalScenarioDefinitionFile,
  type TacticalTerrainPrimitiveType,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import {
  cloneTacticalConsoleVictoryDefinition,
  defaultTacticalConsoleVictoryDefinition,
  type TacticalConsoleVictoryDefinitionFile,
} from "@/plugins/characterCombat/tacticalConsoleVictory";
import {
  applyStoredTacticalEditorHudLayout,
  defaultTacticalEditorHudLayouts,
  tacticalEditorHudIds,
  type StoredTacticalEditorHudLayouts,
  type TacticalEditorHudId,
  type TacticalEditorHudLayout,
  type TacticalEditorHudLayouts,
} from "@/plugins/characterCombat/editor/lib/hudLayouts";
import { tacticalEditorLayerKeys } from "@/plugins/characterCombat/editor/lib/tacticalEditorLayers";

export type TacticalEditorSelection =
  | { kind: "terrain-placement"; id: string }
  | { kind: "enemy"; id: string }
  | { kind: "wall"; id: string }
  | { kind: "area"; id: string }
  | { kind: "legacy-raised-area"; id: string }
  | { kind: "legacy-terrain-region"; id: string }
  | { kind: "legacy-circle"; id: string }
  | { kind: "natural-terrain"; id: string }
  | { kind: "elevation-transition"; id: string }
  | { kind: "portal"; id: string }
  | { kind: "fire"; position: GridPoint };

export type TacticalEditorSelectionKind = TacticalEditorSelection["kind"];

export interface TacticalEditorSelectionState {
  object: TacticalEditorSelection | null;
  areaAnchor: { areaId: string; anchorIndex: number } | null;
  operationId: string | null;
}

export type TacticalEditorPrimaryTool = "select" | "node" | "hand";
export type TacticalEditorToolGroup =
  | "drawing-settings"
  | "boundaries"
  | "areas"
  | "nature"
  | "elevation"
  | "interactions";
export type TacticalEditorToolMode =
  | { kind: "primary"; tool: TacticalEditorPrimaryTool }
  | { kind: "drawing"; toolId: string }
  | { kind: "enemy"; enemyType: TacticalEnemyType };

export interface TacticalEditorToolState {
  mode: TacticalEditorToolMode;
  circleTerrainType: TacticalTerrainPrimitiveType;
  openGroup: TacticalEditorToolGroup | null;
}

export interface TacticalEditorLayerState {
  hiddenByKey: Record<string, true>;
  lockedByKey: Record<string, true>;
}

export interface TacticalEditorDocumentState {
  draft: TacticalScenarioDefinitionFile;
  baseline: TacticalScenarioDefinitionFile;
  consoleVictory: TacticalConsoleVictoryDefinitionFile;
  consoleVictoryBaseline: TacticalConsoleVictoryDefinitionFile;
}

export interface TacticalEditorTemplateAsset {
  id: string;
  label: string;
  imagePath: string;
  source: "built-in" | "uploaded";
}

export interface TacticalEditorTemplateState {
  assets: TacticalEditorTemplateAsset[];
  indexStatus: "idle" | "loading" | "failed";
  operation: "idle" | "applying" | "uploading";
  message: { kind: "error" | "success"; text: string } | null;
}

export interface TacticalEditorScenarioSummary {
  id: string;
  title: string;
  isDefault: boolean;
}

export interface TacticalEditorScenarioPropertiesDraft {
  title: string;
  briefing: string;
  objective: string;
  deploymentEdges: TacticalDeploymentEdge[];
}

export type TacticalEditorFileDialog =
  | { kind: "closed" }
  | { kind: "open"; searchQuery: string; selectedScenarioId: string }
  | { kind: "new"; name: string }
  | { kind: "save-as"; name: string }
  | { kind: "properties"; draft: TacticalEditorScenarioPropertiesDraft; error: string | null };

export type TacticalEditorFileOperation = "idle" | "opening" | "creating" | "saving" | "deleting";
export type TacticalEditorFileMessage = { kind: "error" | "success"; text: string } | null;

export interface TacticalEditorFileState {
  currentScenario: TacticalEditorScenarioSummary;
  scenarioIndex: {
    items: TacticalEditorScenarioSummary[];
    status: "idle" | "loading" | "failed";
  };
  operation: TacticalEditorFileOperation;
  message: TacticalEditorFileMessage;
  openHeaderMenu: "file" | "scenario" | null;
  dialog: TacticalEditorFileDialog;
}

export interface TacticalEditorState {
  selection: TacticalEditorSelectionState;
  tools: TacticalEditorToolState;
  layers: TacticalEditorLayerState;
  file: TacticalEditorFileState;
  hudLayouts: TacticalEditorHudLayouts;
  hudLayoutsReady: boolean;
  document: TacticalEditorDocumentState;
  templates: TacticalEditorTemplateState;
}

const freshTacticalEditorHudLayouts = (): TacticalEditorHudLayouts => Object.fromEntries(
  tacticalEditorHudIds.map((id) => [id, {
    ...defaultTacticalEditorHudLayouts[id],
    position: { ...defaultTacticalEditorHudLayouts[id].position },
  }]),
) as TacticalEditorHudLayouts;

const freshTacticalEditorDocument = (): TacticalEditorDocumentState => ({
  draft: cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition),
  baseline: cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition),
  consoleVictory: cloneTacticalConsoleVictoryDefinition(defaultTacticalConsoleVictoryDefinition),
  consoleVictoryBaseline: cloneTacticalConsoleVictoryDefinition(defaultTacticalConsoleVictoryDefinition),
});

const replaceTacticalEditorDocument = (
  state: TacticalEditorDocumentState,
  document: { draft: TacticalScenarioDefinitionFile; consoleVictory: TacticalConsoleVictoryDefinitionFile },
) => {
  state.draft = document.draft;
  state.baseline = cloneTacticalScenarioDefinition(document.draft);
  state.consoleVictory = document.consoleVictory;
  state.consoleVictoryBaseline = cloneTacticalConsoleVictoryDefinition(document.consoleVictory);
};

export const initialTacticalEditorState: TacticalEditorState = {
  selection: {
    object: null,
    areaAnchor: null,
    operationId: null,
  },
  tools: {
    mode: { kind: "primary", tool: "select" },
    circleTerrainType: "wall",
    openGroup: null,
  },
  layers: {
    hiddenByKey: {},
    lockedByKey: {},
  },
  file: {
    currentScenario: {
      id: defaultTacticalScenarioDefinition.id,
      title: defaultTacticalScenarioDefinition.title,
      isDefault: true,
    },
    scenarioIndex: { items: [], status: "loading" },
    operation: "idle",
    message: null,
    openHeaderMenu: null,
    dialog: { kind: "closed" },
  },
  hudLayouts: freshTacticalEditorHudLayouts(),
  hudLayoutsReady: false,
  document: freshTacticalEditorDocument(),
  templates: {
    assets: [],
    indexStatus: "idle",
    operation: "idle",
    message: null,
  },
};

const matchingScenarioIds = (items: TacticalEditorScenarioSummary[], query: string) => {
  const normalized = query.trim().toLowerCase();
  return items.filter((scenario) => !normalized
    || scenario.title.toLowerCase().includes(normalized)
    || scenario.id.toLowerCase().includes(normalized));
};

export const tacticalEditorSelectionLayerKey = (selection: TacticalEditorSelection | null) => {
  if (!selection) return null;
  if (selection.kind === "fire") return `fire:${selection.position.x}:${selection.position.y}`;
  const layerKind = selection.kind === "legacy-circle"
    ? "primitive"
    : selection.kind === "legacy-raised-area"
      ? "raised-area"
      : selection.kind === "legacy-terrain-region"
        ? "terrain-region"
        : selection.kind;
  return `${layerKind}:${selection.id}`;
};

const pruneTacticalEditorLayerState = (state: TacticalEditorState) => {
  const validKeys = new Set(tacticalEditorLayerKeys(state.document.draft));
  Object.keys(state.layers.hiddenByKey).forEach((key) => {
    if (!validKeys.has(key)) delete state.layers.hiddenByKey[key];
  });
  Object.keys(state.layers.lockedByKey).forEach((key) => {
    if (!validKeys.has(key)) delete state.layers.lockedByKey[key];
  });
  const selectedKey = tacticalEditorSelectionLayerKey(state.selection.object);
  if (selectedKey && !validKeys.has(selectedKey)) {
    state.selection = { object: null, areaAnchor: null, operationId: null };
  }
};

const tacticalEditorSlice = createSlice({
  name: "tacticalEditor",
  initialState: initialTacticalEditorState,
  reducers: {
    editorSelectionChanged(state, action: PayloadAction<TacticalEditorSelection>) {
      const previous = state.selection.object;
      const next = action.payload;
      state.selection.object = next;
      if (next.kind !== "area" || previous?.kind !== "area" || previous.id !== next.id) {
        state.selection.areaAnchor = null;
      }
      if (next.kind !== "terrain-placement" || previous?.kind !== "terrain-placement" || previous.id !== next.id) {
        state.selection.operationId = null;
      }
    },
    editorSelectionKindCleared(state, action: PayloadAction<TacticalEditorSelectionKind>) {
      if (state.selection.object?.kind !== action.payload) return;
      state.selection.object = null;
      state.selection.areaAnchor = null;
      state.selection.operationId = null;
    },
    editorAreaAnchorSelected(state, action: PayloadAction<{ areaId: string; anchorIndex: number } | null>) {
      const anchor = action.payload;
      const selection = state.selection.object;
      state.selection.areaAnchor = anchor
        && selection?.kind === "area"
        && selection.id === anchor.areaId
        ? anchor
        : null;
    },
    editorOperationSelected(state, action: PayloadAction<string | null>) {
      state.selection.operationId = state.selection.object?.kind === "terrain-placement"
        ? action.payload
        : null;
    },
    editorSelectionCleared(state) {
      state.selection = { object: null, areaAnchor: null, operationId: null };
    },
    editorPrimaryToolActivated(state, action: PayloadAction<TacticalEditorPrimaryTool>) {
      state.tools.mode = { kind: "primary", tool: action.payload };
      if (action.payload !== "node") state.selection.areaAnchor = null;
    },
    editorDrawingToolActivated(state, action: PayloadAction<string>) {
      state.tools.mode = { kind: "drawing", toolId: action.payload };
      state.selection = { object: null, areaAnchor: null, operationId: null };
    },
    editorDrawingToolCleared(state) {
      if (state.tools.mode.kind === "drawing") {
        state.tools.mode = { kind: "primary", tool: "select" };
      }
    },
    editorEnemyToolActivated(state, action: PayloadAction<TacticalEnemyType>) {
      state.tools.mode = { kind: "enemy", enemyType: action.payload };
      state.selection = { object: null, areaAnchor: null, operationId: null };
    },
    editorEnemyToolCleared(state) {
      if (state.tools.mode.kind === "enemy") {
        state.tools.mode = { kind: "primary", tool: "select" };
      }
    },
    editorCircleTerrainTypeChanged(state, action: PayloadAction<TacticalTerrainPrimitiveType>) {
      state.tools.circleTerrainType = action.payload;
    },
    editorToolGroupToggled(state, action: PayloadAction<TacticalEditorToolGroup>) {
      state.tools.openGroup = state.tools.openGroup === action.payload ? null : action.payload;
    },
    editorToolGroupClosed(state) {
      state.tools.openGroup = null;
    },
    editorHiddenLayerToggled(state, action: PayloadAction<string>) {
      const key = action.payload;
      if (state.layers.hiddenByKey[key]) delete state.layers.hiddenByKey[key];
      else state.layers.hiddenByKey[key] = true;
      if (tacticalEditorSelectionLayerKey(state.selection.object) === key) {
        state.selection = { object: null, areaAnchor: null, operationId: null };
      }
    },
    editorLockedLayerToggled(state, action: PayloadAction<string>) {
      const key = action.payload;
      if (state.layers.lockedByKey[key]) delete state.layers.lockedByKey[key];
      else state.layers.lockedByKey[key] = true;
      if (tacticalEditorSelectionLayerKey(state.selection.object) === key) {
        state.selection = { object: null, areaAnchor: null, operationId: null };
      }
    },
    editorLayerUnlocked(state, action: PayloadAction<string>) {
      delete state.layers.lockedByKey[action.payload];
    },
    editorHudLayoutsHydrated(state, action: PayloadAction<StoredTacticalEditorHudLayouts>) {
      tacticalEditorHudIds.forEach((id) => {
        const stored = action.payload[id];
        if (!stored) return;
        const current = state.hudLayouts[id];
        if (
          current.pinned === stored.pinned
          && current.position.x === stored.position.x
          && current.position.y === stored.position.y
        ) return;
        state.hudLayouts[id] = applyStoredTacticalEditorHudLayout(current, stored);
      });
      state.hudLayoutsReady = true;
    },
    editorHudLayoutChanged(state, action: PayloadAction<{
      id: TacticalEditorHudId;
      layout: TacticalEditorHudLayout;
    }>) {
      const { id, layout } = action.payload;
      state.hudLayouts[id] = { ...layout, position: { ...layout.position } };
    },
    editorHudLayoutsReset(state) {
      state.hudLayouts = freshTacticalEditorHudLayouts();
      state.hudLayoutsReady = false;
    },
    editorDraftChanged(state, action: PayloadAction<TacticalScenarioDefinitionFile>) {
      state.document.draft = action.payload;
      pruneTacticalEditorLayerState(state);
    },
    editorConsoleVictoryChanged(state, action: PayloadAction<TacticalConsoleVictoryDefinitionFile>) {
      state.document.consoleVictory = action.payload;
    },
    editorDocumentSaved(state, action: PayloadAction<{
      draft: TacticalScenarioDefinitionFile;
      consoleVictory: TacticalConsoleVictoryDefinitionFile;
    }>) {
      replaceTacticalEditorDocument(state.document, action.payload);
      pruneTacticalEditorLayerState(state);
    },
    editorDocumentDiscarded(state) {
      state.document.draft = cloneTacticalScenarioDefinition(state.document.baseline);
      state.document.consoleVictory = cloneTacticalConsoleVictoryDefinition(state.document.consoleVictoryBaseline);
      pruneTacticalEditorLayerState(state);
    },
    editorTemplateIndexRequested(state) {
      state.templates.indexStatus = "loading";
    },
    editorTemplateIndexReceived(state, action: PayloadAction<TacticalEditorTemplateAsset[]>) {
      state.templates.assets = action.payload;
      state.templates.indexStatus = "idle";
    },
    editorTemplateIndexFailed(state, action: PayloadAction<string>) {
      state.templates.indexStatus = "failed";
      state.templates.message = { kind: "error", text: action.payload };
    },
    editorTemplateOperationStarted(state, action: PayloadAction<"applying" | "uploading">) {
      state.templates.operation = action.payload;
      state.templates.message = null;
    },
    editorTemplateOperationSucceeded(state, action: PayloadAction<string>) {
      state.templates.operation = "idle";
      state.templates.message = { kind: "success", text: action.payload };
    },
    editorTemplateUploadSucceeded(state, action: PayloadAction<{
      asset: TacticalEditorTemplateAsset;
      message: string;
    }>) {
      if (!state.templates.assets.some((asset) => asset.id === action.payload.asset.id)) {
        state.templates.assets.push(action.payload.asset);
      }
      state.templates.operation = "idle";
      state.templates.message = { kind: "success", text: action.payload.message };
    },
    editorTemplateOperationFailed(state, action: PayloadAction<string>) {
      state.templates.operation = "idle";
      state.templates.message = { kind: "error", text: action.payload };
    },
    editorHeaderMenuToggled(state, action: PayloadAction<"file" | "scenario">) {
      state.file.openHeaderMenu = state.file.openHeaderMenu === action.payload ? null : action.payload;
    },
    editorHeaderMenuClosed(state) {
      state.file.openHeaderMenu = null;
    },
    editorScenarioIndexRequested(state) {
      if (state.file.scenarioIndex.items.length === 0) state.file.scenarioIndex.status = "loading";
    },
    editorScenarioIndexReceived(state, action: PayloadAction<TacticalEditorScenarioSummary[]>) {
      state.file.scenarioIndex = { items: action.payload, status: "idle" };
      if (state.file.dialog.kind === "open") {
        const dialog = state.file.dialog;
        const matches = matchingScenarioIds(action.payload, dialog.searchQuery);
        if (!matches.some((scenario) => scenario.id === dialog.selectedScenarioId)) {
          dialog.selectedScenarioId = matches[0]?.id ?? "";
        }
      }
    },
    editorScenarioIndexFailed(state) {
      state.file.scenarioIndex.status = "failed";
    },
    editorOpenScenarioDialogOpened(state) {
      const preferredId = state.file.currentScenario.id;
      state.file.openHeaderMenu = null;
      state.file.message = null;
      state.file.dialog = {
        kind: "open",
        searchQuery: "",
        selectedScenarioId: state.file.scenarioIndex.items.some((scenario) => scenario.id === preferredId)
          ? preferredId
          : state.file.scenarioIndex.items[0]?.id ?? "",
      };
    },
    editorNewScenarioDialogOpened(state) {
      state.file.openHeaderMenu = null;
      state.file.message = null;
      state.file.dialog = { kind: "new", name: "" };
    },
    editorSaveAsDialogOpened(state) {
      state.file.openHeaderMenu = null;
      state.file.message = null;
      state.file.dialog = { kind: "save-as", name: "" };
    },
    editorScenarioPropertiesDialogOpened(state, action: PayloadAction<TacticalEditorScenarioPropertiesDraft>) {
      state.file.openHeaderMenu = null;
      state.file.dialog = { kind: "properties", draft: action.payload, error: null };
    },
    editorFileDialogClosed(state) {
      state.file.dialog = { kind: "closed" };
    },
    editorOpenScenarioSearchChanged(state, action: PayloadAction<string>) {
      if (state.file.dialog.kind !== "open") return;
      const dialog = state.file.dialog;
      dialog.searchQuery = action.payload;
      const matches = matchingScenarioIds(state.file.scenarioIndex.items, action.payload);
      if (!matches.some((scenario) => scenario.id === dialog.selectedScenarioId)) {
        dialog.selectedScenarioId = matches[0]?.id ?? "";
      }
    },
    editorOpenScenarioSelected(state, action: PayloadAction<string>) {
      if (state.file.dialog.kind === "open") state.file.dialog.selectedScenarioId = action.payload;
    },
    editorScenarioNameChanged(state, action: PayloadAction<string>) {
      if (state.file.dialog.kind === "new" || state.file.dialog.kind === "save-as") {
        state.file.dialog.name = action.payload;
      }
    },
    editorScenarioPropertiesChanged(state, action: PayloadAction<TacticalEditorScenarioPropertiesDraft>) {
      if (state.file.dialog.kind !== "properties") return;
      state.file.dialog.draft = action.payload;
      state.file.dialog.error = null;
    },
    editorScenarioPropertiesRejected(state, action: PayloadAction<string>) {
      if (state.file.dialog.kind === "properties") state.file.dialog.error = action.payload;
    },
    editorFileOperationStarted(state, action: PayloadAction<Exclude<TacticalEditorFileOperation, "idle">>) {
      state.file.operation = action.payload;
      state.file.message = null;
    },
    editorFileOperationSucceeded(state, action: PayloadAction<{
      message: string;
      currentScenario?: TacticalEditorScenarioSummary;
      closeDialog?: boolean;
    }>) {
      state.file.operation = "idle";
      state.file.message = { kind: "success", text: action.payload.message };
      if (action.payload.currentScenario) state.file.currentScenario = action.payload.currentScenario;
      if (action.payload.closeDialog) state.file.dialog = { kind: "closed" };
    },
    editorFileOperationFailed(state, action: PayloadAction<string>) {
      state.file.operation = "idle";
      state.file.message = { kind: "error", text: action.payload };
    },
    editorFileMessageChanged(state, action: PayloadAction<TacticalEditorFileMessage>) {
      state.file.message = action.payload;
    },
    editorScenarioActivated(state, action: PayloadAction<{
      scenario: TacticalEditorScenarioSummary;
      message: string;
      document?: { draft: TacticalScenarioDefinitionFile; consoleVictory: TacticalConsoleVictoryDefinitionFile };
    }>) {
      state.selection = { object: null, areaAnchor: null, operationId: null };
      state.tools.mode = { kind: "primary", tool: "select" };
      state.layers = { hiddenByKey: {}, lockedByKey: {} };
      state.file.currentScenario = action.payload.scenario;
      state.file.operation = "idle";
      state.file.message = { kind: "success", text: action.payload.message };
      state.file.openHeaderMenu = null;
      state.file.dialog = { kind: "closed" };
      if (action.payload.document) replaceTacticalEditorDocument(state.document, action.payload.document);
    },
    editorSessionReset(state) {
      state.selection = { object: null, areaAnchor: null, operationId: null };
      state.tools = {
        mode: { kind: "primary", tool: "select" },
        circleTerrainType: "wall",
        openGroup: null,
      };
      state.layers = { hiddenByKey: {}, lockedByKey: {} };
      state.file = {
        currentScenario: {
          id: defaultTacticalScenarioDefinition.id,
          title: defaultTacticalScenarioDefinition.title,
          isDefault: true,
        },
        scenarioIndex: { items: [], status: "loading" },
        operation: "idle",
        message: null,
        openHeaderMenu: null,
        dialog: { kind: "closed" },
      };
      state.document = freshTacticalEditorDocument();
      state.templates = {
        assets: [],
        indexStatus: "idle",
        operation: "idle",
        message: null,
      };
    },
  },
});

export const {
  editorAreaAnchorSelected,
  editorCircleTerrainTypeChanged,
  editorConsoleVictoryChanged,
  editorDocumentDiscarded,
  editorDocumentSaved,
  editorDraftChanged,
  editorDrawingToolActivated,
  editorDrawingToolCleared,
  editorEnemyToolActivated,
  editorEnemyToolCleared,
  editorFileDialogClosed,
  editorFileMessageChanged,
  editorFileOperationFailed,
  editorFileOperationStarted,
  editorFileOperationSucceeded,
  editorHeaderMenuClosed,
  editorHeaderMenuToggled,
  editorHudLayoutChanged,
  editorHudLayoutsHydrated,
  editorHudLayoutsReset,
  editorHiddenLayerToggled,
  editorLayerUnlocked,
  editorLockedLayerToggled,
  editorNewScenarioDialogOpened,
  editorOpenScenarioDialogOpened,
  editorOpenScenarioSearchChanged,
  editorOpenScenarioSelected,
  editorOperationSelected,
  editorPrimaryToolActivated,
  editorSaveAsDialogOpened,
  editorScenarioActivated,
  editorScenarioIndexFailed,
  editorScenarioIndexReceived,
  editorScenarioIndexRequested,
  editorScenarioNameChanged,
  editorScenarioPropertiesChanged,
  editorScenarioPropertiesDialogOpened,
  editorScenarioPropertiesRejected,
  editorSelectionChanged,
  editorSelectionCleared,
  editorSelectionKindCleared,
  editorSessionReset,
  editorToolGroupClosed,
  editorToolGroupToggled,
  editorTemplateIndexFailed,
  editorTemplateIndexReceived,
  editorTemplateIndexRequested,
  editorTemplateOperationFailed,
  editorTemplateOperationStarted,
  editorTemplateOperationSucceeded,
  editorTemplateUploadSucceeded,
} = tacticalEditorSlice.actions;

export default tacticalEditorSlice.reducer;
