/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import {
  cloneTacticalConsoleVictoryDefinition,
  defaultTacticalConsoleVictoryDefinition,
} from "@/plugins/characterCombat/tacticalConsoleVictory";
import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import {
  editorDraftChanged,
  editorNewScenarioDialogOpened,
  editorOpenScenarioDialogOpened,
  editorOpenScenarioSelected,
  editorSaveAsDialogOpened,
  editorScenarioActivated,
  editorScenarioIndexReceived,
  editorScenarioNameChanged,
} from "@/plugins/characterCombat/editor/redux/tacticalEditorSlice";
import { createAppStore, type AppStore } from "@/store";
import {
  createTacticalScenario,
  deleteTacticalScenario,
  loadTacticalScenario,
  updateTacticalScenario,
} from "../../lib/tacticalEditorApi";
import { useTacticalEditorFileCommands } from "../useTacticalEditorFileCommands";

jest.mock("../../lib/tacticalEditorApi", () => ({
  createTacticalScenario: jest.fn(),
  deleteTacticalScenario: jest.fn(),
  loadTacticalScenario: jest.fn(),
  updateTacticalScenario: jest.fn(),
}));

const createScenarioMock = jest.mocked(createTacticalScenario);
const deleteScenarioMock = jest.mocked(deleteTacticalScenario);
const loadScenarioMock = jest.mocked(loadTacticalScenario);
const updateScenarioMock = jest.mocked(updateTacticalScenario);

const scenarioDocument = (id: string, title: string) => {
  const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
  definition.id = id;
  definition.title = title;
  definition.consoleVictoryDefinitionId = id;
  const consoleVictory = cloneTacticalConsoleVictoryDefinition(
    defaultTacticalConsoleVictoryDefinition,
  );
  consoleVictory.id = id;
  consoleVictory.scenarioId = id;
  return { definition, consoleVictory };
};

const renderFileCommands = (store: AppStore) => {
  const refreshScenarioList = jest.fn().mockResolvedValue(undefined);
  const clearEditorTransientState = jest.fn();
  const rendered = renderHook(
    () => useTacticalEditorFileCommands({
      draftBlocked: false,
      refreshScenarioList,
      clearEditorTransientState,
    }),
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      ),
    },
  );
  return { ...rendered, refreshScenarioList, clearEditorTransientState };
};

