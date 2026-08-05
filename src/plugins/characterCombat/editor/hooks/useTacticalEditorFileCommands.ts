"use client";

import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
  resolveTacticalScenarioTerrain,
  tacticalPlacementSupportsConsoleOperations,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import {
  cloneTacticalConsoleVictoryDefinition,
  validateTacticalConsoleVictoryDefinition,
  type TacticalConsoleVictoryDefinitionFile,
} from "@/plugins/characterCombat/tacticalConsoleVictory";
import {
  createTacticalScenario,
  deleteTacticalScenario,
  loadTacticalScenario,
  updateTacticalScenario,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorApi";
import {
  emptyTacticalScenarioDraft,
  freshDefaultConsoleVictory,
  freshDefaultDraft,
  upgradeLegacyTacticalEditorAreas,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorDocument";
import {
  selectTacticalEditorDocument,
  selectTacticalEditorDocumentDirty,
  selectTacticalEditorFileState,
} from "@/plugins/characterCombat/editor/redux/selectors";
import {
  editorDocumentSaved,
  editorFileOperationFailed,
  editorFileOperationStarted,
  editorFileOperationSucceeded,
  editorScenarioActivated,
} from "@/plugins/characterCombat/editor/redux/tacticalEditorSlice";
import { gridPoint } from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

type TacticalEditorFileCommandOptions = {
  draftBlocked: boolean;
  refreshScenarioList: () => Promise<void>;
  clearEditorTransientState: () => void;
};

const saveableScenarioDefinition = (
  draft: ReturnType<typeof selectTacticalEditorDocument>["draft"],
) => ({
  ...draft,
  enemyPlacements: (draft.enemyPlacements ?? []).map((enemy) => ({
    ...enemy,
    position: gridPoint(enemy.position),
  })),
  fireCells: draft.fireCells.map(gridPoint),
  smokeCells: draft.smokeCells.map(gridPoint),
});

export const useTacticalEditorFileCommands = ({
  draftBlocked,
  refreshScenarioList,
  clearEditorTransientState,
}: TacticalEditorFileCommandOptions) => {
  const dispatch = useAppDispatch();
  const { draft, consoleVictory } = useAppSelector(selectTacticalEditorDocument);
  const dirty = useAppSelector(selectTacticalEditorDocumentDirty);
  const fileWorkflow = useAppSelector(selectTacticalEditorFileState);
  const currentScenario = fileWorkflow.currentScenario;
  const availableScenarios = fileWorkflow.scenarioIndex.items;
  const fileBusy = fileWorkflow.operation !== "idle";
  const scenarioToLoad = fileWorkflow.dialog.kind === "open"
    ? fileWorkflow.dialog.selectedScenarioId
    : "";
  const newScenarioName = fileWorkflow.dialog.kind === "new"
    ? fileWorkflow.dialog.name
    : "";
  const saveAsName = fileWorkflow.dialog.kind === "save-as"
    ? fileWorkflow.dialog.name
    : "";

  const loadScenario = async (scenarioId = scenarioToLoad) => {
    if (!scenarioId || fileBusy) return;
    if (dirty && !window.confirm("Load another scenario and discard the unsaved changes in this draft?")) return;
    dispatch(editorFileOperationStarted("opening"));
    try {
      const document = await loadTacticalScenario(scenarioId);
      const loaded = upgradeLegacyTacticalEditorAreas(
        cloneTacticalScenarioDefinition(document.definition),
      );
      const loadedConsoleVictory = cloneTacticalConsoleVictoryDefinition(
        document.consoleVictory,
      );
      resolveTacticalScenarioTerrain(loaded);
      validateTacticalConsoleVictoryDefinition(
        loadedConsoleVictory,
        loaded.terrainPlacements
          .filter(tacticalPlacementSupportsConsoleOperations)
          .map((placement) => placement.id),
        loaded.terrainPlacements
          .filter((placement) => placement.terrainDefinitionId === "interactive-human")
          .map((placement) => placement.id),
      );
      const summary = availableScenarios.find((scenario) => scenario.id === loaded.id) ?? {
        id: loaded.id,
        title: loaded.title,
        isDefault: loaded.id === defaultTacticalScenarioDefinition.id,
      };
      clearEditorTransientState();
      dispatch(editorScenarioActivated({
        scenario: summary,
        message: `Loaded ${loaded.title}.`,
        document: { draft: loaded, consoleVictory: loadedConsoleVictory },
      }));
    } catch (error) {
      dispatch(editorFileOperationFailed(
        error instanceof Error ? error.message : "Could not load the scenario.",
      ));
    }
  };

  const createNewScenario = async () => {
    if (!newScenarioName.trim() || fileBusy || draft.map.width < 1 || draft.map.height < 1) return;
    dispatch(editorFileOperationStarted("creating"));
    try {
      const definition = emptyTacticalScenarioDraft(draft, newScenarioName);
      const emptyConsoleVictory: TacticalConsoleVictoryDefinitionFile = {
        schemaVersion: 1,
        id: definition.consoleVictoryDefinitionId ?? definition.id,
        scenarioId: definition.id,
        operations: [],
      };
      const body = await createTacticalScenario(
        newScenarioName,
        definition,
        emptyConsoleVictory,
        "Could not create the scenario.",
      );
      const saved = upgradeLegacyTacticalEditorAreas(
        cloneTacticalScenarioDefinition(body.definition),
      );
      const savedConsoleVictory = cloneTacticalConsoleVictoryDefinition(
        body.consoleVictory,
      );
      clearEditorTransientState();
      await refreshScenarioList();
      dispatch(editorScenarioActivated({
        scenario: body.scenario,
        message: `Created ${body.scenario.id}.json.`,
        document: { draft: saved, consoleVictory: savedConsoleVictory },
      }));
    } catch (error) {
      dispatch(editorFileOperationFailed(
        error instanceof Error ? error.message : "Could not create the scenario.",
      ));
    }
  };

  const saveScenarioAs = async () => {
    if (!saveAsName.trim() || fileBusy || draftBlocked) return;
    dispatch(editorFileOperationStarted("saving"));
    try {
      const body = await createTacticalScenario(
        saveAsName,
        saveableScenarioDefinition(draft),
        consoleVictory,
      );
      const saved = upgradeLegacyTacticalEditorAreas(
        cloneTacticalScenarioDefinition(body.definition),
      );
      const savedConsoleVictory = cloneTacticalConsoleVictoryDefinition(
        body.consoleVictory,
      );
      dispatch(editorDocumentSaved({ draft: saved, consoleVictory: savedConsoleVictory }));
      await refreshScenarioList();
      dispatch(editorFileOperationSucceeded({
        message: `Saved ${body.scenario.id}.json.`,
        currentScenario: body.scenario,
        closeDialog: true,
      }));
    } catch (error) {
      dispatch(editorFileOperationFailed(
        error instanceof Error ? error.message : "Could not save the scenario.",
      ));
    }
  };

  const saveScenario = async () => {
    if (currentScenario.isDefault || !dirty || fileBusy || draftBlocked) return;
    dispatch(editorFileOperationStarted("saving"));
    try {
      const body = await updateTacticalScenario(
        currentScenario.id,
        saveableScenarioDefinition(draft),
        consoleVictory,
      );
      const saved = upgradeLegacyTacticalEditorAreas(
        cloneTacticalScenarioDefinition(body.definition),
      );
      const savedConsoleVictory = cloneTacticalConsoleVictoryDefinition(
        body.consoleVictory,
      );
      dispatch(editorDocumentSaved({ draft: saved, consoleVictory: savedConsoleVictory }));
      await refreshScenarioList();
      dispatch(editorFileOperationSucceeded({
        message: `Saved changes to ${body.scenario.id}.json.`,
        currentScenario: body.scenario,
      }));
    } catch (error) {
      dispatch(editorFileOperationFailed(
        error instanceof Error ? error.message : "Could not save the scenario.",
      ));
    }
  };

  const deleteScenario = async () => {
    if (currentScenario.isDefault || fileBusy) return;
    if (!window.confirm(
      `Permanently delete "${currentScenario.title}"? This cannot be undone${dirty ? " and its unsaved draft changes will be lost" : ""}.`,
    )) return;
    dispatch(editorFileOperationStarted("deleting"));
    try {
      const deleted = await deleteTacticalScenario(currentScenario.id);
      await refreshScenarioList();
      clearEditorTransientState();
      dispatch(editorScenarioActivated({
        scenario: {
          id: defaultTacticalScenarioDefinition.id,
          title: defaultTacticalScenarioDefinition.title,
          isDefault: true,
        },
        message: `Deleted ${deleted.id}.json and returned to the default scenario.`,
        document: {
          draft: freshDefaultDraft(),
          consoleVictory: freshDefaultConsoleVictory(),
        },
      }));
    } catch (error) {
      dispatch(editorFileOperationFailed(
        error instanceof Error ? error.message : "Could not delete the scenario.",
      ));
    }
  };

  return {
    loadScenario,
    createNewScenario,
    saveScenarioAs,
    saveScenario,
    deleteScenario,
  };
};
