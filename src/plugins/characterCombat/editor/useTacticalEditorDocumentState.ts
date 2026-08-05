import { useCallback } from "react";
import type { TacticalScenarioDefinitionFile } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { TacticalConsoleVictoryDefinitionFile } from "@/plugins/characterCombat/tacticalConsoleVictory";
import { useAppDispatch, useAppSelector, useAppStore } from "@/store/hooks";
import {
  selectTacticalEditorDocument,
  selectTacticalEditorDocumentDirty,
} from "@/plugins/characterCombat/editor/state/selectors";
import {
  editorConsoleVictoryChanged,
  editorDraftChanged,
  editorOperationSelected,
} from "@/plugins/characterCombat/editor/state/tacticalEditorSlice";
import { removeConsolePlacementOperations } from "@/plugins/characterCombat/editor/tacticalEditorDocument";

type DraftUpdate = TacticalScenarioDefinitionFile
  | ((current: TacticalScenarioDefinitionFile) => TacticalScenarioDefinitionFile);
type ConsoleVictoryUpdate = TacticalConsoleVictoryDefinitionFile
  | ((current: TacticalConsoleVictoryDefinitionFile) => TacticalConsoleVictoryDefinitionFile);

export const useTacticalEditorDocumentState = () => {
  const dispatch = useAppDispatch();
  const editorStore = useAppStore();
  const { draft, consoleVictory } = useAppSelector(selectTacticalEditorDocument);
  const dirty = useAppSelector(selectTacticalEditorDocumentDirty);

  const setDraft = useCallback((update: DraftUpdate) => {
    const current = editorStore.getState().tacticalEditor.document.draft;
    dispatch(editorDraftChanged(typeof update === "function" ? update(current) : update));
  }, [dispatch, editorStore]);
  const setConsoleVictory = useCallback((update: ConsoleVictoryUpdate) => {
    const current = editorStore.getState().tacticalEditor.document.consoleVictory;
    dispatch(editorConsoleVictoryChanged(typeof update === "function" ? update(current) : update));
  }, [dispatch, editorStore]);
  const removePlacementConsoleOperations = useCallback((placementId: string) => {
    const current = editorStore.getState().tacticalEditor.document.consoleVictory;
    dispatch(editorConsoleVictoryChanged(removeConsolePlacementOperations(current, placementId)));
    dispatch(editorOperationSelected(null));
  }, [dispatch, editorStore]);

  return {
    draft,
    consoleVictory,
    dirty,
    setDraft,
    setConsoleVictory,
    removePlacementConsoleOperations,
  };
};
