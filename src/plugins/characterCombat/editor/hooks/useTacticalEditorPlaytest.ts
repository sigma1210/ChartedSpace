"use client";

import { useCallback, useState } from "react";
import {
  cloneTacticalConsoleVictoryDefinition,
  type TacticalConsoleVictoryDefinitionFile,
} from "@/plugins/characterCombat/tacticalConsoleVictory";
import {
  cloneTacticalScenarioDefinition,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { createAppStore, type AppStore } from "@/store";
import { useAppStore } from "@/store/hooks";

export type TacticalEditorPlaytestSession = {
  definition: TacticalScenarioDefinitionFile;
  consoleVictory: TacticalConsoleVictoryDefinitionFile;
  sandbox: AppStore;
};

export const useTacticalEditorPlaytest = (
  draft: TacticalScenarioDefinitionFile,
  consoleVictory: TacticalConsoleVictoryDefinitionFile,
  playtestBlocked: boolean,
) => {
  const editorStore = useAppStore();
  const [playtest, setPlaytest] = useState<TacticalEditorPlaytestSession | null>(null);
  const canBeginPlaytest = !playtestBlocked && draft.map.width >= 1 && draft.map.height >= 1;

  const beginPlaytest = useCallback(() => {
    if (!canBeginPlaytest) return;
    setPlaytest({
      definition: cloneTacticalScenarioDefinition(draft),
      consoleVictory: cloneTacticalConsoleVictoryDefinition(consoleVictory),
      sandbox: createAppStore(editorStore.getState()),
    });
  }, [canBeginPlaytest, consoleVictory, draft, editorStore]);

  const exitPlaytest = useCallback(() => setPlaytest(null), []);

  return {
    playtest,
    canBeginPlaytest,
    beginPlaytest,
    exitPlaytest,
  };
};
