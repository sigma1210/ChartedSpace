import type { TacticalConsoleVictoryDefinitionFile } from "@/plugins/characterCombat/tacticalConsoleVictory";
import type { TacticalScenarioDefinitionFile } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type {
  TacticalEditorScenarioSummary,
  TacticalEditorTemplateAsset,
} from "@/plugins/characterCombat/editor/redux/tacticalEditorSlice";

type ApiErrorBody = { error?: string };

export interface TacticalEditorScenarioDocument {
  definition: TacticalScenarioDefinitionFile;
  consoleVictory: TacticalConsoleVictoryDefinitionFile;
}

export interface TacticalEditorSavedScenario extends TacticalEditorScenarioDocument {
  scenario: TacticalEditorScenarioSummary;
}

export const listTacticalScenarios = async (): Promise<TacticalEditorScenarioSummary[]> => {
  const response = await fetch("/api/tactical/scenarios", { cache: "no-store" });
  const body = await response.json() as ApiErrorBody & { scenarios?: TacticalEditorScenarioSummary[] };
  if (!response.ok || !body.scenarios) throw new Error(body.error ?? "Could not list scenario files.");
  return body.scenarios;
};

export const loadTacticalScenario = async (scenarioId: string): Promise<TacticalEditorScenarioDocument> => {
  const response = await fetch(`/api/tactical/scenarios/${encodeURIComponent(scenarioId)}`, { cache: "no-store" });
  const body = await response.json() as ApiErrorBody & Partial<TacticalEditorScenarioDocument>;
  if (!response.ok || !body.definition || !body.consoleVictory) throw new Error(body.error ?? "Could not load the scenario.");
  return { definition: body.definition, consoleVictory: body.consoleVictory };
};

export const createTacticalScenario = async (
  name: string,
  definition: TacticalScenarioDefinitionFile,
  consoleVictory: TacticalConsoleVictoryDefinitionFile,
  failureMessage = "Could not save the scenario.",
): Promise<TacticalEditorSavedScenario> => {
  const response = await fetch("/api/tactical/scenarios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, definition, consoleVictory }),
  });
  const body = await response.json() as ApiErrorBody & Partial<TacticalEditorSavedScenario>;
  if (!response.ok || !body.scenario || !body.definition || !body.consoleVictory) throw new Error(body.error ?? failureMessage);
  return { scenario: body.scenario, definition: body.definition, consoleVictory: body.consoleVictory };
};

export const updateTacticalScenario = async (
  scenarioId: string,
  definition: TacticalScenarioDefinitionFile,
  consoleVictory: TacticalConsoleVictoryDefinitionFile,
): Promise<TacticalEditorSavedScenario> => {
  const response = await fetch(`/api/tactical/scenarios/${encodeURIComponent(scenarioId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ definition, consoleVictory }),
  });
  const body = await response.json() as ApiErrorBody & Partial<TacticalEditorSavedScenario>;
  if (!response.ok || !body.scenario || !body.definition || !body.consoleVictory) throw new Error(body.error ?? "Could not save the scenario.");
  return { scenario: body.scenario, definition: body.definition, consoleVictory: body.consoleVictory };
};

export const deleteTacticalScenario = async (scenarioId: string): Promise<{ id: string; title: string }> => {
  const response = await fetch(
    `/api/tactical/scenarios/${encodeURIComponent(scenarioId)}`,
    { method: "DELETE" },
  );
  const body = await response.json() as ApiErrorBody & { deleted?: { id: string; title: string } };
  if (!response.ok || !body.deleted) throw new Error(body.error ?? "Could not delete the scenario.");
  return body.deleted;
};

export const listTacticalTemplates = async (): Promise<TacticalEditorTemplateAsset[]> => {
  const response = await fetch("/api/tactical/templates", { cache: "no-store" });
  const body = await response.json() as ApiErrorBody & { templates?: TacticalEditorTemplateAsset[] };
  if (!response.ok || !body.templates) throw new Error(body.error ?? "Could not list tracing templates.");
  return body.templates;
};

export const uploadTacticalTemplate = async (file: File): Promise<TacticalEditorTemplateAsset> => {
  const formData = new FormData();
  formData.append("image", file);
  const response = await fetch("/api/tactical/templates", { method: "POST", body: formData });
  const body = await response.json() as ApiErrorBody & { template?: TacticalEditorTemplateAsset };
  if (!response.ok || !body.template) throw new Error(body.error ?? "Could not upload the tracing template.");
  return body.template;
};
