import { useEffect } from "react";
import { useAppDispatch } from "@/store/hooks";
import {
  editorHudLayoutsHydrated,
  editorSessionReset,
} from "@/plugins/characterCombat/editor/state/tacticalEditorSlice";
import {
  loadStoredTacticalEditorHudLayouts,
  subscribeToTacticalEditorHudLayouts,
} from "@/plugins/characterCombat/editor/state/hudLayouts";

export const useTacticalEditorSessionLifecycle = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(editorSessionReset());
    const hydrateHudLayouts = () => dispatch(
      editorHudLayoutsHydrated(loadStoredTacticalEditorHudLayouts()),
    );
    hydrateHudLayouts();
    return subscribeToTacticalEditorHudLayouts(hydrateHudLayouts);
  }, [dispatch]);
};
