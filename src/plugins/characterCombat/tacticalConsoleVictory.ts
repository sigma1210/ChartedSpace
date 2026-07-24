import defaultConsoleVictoryJson from "./consoleVictoryDefinitions/default-tactical-control-room.json";

export const TRAVELLER_TASK_DIFFICULTIES = [
  { id: "simple", label: "Simple", target: 2 },
  { id: "easy", label: "Easy", target: 4 },
  { id: "routine", label: "Routine", target: 6 },
  { id: "average", label: "Average", target: 8 },
  { id: "difficult", label: "Difficult", target: 10 },
  { id: "very-difficult", label: "Very Difficult", target: 12 },
  { id: "formidable", label: "Formidable", target: 14 },
] as const;

export type TravellerTaskDifficulty = typeof TRAVELLER_TASK_DIFFICULTIES[number]["id"];

export interface TacticalConsoleTaskCheck {
  id: string;
  skill: string;
  difficulty: TravellerTaskDifficulty;
  apCost: number;
}

export interface TacticalConsoleOperation {
  id: string;
  consolePlacementId: string;
  label: string;
  prerequisites: { mode: "any" | "all"; operationIds: string[] };
  checks: TacticalConsoleTaskCheck[];
  criticalSuccessNextCheckModifier?: number;
  criticalFailureNextCheckModifier?: number;
  result: { type: "unlock"; operationIds: string[] } | { type: "victory" };
  successTransformation?: "ally" | "enemy";
  failureTransformation?: "ally" | "enemy";
}

export interface TacticalConsoleVictoryDefinitionFile {
  schemaVersion: 1;
  id: string;
  scenarioId: string;
  operations: TacticalConsoleOperation[];
}

export const defaultTacticalConsoleVictoryDefinition = defaultConsoleVictoryJson as TacticalConsoleVictoryDefinitionFile;
export const cloneTacticalConsoleVictoryDefinition = (definition: TacticalConsoleVictoryDefinitionFile): TacticalConsoleVictoryDefinitionFile => JSON.parse(JSON.stringify(definition)) as TacticalConsoleVictoryDefinitionFile;
export const travellerTaskTarget = (difficulty: TravellerTaskDifficulty) => TRAVELLER_TASK_DIFFICULTIES.find((entry) => entry.id === difficulty)?.target ?? 8;

export const validateTacticalConsoleVictoryDefinition = (definition: TacticalConsoleVictoryDefinitionFile, consolePlacementIds: string[], interactiveHumanPlacementIds: string[] = []) => {
  const errors: string[] = [];
  if (definition.schemaVersion !== 1) errors.push(`Unsupported console-victory schema version: ${definition.schemaVersion}.`);
  const placements = new Set(consolePlacementIds);
  const interactiveHumans = new Set(interactiveHumanPlacementIds);
  const operationIds = new Set<string>();
  const checkIds = new Set<string>();
  if (definition.operations.length === 0) errors.push("At least one console operation is required.");
  definition.operations.forEach((operation) => {
    if (!operation.id.trim()) errors.push("Console operations require an ID.");
    else if (operationIds.has(operation.id)) errors.push(`Duplicate console operation ID: ${operation.id}.`);
    operationIds.add(operation.id);
    if (!placements.has(operation.consolePlacementId)) errors.push(`Operation ${operation.id} references missing console placement ${operation.consolePlacementId}.`);
    const hasSuccessTransformation = operation.successTransformation !== undefined;
    const hasFailureTransformation = operation.failureTransformation !== undefined;
    if ((hasSuccessTransformation || hasFailureTransformation) && !interactiveHumans.has(operation.consolePlacementId)) errors.push(`Operation ${operation.id} can transform only an interactive-human placement.`);
    if (operation.checks.length === 0) errors.push(`Operation ${operation.id} requires at least one task check.`);
    operation.checks.forEach((check) => {
      if (!check.id.trim() || checkIds.has(check.id)) errors.push(`Task check IDs must be unique: ${check.id || "(empty)"}.`);
      checkIds.add(check.id);
      if (!check.skill.trim()) errors.push(`Task check ${check.id} requires a skill.`);
      if (!TRAVELLER_TASK_DIFFICULTIES.some((entry) => entry.id === check.difficulty)) errors.push(`Task check ${check.id} has an invalid difficulty.`);
      if (!Number.isInteger(check.apCost) || check.apCost < 1 || check.apCost > 6) errors.push(`Task check ${check.id} must cost 1–6 AP.`);
    });
  });
  definition.operations.forEach((operation) => {
    operation.prerequisites.operationIds.forEach((id) => {
      if (!operationIds.has(id)) errors.push(`Operation ${operation.id} has missing predecessor ${id}.`);
      const predecessor = definition.operations.find((candidate) => candidate.id === id);
      if (predecessor && (predecessor.result.type !== "unlock" || !predecessor.result.operationIds.includes(operation.id))) errors.push(`Operation ${id} must unlock predecessor target ${operation.id}.`);
    });
    if (operation.result.type === "unlock") operation.result.operationIds.forEach((id) => {
      if (!operationIds.has(id)) errors.push(`Operation ${operation.id} unlocks missing operation ${id}.`);
      const target = definition.operations.find((candidate) => candidate.id === id);
      if (target && !target.prerequisites.operationIds.includes(operation.id)) errors.push(`Operation ${id} must list ${operation.id} as a predecessor.`);
    });
  });
  if (definition.operations.length > 0 && !definition.operations.some((operation) => operation.result.type === "victory")) errors.push("At least one console operation must produce victory.");
  const initiallyAvailable = definition.operations.filter((operation) => operation.prerequisites.operationIds.length === 0);
  if (definition.operations.length > 0 && initiallyAvailable.length === 0) errors.push("At least one console operation must be initially available.");
  const reachable = new Set(initiallyAvailable.map((operation) => operation.id));
  let changed = true;
  while (changed) {
    changed = false;
    definition.operations.forEach((operation) => {
      if (reachable.has(operation.id)) return;
      const predecessors = operation.prerequisites.operationIds;
      const satisfied = operation.prerequisites.mode === "all" ? predecessors.every((id) => reachable.has(id)) : predecessors.some((id) => reachable.has(id));
      if (satisfied) { reachable.add(operation.id); changed = true; }
    });
  }
  definition.operations.filter((operation) => !reachable.has(operation.id)).forEach((operation) => errors.push(`Operation ${operation.id} is unreachable.`));
  if (errors.length) throw new Error(`Invalid console victory definition ${definition.id}:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  return definition;
};

export const consoleOperationAvailable = (operation: TacticalConsoleOperation, completedOperationIds: readonly string[]) => {
  if (completedOperationIds.includes(operation.id)) return false;
  const predecessors = operation.prerequisites.operationIds;
  if (predecessors.length === 0) return true;
  return operation.prerequisites.mode === "all"
    ? predecessors.every((id) => completedOperationIds.includes(id))
    : predecessors.some((id) => completedOperationIds.includes(id));
};
