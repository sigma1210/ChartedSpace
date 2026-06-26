import type { GenerationAction } from "../types";
import type { LifepathGeneratorDefinition } from "../lifepathTypes";
import {
  applyLifepathEffects,
  effectSummary,
} from "./effects";
import { findTable } from "./lookups";
import { appendTrackedAction } from "./logging";
import type { LifepathRuntimePhase, LifepathRuntimeState } from "./runtimeTypes";

const postBackgroundPhase = (
  definition: LifepathGeneratorDefinition,
): LifepathRuntimePhase =>
  definition.preCareerEducation?.length ? "pre-career-choice" : "choose-career";

export const selectBackgroundSkill = (
  state: LifepathRuntimeState,
  definition: LifepathGeneratorDefinition,
  tableId: string,
  entryId: string,
  source: GenerationAction["source"] = "player",
): LifepathRuntimeState => {
  if (state.phase !== "background") {
    throw new Error(`Cannot select a background skill during ${state.phase}.`);
  }
  const table = findTable(definition, tableId);
  if (!table) throw new Error(`Unknown lifepath table: ${tableId}`);
  const entry = table.entries.find((candidate) => candidate.id === entryId);
  if (!entry) throw new Error(`Unknown background skill entry: ${entryId}`);

  const action: GenerationAction = {
    id: `background.${table.id}.${entry.id}`,
    type: "background.skill.select",
    source,
    stepId: "lifepath.background-skill",
    term: null,
    payload: {
      tableId: table.id,
      entryId: entry.id,
    },
  };
  const tracked = appendTrackedAction({
    state,
    action,
    label: `Background Skill: ${entry.label}`,
    data: {
      tableId: table.id,
      tableLabel: table.label,
      entryId: entry.id,
      entryLabel: entry.label,
      effectSummary: effectSummary(entry.effects),
    },
  });

  return {
    ...applyLifepathEffects(tracked, entry.effects),
    phase: postBackgroundPhase(definition),
  };
};
