"use client";

import { useMemo } from "react";
import type { TacticalConsoleVictoryDefinitionFile } from "@/plugins/characterCombat/tacticalConsoleVictory";
import type { TacticalScenarioDefinitionFile } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import {
  tacticalEditorIssues,
  validateTacticalEditorDocument,
} from "@/plugins/characterCombat/editor/tacticalEditorValidation";

export const useTacticalEditorValidation = (
  draft: TacticalScenarioDefinitionFile,
  consoleVictory: TacticalConsoleVictoryDefinitionFile,
  placementError: string | null,
) => {
  const validation = useMemo(
    () => validateTacticalEditorDocument(draft, consoleVictory),
    [consoleVictory, draft],
  );
  const editorIssues = useMemo(
    () => tacticalEditorIssues(validation, placementError),
    [placementError, validation],
  );

  return {
    ...validation,
    editorIssues,
  };
};