describe("useTacticalEditorFileCommands", () => {
  beforeEach(() => {
    createScenarioMock.mockReset();
    deleteScenarioMock.mockReset();
    loadScenarioMock.mockReset();
    updateScenarioMock.mockReset();
    jest.restoreAllMocks();
  });

  it("loads the selected scenario and clears transient interaction state", async () => {
    const store = createAppStore();
    const scenario = { id: "loaded-scenario", title: "Loaded Scenario", isDefault: false };
    const document = scenarioDocument(scenario.id, scenario.title);
    store.dispatch(editorScenarioIndexReceived([scenario]));
    store.dispatch(editorOpenScenarioDialogOpened());
    store.dispatch(editorOpenScenarioSelected(scenario.id));
    loadScenarioMock.mockResolvedValue(document);
    const { result, clearEditorTransientState } = renderFileCommands(store);

    await act(async () => result.current.loadScenario());

    expect(loadScenarioMock).toHaveBeenCalledWith(scenario.id);
    expect(clearEditorTransientState).toHaveBeenCalledTimes(1);
    expect(store.getState().tacticalEditor.file.currentScenario).toEqual(scenario);
    expect(store.getState().tacticalEditor.document.draft.title).toBe(scenario.title);
  });

  it("creates a new empty scenario and refreshes the scenario index", async () => {
    const store = createAppStore();
    const scenario = { id: "new-scenario", title: "New Scenario", isDefault: false };
    const document = scenarioDocument(scenario.id, scenario.title);
    store.dispatch(editorNewScenarioDialogOpened());
    store.dispatch(editorScenarioNameChanged(scenario.title));
    createScenarioMock.mockResolvedValue({ scenario, ...document });
    const { result, refreshScenarioList, clearEditorTransientState } = renderFileCommands(store);

    await act(async () => result.current.createNewScenario());

    expect(createScenarioMock).toHaveBeenCalledWith(
      scenario.title,
      expect.objectContaining({
        title: scenario.title,
        terrainPlacements: [],
        enemyPlacements: [],
      }),
      expect.objectContaining({ operations: [] }),
      "Could not create the scenario.",
    );
    expect(refreshScenarioList).toHaveBeenCalledTimes(1);
    expect(clearEditorTransientState).toHaveBeenCalledTimes(1);
    expect(store.getState().tacticalEditor.file.currentScenario).toEqual(scenario);
  });

  it("saves the draft as a new scenario and closes the dialog", async () => {
    const store = createAppStore();
    const scenario = { id: "saved-copy", title: "Saved Copy", isDefault: false };
    const document = scenarioDocument(scenario.id, scenario.title);
    store.dispatch(editorSaveAsDialogOpened());
    store.dispatch(editorScenarioNameChanged(scenario.title));
    createScenarioMock.mockResolvedValue({ scenario, ...document });
    const { result, refreshScenarioList } = renderFileCommands(store);

    await act(async () => result.current.saveScenarioAs());

    expect(createScenarioMock).toHaveBeenCalledWith(
      scenario.title,
      expect.any(Object),
      expect.any(Object),
    );
    expect(refreshScenarioList).toHaveBeenCalledTimes(1);
    expect(store.getState().tacticalEditor.file.currentScenario).toEqual(scenario);
    expect(store.getState().tacticalEditor.file.dialog).toEqual({ kind: "closed" });
  });

  it("updates the current saved scenario when the draft is dirty", async () => {
    const store = createAppStore();
    const scenario = { id: "existing-scenario", title: "Existing Scenario", isDefault: false };
    const document = scenarioDocument(scenario.id, scenario.title);
    store.dispatch(editorScenarioActivated({
      scenario,
      message: "Loaded.",
      document: { draft: document.definition, consoleVictory: document.consoleVictory },
    }));
    store.dispatch(editorDraftChanged({ ...document.definition, briefing: "Changed briefing" }));
    const savedDocument = scenarioDocument(scenario.id, scenario.title);
    savedDocument.definition.briefing = "Changed briefing";
    updateScenarioMock.mockResolvedValue({ scenario, ...savedDocument });
    const { result, refreshScenarioList } = renderFileCommands(store);

    await act(async () => result.current.saveScenario());

    expect(updateScenarioMock).toHaveBeenCalledWith(
      scenario.id,
      expect.objectContaining({ briefing: "Changed briefing" }),
      expect.any(Object),
    );
    expect(refreshScenarioList).toHaveBeenCalledTimes(1);
    expect(store.getState().tacticalEditor.file.message?.text).toBe(
      "Saved changes to existing-scenario.json.",
    );
  });

  it("deletes the current scenario and returns to the default document", async () => {
    const store = createAppStore();
    const scenario = { id: "disposable-scenario", title: "Disposable Scenario", isDefault: false };
    const document = scenarioDocument(scenario.id, scenario.title);
    store.dispatch(editorScenarioActivated({
      scenario,
      message: "Loaded.",
      document: { draft: document.definition, consoleVictory: document.consoleVictory },
    }));
    jest.spyOn(window, "confirm").mockReturnValue(true);
    deleteScenarioMock.mockResolvedValue({ id: scenario.id, title: scenario.title });
    const { result, refreshScenarioList, clearEditorTransientState } = renderFileCommands(store);

    await act(async () => result.current.deleteScenario());

    expect(deleteScenarioMock).toHaveBeenCalledWith(scenario.id);
    expect(refreshScenarioList).toHaveBeenCalledTimes(1);
    expect(clearEditorTransientState).toHaveBeenCalledTimes(1);
    expect(store.getState().tacticalEditor.file.currentScenario).toEqual({
      id: defaultTacticalScenarioDefinition.id,
      title: defaultTacticalScenarioDefinition.title,
      isDefault: true,
    });
  });
});
