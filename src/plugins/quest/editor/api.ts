import type { TacticalScenarioDefinitionFile } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { QuestEditorScenarioSummary } from "./types";

type ApiErrorBody = { error?: string };

export const listQuestSourceScenarios = async (): Promise<QuestEditorScenarioSummary[]> => {
  const response = await fetch("/api/tactical/scenarios", { cache: "no-store" });
  const body = await response.json() as ApiErrorBody & { scenarios?: QuestEditorScenarioSummary[] };
  if (!response.ok || !body.scenarios) {
    throw new Error(body.error ?? "Could not list Tactical scenarios.");
  }
  return body.scenarios;
};

export const loadQuestSourceScenario = async (
  scenarioId: string,
): Promise<TacticalScenarioDefinitionFile> => {
  const response = await fetch(
    `/api/tactical/scenarios/${encodeURIComponent(scenarioId)}`,
    { cache: "no-store" },
  );
  const body = await response.json() as ApiErrorBody & {
    definition?: TacticalScenarioDefinitionFile;
  };
  if (!response.ok || !body.definition) {
    throw new Error(body.error ?? "Could not load the Tactical scenario.");
  }
  return body.definition;
};

