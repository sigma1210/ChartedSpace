/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { Provider } from "react-redux";
import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { createAppStore } from "@/store";
import {
  editorDraftChanged,
  editorSelectionChanged,
} from "../../redux/tacticalEditorSlice";
import { useTacticalEditorDraftCommands } from "../useTacticalEditorDraftCommands";

const renderDraftCommands = (dirty: boolean) => {
  const store = createAppStore();
  const clearInteractionState = jest.fn();
  const clearDrawingTool = jest.fn();
  const clearEnemyTool = jest.fn();
  const changeFileMessage = jest.fn();
  const wrapper = ({ children }: PropsWithChildren) => (
    <Provider store={store}>{children}</Provider>
  );
  return {
    store,
    clearInteractionState,
    clearDrawingTool,
    clearEnemyTool,
    changeFileMessage,
    ...renderHook(() => useTacticalEditorDraftCommands({
      dirty,
      clearInteractionState,
      clearDrawingTool,
      clearEnemyTool,
      changeFileMessage,
    }), { wrapper }),
  };
};

const changeDraftTitle = (store: ReturnType<typeof createAppStore>) => {
  const draft = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
  draft.title = "Unsaved title";
  store.dispatch(editorDraftChanged(draft));
};

describe("useTacticalEditorDraftCommands", () => {
  afterEach(() => jest.restoreAllMocks());

  it("clears editor transient state", () => {
    const { result, clearInteractionState } = renderDraftCommands(false);

    act(() => result.current.clearEditorTransientState());

    expect(clearInteractionState).toHaveBeenCalledTimes(1);
  });

  it("clears the Redux selection, active tools, and transient state", () => {
    const {
      result,
      store,
      clearInteractionState,
      clearDrawingTool,
      clearEnemyTool,
    } = renderDraftCommands(false);
    store.dispatch(editorSelectionChanged({ kind: "wall", id: "wall-1" }));

    act(() => result.current.clearEditorSelection());

    expect(store.getState().tacticalEditor.selection.object).toBeNull();
    expect(clearDrawingTool).toHaveBeenCalledTimes(1);
    expect(clearEnemyTool).toHaveBeenCalledTimes(1);
    expect(clearInteractionState).toHaveBeenCalledTimes(1);
  });

  it("does not ask or discard when the draft is unchanged", () => {
    const confirm = jest.spyOn(window, "confirm");
    const { result, store, changeFileMessage } = renderDraftCommands(false);
    changeDraftTitle(store);

    act(() => result.current.discardDraftChanges());

    expect(confirm).not.toHaveBeenCalled();
    expect(store.getState().tacticalEditor.document.draft.title).toBe("Unsaved title");
    expect(changeFileMessage).not.toHaveBeenCalled();
  });

  it("keeps the draft when discard confirmation is cancelled", () => {
    jest.spyOn(window, "confirm").mockReturnValue(false);
    const { result, store, changeFileMessage } = renderDraftCommands(true);
    changeDraftTitle(store);

    act(() => result.current.discardDraftChanges());

    expect(store.getState().tacticalEditor.document.draft.title).toBe("Unsaved title");
    expect(changeFileMessage).not.toHaveBeenCalled();
  });

  it("restores the baseline and clears the session after confirmed discard", () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    const {
      result,
      store,
      clearInteractionState,
      clearDrawingTool,
      clearEnemyTool,
      changeFileMessage,
    } = renderDraftCommands(true);
    changeDraftTitle(store);
    store.dispatch(editorSelectionChanged({ kind: "wall", id: "wall-1" }));

    act(() => result.current.discardDraftChanges());

    expect(store.getState().tacticalEditor.document.draft.title)
      .toBe(defaultTacticalScenarioDefinition.title);
    expect(store.getState().tacticalEditor.selection.object).toBeNull();
    expect(clearDrawingTool).toHaveBeenCalledTimes(1);
    expect(clearEnemyTool).toHaveBeenCalledTimes(1);
    expect(clearInteractionState).toHaveBeenCalledTimes(1);
    expect(changeFileMessage).toHaveBeenCalledWith({
      kind: "success",
      text: "Discarded unsaved draft changes.",
    });
  });
});
