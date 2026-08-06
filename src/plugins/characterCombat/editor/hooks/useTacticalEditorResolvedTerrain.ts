"use client";

import { useMemo } from "react";
import {
  resolveTacticalScenarioTerrain,
  type ResolvedTacticalScenarioTerrain,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";

export type TacticalEditorResolvedTerrain = {
  terrain: ResolvedTacticalScenarioTerrain | null;
  error: string | null;
};

export const resolveTacticalEditorTerrain = (
  definition: TacticalScenarioDefinitionFile,
  resolveTerrain: typeof resolveTacticalScenarioTerrain = resolveTacticalScenarioTerrain,
): TacticalEditorResolvedTerrain => {
  try {
    return { terrain: resolveTerrain(definition), error: null };
  } catch (error) {
    return {
      terrain: null,
      error: error instanceof Error ? error.message : "The draft could not be resolved.",
    };
  }
};

export const useTacticalEditorResolvedTerrain = (
  definition: TacticalScenarioDefinitionFile,
) => useMemo(() => resolveTacticalEditorTerrain(definition), [definition]);
