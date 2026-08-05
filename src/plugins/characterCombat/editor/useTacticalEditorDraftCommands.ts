"use client";

import { useCallback } from "react";
import type { TacticalEditorFileMessage } from "@/plugins/characterCombat/editor/state/tacticalEditorSlice";
import {
  editorDocumentDiscarded,
  editorSelectionCleared,
} from "@/plugins/characterCombat/editor/state/tacticalEditorSlice";
import { useAppDispatch } from "@/store/hooks";

type TacticalEditorDraftCommandOptions = {
  dirty: boolean;
  clearInteractionState: () => void;
  clearDrawingTool: () => void;
  clearEnemyTool: () => void;
  changeFileMessage: (message: TacticalEditorFileMessage) => void;
};

export const useTacticalEditorDraftCommands = ({
  dirty,
  clearInteractionState,
  clearDrawingTool,
  clearEnemyTool,
  changeFileMessage,
}: TacticalEditorDraftCommandOptions) => {
  const dispatch = useAppDispatch();
  const clearEditorTransientState = useCallback(() => {
    clearInteractionState();
  }, [clearInteractionState]);
  const clearEditorSelection = useCallback(() => {
    dispatch(editorSelectionCleared());
    clearDrawingTool();
    clearEnemyTool();
    clearEditorTransientState();
  }, [clearDrawingTool, clearEditorTransientState, clearEnemyTool, dispatch]);
  const discardDraftChanges = useCallback(() => {
    if (
      !dirty
      || !window.confirm(
        "Discard all unsaved changes and return to the last loaded or saved version?",
      )
    ) return;
    dispatch(editorDocumentDiscarded());
    clearEditorSelection();
    changeFileMessage({ kind: "success", text: "Discarded unsaved draft changes." });
  }, [changeFileMessage, clearEditorSelection, dirty, dispatch]);

  return {
    clearEditorTransientState,
    clearEditorSelection,
    discardDraftChanges,
  };
};
