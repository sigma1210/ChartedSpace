import type { GenerationAction } from "../types";
import type { LifepathGeneratorDefinition } from "../lifepathTypes";
import {
  applyLifepathEffects,
  effectSummary,
} from "./effects";
import { resolveCheckRoll } from "./checks";
import {
  findCareer,
  findTable,
  findTableEntry,
} from "./lookups";
import { appendTrackedAction } from "./logging";
import { payloadString } from "./payload";
import type {
  LifepathMusterOutTerm,
  LifepathRollProvider,
  LifepathRuntimeState,
} from "./runtimeTypes";

export const selectPendingChoice = (
  state: LifepathRuntimeState,
  choiceId: string,
  source: GenerationAction["source"] = "player",
): LifepathRuntimeState => {
  if (!state.pendingChoice) throw new Error("No lifepath table choice is pending.");
  const choice = state.pendingChoice.options.find((option) => option.id === choiceId);
  if (!choice) throw new Error(`Unknown lifepath table choice: ${choiceId}`);

  const action: GenerationAction = {
    id: `term-${state.term}.table.choice.select`,
    type: "table.choice.select",
    source,
    stepId: state.pendingChoice.id,
    term: state.term,
    payload: {
      choiceId: choice.id,
    },
  };
  const tracked = appendTrackedAction({
    state,
    action,
    label: `Choice: ${choice.label}`,
    data: {
      choiceId: choice.id,
      choiceLabel: choice.label,
      effectSummary: effectSummary(choice.effects),
    },
  });
  const withEffects = applyLifepathEffects(tracked, choice.effects, {
    eventId: action.id,
    eventType: action.type,
    careerId: state.selectedCareerId ?? undefined,
    term: state.term,
  });

  return {
    ...withEffects,
    phase: state.pendingChoice.resumePhase,
    pendingChoice: null,
  };
};

const appendLifecycleChoice = (
  state: LifepathRuntimeState,
  type: "term.continue" | "career.change" | "generation.muster-out",
  label: string,
  source: GenerationAction["source"] = "player",
): LifepathRuntimeState => {
  const action: GenerationAction = {
    id: `term-${state.term}.${type}`,
    type,
    source,
    stepId: "lifepath.term-complete",
    term: state.term,
    payload: {
      careerId: state.selectedCareerId,
      assignmentId: state.selectedAssignmentId,
    },
  };

  return appendTrackedAction({
    state,
    action,
    label,
    data: {
      careerId: state.selectedCareerId,
      assignmentId: state.selectedAssignmentId,
    },
  });
};

export const continueLifepathCareer = (
  definition: LifepathGeneratorDefinition,
  state: LifepathRuntimeState,
  source: GenerationAction["source"] = "player",
): LifepathRuntimeState => {
  if (state.phase !== "term-complete") {
    throw new Error(`Cannot continue a career during ${state.phase}.`);
  }
  if (!state.selectedCareerId || !state.selectedAssignmentId) {
    throw new Error("Cannot continue without an active career and assignment.");
  }

  const tracked = appendLifecycleChoice(state, "term.continue", "Continue Career", source);
  const career = findCareer(definition, state.selectedCareerId);
  return {
    ...tracked,
    phase: career?.reenlistment ? "reenlistment" : "ready-for-term",
    term: career?.reenlistment ? state.term : state.term + 1,
    termSurvived: null,
  };
};

