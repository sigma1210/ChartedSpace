import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/store/hooks";
import {
  editorFileMessageChanged,
  editorScenarioIndexFailed,
  editorScenarioIndexReceived,
  editorScenarioIndexRequested,
  editorTemplateIndexFailed,
  editorTemplateIndexReceived,
  editorTemplateIndexRequested,
} from "@/plugins/characterCombat/editor/redux/tacticalEditorSlice";
import {
  listTacticalScenarios,
  listTacticalTemplates,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorApi";

export const useTacticalEditorResourceIndexes = () => {
  const dispatch = useAppDispatch();

  const refreshScenarioList = useCallback(async () => {
    dispatch(editorScenarioIndexRequested());
    try {
      const scenarios = await listTacticalScenarios();
      dispatch(editorScenarioIndexReceived(scenarios));
    } catch (error) {
      dispatch(editorScenarioIndexFailed());
      throw error;
    }
  }, [dispatch]);

  useEffect(() => {
    let cancelled = false;
    dispatch(editorScenarioIndexRequested());
    void listTacticalScenarios().then((scenarios) => {
      if (cancelled) return;
      dispatch(editorScenarioIndexReceived(scenarios));
    }).catch((error) => {
      if (!cancelled) {
        dispatch(editorScenarioIndexFailed());
        dispatch(editorFileMessageChanged({
          kind: "error",
          text: error instanceof Error ? error.message : "Could not list scenario files.",
        }));
      }
    });
    return () => { cancelled = true; };
  }, [dispatch]);

  useEffect(() => {
    let cancelled = false;
    dispatch(editorTemplateIndexRequested());
    void listTacticalTemplates().then((templates) => {
      if (!cancelled) dispatch(editorTemplateIndexReceived(templates));
    }).catch((error) => {
      if (!cancelled) {
        dispatch(editorTemplateIndexFailed(
          error instanceof Error ? error.message : "Could not list tracing templates.",
        ));
      }
    });
    return () => { cancelled = true; };
  }, [dispatch]);

  return { refreshScenarioList };
};
