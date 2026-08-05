/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { Provider } from "react-redux";
import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { TacticalConsoleVictoryDefinitionFile } from "@/plugins/characterCombat/tacticalConsoleVictory";
import { createAppStore } from "@/store";
import {
  editorDocumentSaved,
  editorOperationSelected,
  editorSelectionChanged,
} from "../../redux/tacticalEditorSlice";
import { useTacticalEditorDocumentState } from "../useTacticalEditorDocumentState";

const renderDocumentState = () => {
  const store = createAppStore();
  const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
  return {
    ...renderHook(() => useTacticalEditorDocumentState(), { wrapper }),
    store,
  };
};

const consoleVictory = (): TacticalConsoleVictoryDefinitionFile => ({
  schemaVersion: 1,
  id: "document-hook-test",
  scenarioId: "document-hook-test",
  operations: [],
});

describe("useTacticalEditorDocumentState", () => {
  it("returns the current document and initial clean state", () => {
    const { result } = renderDocumentState();

    expect(result.current.draft).toEqual(defaultTacticalScenarioDefinition);
    expect(result.current.consoleVictory.scenarioId).toBe(defaultTacticalScenarioDefinition.id);
    expect(result.current.dirty).toBe(false);
  });

  it("accepts direct draft and console-victory updates", () => {
    const { result } = renderDocumentState();
    const nextDraft = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    nextDraft.title = "Updated scenario";
    const nextConsoleVictory = consoleVictory();

    act(() => result.current.setDraft(nextDraft));
    act(() => result.current.setConsoleVictory(nextConsoleVictory));

    expect(result.current.draft.title).toBe("Updated scenario");
    expect(result.current.consoleVictory).toEqual(nextConsoleVictory);
    expect(result.current.dirty).toBe(true);
  });

  it("applies consecutive functional updates to the latest store state", () => {
    const { result } = renderDocumentState();
    const initialWidth = result.current.draft.map.width;

    act(() => {
      result.current.setDraft((current) => ({
        ...current,
        map: { ...current.map, width: current.map.width + 1 },
      }));
      result.current.setDraft((current) => ({
        ...current,
        map: { ...current.map, width: current.map.width + 1 },
      }));
    });

    expect(result.current.draft.map.width).toBe(initialWidth + 2);
  });

  it("applies functional console-victory updates to the latest store state", () => {
    const { result } = renderDocumentState();

    act(() => {
      result.current.setConsoleVictory((current) => ({ ...current, id: "first" }));
      result.current.setConsoleVictory((current) => ({
        ...current,
        scenarioId: `${current.id}-scenario`,
      }));
    });

    expect(result.current.consoleVictory).toMatchObject({
      id: "first",
      scenarioId: "first-scenario",
    });
  });

  it("reflects dirty state after changes and after saving a new baseline", () => {
    const { result, store } = renderDocumentState();

    act(() => result.current.setDraft((current) => ({ ...current, title: "Dirty title" })));
    expect(result.current.dirty).toBe(true);

    act(() => store.dispatch(editorDocumentSaved({
      draft: result.current.draft,
      consoleVictory: result.current.consoleVictory,
    })));
    expect(result.current.dirty).toBe(false);
  });

  it("removes a placement's operations, graph references, and selected operation", () => {
    const { result, store } = renderDocumentState();
    const definition: TacticalConsoleVictoryDefinitionFile = {
      ...consoleVictory(),
      operations: [{
        id: "remove-me",
        consolePlacementId: "console-1",
        label: "Remove me",
        prerequisites: { mode: "all", operationIds: [] },
        checks: [{ id: "remove-check", skill: "Security", difficulty: "average", apCost: 6 }],
        result: { type: "unlock", operationIds: ["keep-me"] },
      }, {
        id: "keep-me",
        consolePlacementId: "console-2",
        label: "Keep me",
        prerequisites: { mode: "all", operationIds: ["remove-me"] },
        checks: [{ id: "keep-check", skill: "Security", difficulty: "average", apCost: 6 }],
        result: { type: "victory" },
      }],
    };

    act(() => result.current.setConsoleVictory(definition));
    act(() => store.dispatch(editorSelectionChanged({ kind: "terrain-placement", id: "console-1" })));
    act(() => store.dispatch(editorOperationSelected("remove-me")));
    act(() => result.current.removePlacementConsoleOperations("console-1"));

    expect(result.current.consoleVictory.operations).toEqual([{
      ...definition.operations[1],
      prerequisites: { mode: "all", operationIds: [] },
    }]);
    expect(store.getState().tacticalEditor.selection.operationId).toBeNull();
  });
});