export const resolveReenlistmentPhase = (
  state: LifepathRuntimeState,
  definition: LifepathGeneratorDefinition,
  rollProvider: LifepathRollProvider,
): LifepathRuntimeState => {
  if (state.phase !== "reenlistment") {
    throw new Error(`Cannot resolve reenlistment during ${state.phase}.`);
  }
  if (!state.selectedCareerId || !state.selectedAssignmentId) {
    throw new Error("Cannot resolve reenlistment without an active career and assignment.");
  }

  const career = findCareer(definition, state.selectedCareerId);
  if (!career) throw new Error(`Unknown lifepath career: ${state.selectedCareerId}`);
  if (!career.reenlistment) {
    return {
      ...state,
      phase: "ready-for-term",
      term: state.term + 1,
    };
  }

  const check = resolveCheckRoll({
    state,
    check: career.reenlistment,
    rollProvider,
    reason: "reenlistment",
  });
  const reenlisted = check.passed;
  const successOutcome = payloadString(career.reenlistment.data, "successOutcome") ?? "may-continue";
  const failureOutcome = payloadString(career.reenlistment.data, "failureOutcome") ?? "not-retained";
  const outcome = reenlisted ? successOutcome : failureOutcome;
  const action: GenerationAction = {
    id: `term-${state.term}.reenlistment`,
    type: "reenlistment.roll",
    source: "system",
    stepId: "lifepath.term.reenlistment",
    term: state.term,
    roll: check.roll,
    payload: {
      careerId: career.id,
      careerLabel: career.label,
      roll: check.roll,
      total: check.total,
      target: career.reenlistment.target,
      characteristicId: check.characteristicId,
      characteristicScore: check.characteristicScore,
      characteristicModifier: check.characteristicModifier,
      skillName: check.skillName,
      skillLevel: check.skillLevel,
      skillModifier: check.skillModifier,
      reenlisted,
      outcome,
      successOutcome,
      failureOutcome,
    },
  };
  const reenlistmentEffects = reenlisted
    ? career.reenlistment.successEffects ?? []
    : career.reenlistment.failureEffects ?? [];
  const tracked = appendTrackedAction({
    state,
    action,
    label: `${career.reenlistment.label}: ${reenlisted ? "Continued" : "Not retained"}`,
    data: {
      careerId: career.id,
      careerLabel: career.label,
      roll: check.roll,
      total: check.total,
      target: career.reenlistment.target,
      characteristicId: check.characteristicId,
      characteristicScore: check.characteristicScore,
      characteristicModifier: check.characteristicModifier,
      skillName: check.skillName,
      skillLevel: check.skillLevel,
      skillModifier: check.skillModifier,
      reenlisted,
      outcome,
      successOutcome,
      failureOutcome,
      effectSummary: effectSummary(reenlistmentEffects),
    },
  });
  const withEffects = applyLifepathEffects(
    tracked,
    reenlistmentEffects,
  );

  return {
    ...withEffects,
    phase: reenlisted ? "ready-for-term" : "choose-career",
    term: state.term + 1,
    selectedCareerId: reenlisted ? state.selectedCareerId : null,
    selectedAssignmentId: reenlisted ? state.selectedAssignmentId : null,
    careerRank: reenlisted ? state.careerRank : 0,
    commissioned: reenlisted ? state.commissioned : false,
    termSurvived: null,
  };
};

export const changeLifepathCareer = (
  state: LifepathRuntimeState,
  source: GenerationAction["source"] = "player",
): LifepathRuntimeState => {
  if (state.phase !== "term-complete") {
    throw new Error(`Cannot change career during ${state.phase}.`);
  }

  const tracked = appendLifecycleChoice(state, "career.change", "Change Career", source);
  return {
    ...tracked,
    phase: "choose-career",
    term: state.term + 1,
    selectedCareerId: null,
    selectedAssignmentId: null,
    termSurvived: null,
    careerRank: 0,
    commissioned: false,
  };
};

export const musterOutLifepath = (
  state: LifepathRuntimeState,
  source: GenerationAction["source"] = "player",
): LifepathRuntimeState => {
  if (state.phase !== "term-complete") {
    throw new Error(`Cannot muster out during ${state.phase}.`);
  }

  const tracked = appendLifecycleChoice(state, "generation.muster-out", "Muster Out", source);
  const pendingTerms = getCompletedCareerTerms(state);
  return {
    ...tracked,
    phase: pendingTerms.length > 0 ? "muster-out" : "generation-complete",
    musterOut: pendingTerms.length > 0
      ? { pendingTerms, selectedBenefitTableId: null }
      : null,
  };
};

const getCompletedCareerTerms = (
  state: LifepathRuntimeState,
): LifepathMusterOutTerm[] =>
  state.careerHistory.map((entry) => ({
    term: entry.term,
    careerId: entry.careerId,
  }));

