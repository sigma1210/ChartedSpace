import type { GenerationAction } from "../types";
import type { LifepathGeneratorDefinition } from "../lifepathTypes";
import {
  applyLifepathEffects,
  effectSummary,
} from "./effects";
import {
  findTable,
  findTableEntry,
} from "./lookups";
import { appendTrackedAction } from "./logging";
import type {
  LifepathRollProvider,
  LifepathRuntimePhase,
  LifepathRuntimeState,
} from "./runtimeTypes";

export type LifepathHistoryStage = "background" | "preCareer" | "careerTerm" | "musterOut";

export type ResolveLifepathTable = (input: {
  state: LifepathRuntimeState;
  definition: LifepathGeneratorDefinition;
  tableId: string;
  rollProvider: LifepathRollProvider;
  reason: string;
  term?: number | null;
  historyStage?: LifepathHistoryStage;
  resumePhase: LifepathRuntimePhase;
}) => LifepathRuntimeState;

export const resolveTable: ResolveLifepathTable = ({
  state,
  definition,
  tableId,
  rollProvider,
  reason,
  term = state.term,
  historyStage,
  resumePhase,
}) => {
  const table = findTable(definition, tableId);
  if (!table) throw new Error(`Unknown lifepath table: ${tableId}`);
  if (!table.notation) throw new Error(`Lifepath table has no roll notation: ${tableId}`);

  const roll = rollProvider.roll({
    id: table.id,
    notation: table.notation,
    reason,
  });
  const entry = findTableEntry(table, roll);
  if (!entry) throw new Error(`No lifepath table entry for ${tableId} roll ${roll}.`);

  const action: GenerationAction = {
    id: `${term === null ? "pre-career" : `term-${term}`}.${table.scope}.${table.id}`,
    type: `${table.scope}.roll`,
    source: "system",
    term,
    roll,
    payload: {
      tableId,
      entryId: entry.id,
    },
  };
  const tracked = appendTrackedAction({
    state,
    action,
    label: `${table.label}: ${entry.label}`,
    data: {
      tableId,
      tableLabel: table.label,
      entryId: entry.id,
      entryLabel: entry.label,
      roll,
      ...(historyStage ? { historyStage } : {}),
      effectSummary: effectSummary(entry.effects),
    },
  });

  const withEntryEffects = applyLifepathEffects(tracked, entry.effects, {
    eventId: action.id,
    eventType: action.type,
    careerId: state.selectedCareerId ?? undefined,
    term: term ?? undefined,
  });
  if (!entry.choices || entry.choices.length === 0) return withEntryEffects;

  return {
    ...withEntryEffects,
    pendingChoice: {
      id: `${table.id}.${entry.id}.choice`,
      title: entry.label,
      prompt: entry.choicePrompt ?? "Choose one result.",
      resumePhase,
      options: entry.choices,
    },
  };
};