export const getCurrentMusterOutBenefit = (
  state: LifepathRuntimeState,
  definition: LifepathGeneratorDefinition,
) => {
  const term = state.musterOut?.pendingTerms[0];
  if (!term) return null;

  const career = findCareer(definition, term.careerId);
  if (!career) throw new Error(`Unknown lifepath career: ${term.careerId}`);

  const tables = career.benefitTableIds.map((tableId) => {
    const table = findTable(definition, tableId);
    if (!table) throw new Error(`Unknown lifepath table: ${tableId}`);
    if (!table.notation) throw new Error(`Lifepath table has no roll notation: ${tableId}`);
    return table;
  });
  const tableId = state.musterOut?.selectedBenefitTableId ?? (
    tables.length === 1 ? tables[0]?.id ?? null : null
  );
  const table = tableId
    ? tables.find((candidate) => candidate.id === tableId) ?? null
    : null;

  return {
    term,
    career,
    tables,
    tableId,
    table,
  };
};

export const selectMusterOutBenefitTable = (
  state: LifepathRuntimeState,
  definition: LifepathGeneratorDefinition,
  tableId: string,
  source: GenerationAction["source"] = "player",
): LifepathRuntimeState => {
  if (state.phase !== "muster-out") {
    throw new Error(`Cannot select a muster-out benefit during ${state.phase}.`);
  }
  if (!state.musterOut) throw new Error("No muster-out benefits are pending.");

  const current = getCurrentMusterOutBenefit(state, definition);
  if (!current) throw new Error("No muster-out benefit term is pending.");
  const table = current.tables.find((candidate) => candidate.id === tableId);
  if (!table) throw new Error(`Unknown muster-out benefit table for ${current.career.id}: ${tableId}`);

  const action: GenerationAction = {
    id: `term-${current.term.term}.benefit.choose.${table.id}`,
    type: "benefit.choice",
    source,
    stepId: "lifepath.muster-out-benefit-choice",
    term: current.term.term,
    payload: {
      careerId: current.career.id,
      tableId: table.id,
    },
  };
  const tracked = appendTrackedAction({
    state,
    action,
    label: `${current.career.label} Benefit Choice: ${table.label}`,
    data: {
      careerId: current.career.id,
      tableId: table.id,
      tableLabel: table.label,
    },
  });

  return {
    ...tracked,
    musterOut: {
      ...state.musterOut,
      selectedBenefitTableId: table.id,
    },
  };
};

export const resolveMusterOutPhase = (
  state: LifepathRuntimeState,
  definition: LifepathGeneratorDefinition,
  rollProvider: LifepathRollProvider,
): LifepathRuntimeState => {
  if (state.phase !== "muster-out") {
    throw new Error(`Cannot resolve muster out during ${state.phase}.`);
  }
  if (!state.musterOut) throw new Error("No muster-out benefits are pending.");

  const current = getCurrentMusterOutBenefit(state, definition);
  if (!current) {
    return {
      ...state,
      phase: "generation-complete",
      musterOut: null,
    };
  }
  if (!current.table) {
    throw new Error(`No muster-out benefit table selected for ${current.career.id}.`);
  }

  const roll = rollProvider.roll({
    id: current.table.id,
    notation: current.table.notation ?? "1d6",
    reason: "muster out",
  });
  const result = findTableEntry(current.table, roll);
  if (!result) {
    throw new Error(`No lifepath table entry for ${current.table.id} roll ${roll}.`);
  }

  const action: GenerationAction = {
    id: `term-${current.term.term}.benefit.${current.table.id}`,
    type: "benefit.roll",
    source: "system",
    stepId: "lifepath.muster-out",
    term: current.term.term,
    roll,
    payload: {
      careerId: current.career.id,
      tableId: current.table.id,
      entryId: result.id,
    },
  };
  const tracked = appendTrackedAction({
    state,
    action,
    label: `${current.career.label} Benefit: ${result.label}`,
    data: {
      careerId: current.career.id,
      tableId: current.table.id,
      tableLabel: current.table.label,
      entryId: result.id,
      entryLabel: result.label,
      roll,
      effectSummary: effectSummary(result.effects),
    },
  });

  const withBenefits = applyLifepathEffects(tracked, result.effects);
  const remainingTerms = state.musterOut.pendingTerms.slice(1);

  return {
    ...withBenefits,
    phase: remainingTerms.length > 0 ? "muster-out" : "generation-complete",
    musterOut: remainingTerms.length > 0
      ? {
          pendingTerms: remainingTerms,
          selectedBenefitTableId: null,
        }
      : null,
  };
};
