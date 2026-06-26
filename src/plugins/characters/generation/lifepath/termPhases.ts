import type { GenerationAction } from "../types";
import type {
  LifepathCareerDefinition,
  LifepathEffect,
  LifepathGeneratorDefinition,
} from "../lifepathTypes";
import {
  applyLifepathEffects,
  effectSummary,
} from "./effects";
import { resolveCheckRoll } from "./checks";
import {
  findAssignment,
  findCareer,
  findTable,
} from "./lookups";
import { appendTrackedAction } from "./logging";
import { commissionHistoryModifiers } from "./modifiers";
import {
  payloadBoolean,
  payloadNumber,
  payloadString,
} from "./payload";
import type {
  LifepathCareerHistoryEntry,
  LifepathRollProvider,
  LifepathRuntimePhase,
  LifepathRuntimeState,
} from "./runtimeTypes";
import type { ResolveLifepathTable } from "./tableResolution";

export const nextSuccessfulTermPhase = (
  definition: LifepathGeneratorDefinition,
  career: LifepathCareerDefinition,
  assignmentId: string | null,
): LifepathRuntimePhase => {
  const assignment = assignmentId ? findAssignment(career, assignmentId) : null;
  const skillTableId = assignment?.skillTableIds?.[0] ?? career.skillTableIds[0];
  return skillTableId && findTable(definition, skillTableId) ? "skill" : "event";
};

const promotedRankFromEffects = (
  state: LifepathRuntimeState,
  effects: readonly LifepathEffect[] | undefined,
) => state.careerRank + (effects ?? [])
  .filter((effect) => effect.type === "career.promote")
  .reduce((total, effect) => total + (payloadNumber(effect.payload, "ranks") ?? 1), 0);

const careerRankTitle = (
  career: LifepathCareerDefinition,
  rank: number,
  commissioned = false,
): string | null =>
  career.ranks
    ?.filter((item) => item.rank <= rank)
    .filter((item) => (item.track ?? "enlisted") === (commissioned ? "officer" : "enlisted"))
    .sort((left, right) => right.rank - left.rank)[0]?.title ?? null;

const crossedRanks = (
  career: LifepathCareerDefinition,
  fromRank: number,
  toRank: number,
  commissioned: boolean,
) => (career.ranks ?? [])
  .filter((rank) => (rank.track ?? "enlisted") === (commissioned ? "officer" : "enlisted"))
  .filter((rank) => rank.rank > fromRank && rank.rank <= toRank && (rank.effects?.length ?? 0) > 0)
  .sort((left, right) => left.rank - right.rank);

const termHistoryFromState = (
  state: LifepathRuntimeState,
): LifepathCareerHistoryEntry | null => {
  const survivalEntry = [...state.log]
    .reverse()
    .find((entry) => entry.type === "survival.roll" && entry.term === state.term);
  const careerId = state.selectedCareerId
    ?? (survivalEntry ? payloadString(survivalEntry.data, "careerId") : null);
  if (!careerId) return null;
  const assignmentId = state.selectedAssignmentId
    ?? (survivalEntry ? payloadString(survivalEntry.data, "assignmentId") : null);
  const survived = typeof state.termSurvived === "boolean"
    ? state.termSurvived
    : survivalEntry
      ? payloadBoolean(survivalEntry.data, "survived") ?? false
      : false;

  return {
    term: state.term,
    careerId,
    assignmentId,
    survived,
    rank: state.careerRank,
    commissioned: state.commissioned,
  };
};

export const resolveCommissionPhase = (
  state: LifepathRuntimeState,
  definition: LifepathGeneratorDefinition,
  rollProvider: LifepathRollProvider,
): LifepathRuntimeState => {
  if (state.phase !== "commission") {
    throw new Error(`Cannot resolve commission during ${state.phase}.`);
  }
  if (!state.selectedCareerId) throw new Error("Cannot resolve commission without a career.");

  const career = findCareer(definition, state.selectedCareerId);
  if (!career) throw new Error(`Unknown lifepath career: ${state.selectedCareerId}`);
  if (!career.commission) return { ...state, phase: "ready-for-term" };
  const modifiers = commissionHistoryModifiers(state, career);

  const check = resolveCheckRoll({
    state,
    check: career.commission,
    modifiers,
    rollProvider,
    reason: "commission",
  });
  const commissioned = check.passed;
  const action: GenerationAction = {
    id: `term-${state.term}.commission`,
    type: "commission.roll",
    source: "system",
    stepId: "lifepath.term.commission",
    term: state.term,
    roll: check.roll,
    payload: {
      careerId: career.id,
      careerLabel: career.label,
      roll: check.roll,
      total: check.total,
      target: career.commission.target,
      characteristicId: check.characteristicId,
      characteristicScore: check.characteristicScore,
      characteristicModifier: check.characteristicModifier,
      skillName: check.skillName,
      skillLevel: check.skillLevel,
      skillModifier: check.skillModifier,
      modifiers: check.modifiers.map((modifier) => ({
        id: modifier.id,
        label: modifier.label,
        modifier: modifier.modifier,
      })),
      extraModifierTotal: check.modifierTotal,
      commissioned,
    },
  };
  const commissionEffects = commissioned
    ? career.commission.successEffects ?? []
    : career.commission.failureEffects ?? [];
  const tracked = appendTrackedAction({
    state,
    action,
    label: `${career.commission.label}: ${commissioned ? "Commissioned" : "No commission"}`,
    data: {
      careerId: career.id,
      careerLabel: career.label,
      roll: check.roll,
      total: check.total,
      target: career.commission.target,
      characteristicId: check.characteristicId,
      characteristicScore: check.characteristicScore,
      characteristicModifier: check.characteristicModifier,
      skillName: check.skillName,
      skillLevel: check.skillLevel,
      skillModifier: check.skillModifier,
      modifiers: check.modifiers.map((modifier) => ({
        id: modifier.id,
        label: modifier.label,
        modifier: modifier.modifier,
      })),
      extraModifierTotal: check.modifierTotal,
      commissioned,
      effectSummary: effectSummary(commissionEffects),
    },
  });
  const withEffects = applyLifepathEffects(
    tracked,
    commissionEffects,
  );

  return {
    ...withEffects,
    phase: "ready-for-term",
    commissioned: state.commissioned || commissioned,
  };
};

export const resolveSurvivalPhase = (
  state: LifepathRuntimeState,
  definition: LifepathGeneratorDefinition,
  rollProvider: LifepathRollProvider,
): LifepathRuntimeState => {
  if (state.phase !== "ready-for-term" && state.phase !== "survival") {
    throw new Error(`Cannot resolve survival during ${state.phase}.`);
  }
  if (!state.selectedCareerId) throw new Error("Cannot resolve survival without a career.");

  const career = findCareer(definition, state.selectedCareerId);
  if (!career) throw new Error(`Unknown lifepath career: ${state.selectedCareerId}`);

  const check = resolveCheckRoll({
    state,
    check: career.survival,
    rollProvider,
    reason: "survival",
  });
  const survived = check.passed;
  const survivalAction: GenerationAction = {
    id: `term-${state.term}.survival`,
    type: "survival.roll",
    source: "system",
    term: state.term,
    roll: check.roll,
    payload: {
      careerId: career.id,
      assignmentId: state.selectedAssignmentId,
      roll: check.roll,
      total: check.total,
      target: career.survival.target,
      characteristicId: check.characteristicId,
      characteristicScore: check.characteristicScore,
      characteristicModifier: check.characteristicModifier,
      skillName: check.skillName,
      skillLevel: check.skillLevel,
      skillModifier: check.skillModifier,
      survived,
    },
  };
  const survivalEffects = survived
    ? career.survival.successEffects ?? []
    : career.survival.failureEffects ?? [];
  const tracked = appendTrackedAction({
    state,
    action: survivalAction,
    label: `${career.survival.label}: ${survived ? "Survived" : "Mishap"}`,
    data: {
      careerId: career.id,
      assignmentId: state.selectedAssignmentId,
      roll: check.roll,
      total: check.total,
      target: career.survival.target,
      characteristicId: check.characteristicId,
      characteristicScore: check.characteristicScore,
      characteristicModifier: check.characteristicModifier,
      skillName: check.skillName,
      skillLevel: check.skillLevel,
      skillModifier: check.skillModifier,
      survived,
      effectSummary: effectSummary(survivalEffects),
    },
  });
  const withEffects = applyLifepathEffects(
    tracked,
    survivalEffects,
  );

  return {
    ...withEffects,
    phase: survived ? nextSuccessfulTermPhase(definition, career, state.selectedAssignmentId) : "mishap",
    termSurvived: survived,
  };
};

export const resolveSkillPhase = (
  state: LifepathRuntimeState,
  definition: LifepathGeneratorDefinition,
  rollProvider: LifepathRollProvider,
  resolveTable: ResolveLifepathTable,
): LifepathRuntimeState => {
  if (state.phase !== "skill") throw new Error(`Cannot resolve skill during ${state.phase}.`);
  if (!state.selectedCareerId) throw new Error("Cannot resolve skill without a career.");

  const career = findCareer(definition, state.selectedCareerId);
  if (!career) throw new Error(`Unknown lifepath career: ${state.selectedCareerId}`);
  const assignment = state.selectedAssignmentId
    ? findAssignment(career, state.selectedAssignmentId)
    : null;
  const tableId = assignment?.skillTableIds?.[0] ?? career.skillTableIds[0];
  if (!tableId) return { ...state, phase: "event" };

  const next = resolveTable({
    state,
    definition,
    tableId,
    rollProvider,
    reason: "term skill",
    resumePhase: "event",
  });

  return {
    ...next,
    phase: next.pendingChoice ? state.phase : "event",
  };
};

export const resolveEventPhase = (
  state: LifepathRuntimeState,
  definition: LifepathGeneratorDefinition,
  rollProvider: LifepathRollProvider,
  resolveTable: ResolveLifepathTable,
): LifepathRuntimeState => {
  if (state.phase !== "event") throw new Error(`Cannot resolve event during ${state.phase}.`);
  if (!state.selectedCareerId) throw new Error("Cannot resolve event without a career.");

  const career = findCareer(definition, state.selectedCareerId);
  if (!career) throw new Error(`Unknown lifepath career: ${state.selectedCareerId}`);

  const next = resolveTable({
    state,
    definition,
    tableId: career.eventTableId,
    rollProvider,
    reason: "career event",
    resumePhase: career.advancement ? "advancement" : "aging",
  });

  return {
    ...next,
    phase: next.pendingChoice ? state.phase : career.advancement ? "advancement" : "aging",
  };
};

export const resolveMishapPhase = (
  state: LifepathRuntimeState,
  definition: LifepathGeneratorDefinition,
  rollProvider: LifepathRollProvider,
  resolveTable: ResolveLifepathTable,
): LifepathRuntimeState => {
  if (state.phase !== "mishap") throw new Error(`Cannot resolve mishap during ${state.phase}.`);
  if (!state.selectedCareerId) throw new Error("Cannot resolve mishap without a career.");

  const career = findCareer(definition, state.selectedCareerId);
  if (!career) throw new Error(`Unknown lifepath career: ${state.selectedCareerId}`);

  const next = resolveTable({
    state,
    definition,
    tableId: career.mishapTableId,
    rollProvider,
    reason: "mishap",
    resumePhase: "aging",
  });

  return {
    ...next,
    phase: next.pendingChoice ? state.phase : "aging",
  };
};

export const resolveAdvancementPhase = (
  state: LifepathRuntimeState,
  definition: LifepathGeneratorDefinition,
  rollProvider: LifepathRollProvider,
): LifepathRuntimeState => {
  if (state.phase !== "advancement") {
    throw new Error(`Cannot resolve advancement during ${state.phase}.`);
  }
  if (!state.selectedCareerId) throw new Error("Cannot resolve advancement without a career.");

  const career = findCareer(definition, state.selectedCareerId);
  if (!career) throw new Error(`Unknown lifepath career: ${state.selectedCareerId}`);
  if (!career.advancement) return { ...state, phase: "aging" };

  const check = resolveCheckRoll({
    state,
    check: career.advancement,
    rollProvider,
    reason: "advancement",
  });
  const advanced = check.passed;
  const promotedRank = advanced
    ? promotedRankFromEffects(state, career.advancement.successEffects)
    : state.careerRank;
  const promotedRankTitle = advanced ? careerRankTitle(career, promotedRank, state.commissioned) : null;
  const advancementAction: GenerationAction = {
    id: `term-${state.term}.advancement`,
    type: "advancement.roll",
    source: "system",
    term: state.term,
    roll: check.roll,
    payload: {
      careerId: career.id,
      roll: check.roll,
      total: check.total,
      target: career.advancement.target,
      characteristicId: check.characteristicId,
      characteristicScore: check.characteristicScore,
      characteristicModifier: check.characteristicModifier,
      skillName: check.skillName,
      skillLevel: check.skillLevel,
      skillModifier: check.skillModifier,
      advanced,
      rank: promotedRank,
      rankTitle: promotedRankTitle,
      careerLabel: career.label,
    },
  };
  const tracked = appendTrackedAction({
    state,
    action: advancementAction,
    label: `${career.advancement.label}: ${advanced ? "Advanced" : "No advancement"}`,
    data: {
      careerId: career.id,
      roll: check.roll,
      total: check.total,
      target: career.advancement.target,
      characteristicId: check.characteristicId,
      characteristicScore: check.characteristicScore,
      characteristicModifier: check.characteristicModifier,
      skillName: check.skillName,
      skillLevel: check.skillLevel,
      skillModifier: check.skillModifier,
      advanced,
      rank: promotedRank,
      rankTitle: promotedRankTitle,
      careerLabel: career.label,
    },
  });
  let withEffects = applyLifepathEffects(
    tracked,
    advanced
      ? career.advancement.successEffects ?? []
      : career.advancement.failureEffects ?? [],
  );
  if (advanced) {
    for (const rank of crossedRanks(career, state.careerRank, promotedRank, state.commissioned)) {
      const rankEffectSummary = effectSummary(rank.effects ?? []);
      const rankAction: GenerationAction = {
        id: `term-${state.term}.rank-${rank.rank}.benefit`,
        type: "rank.benefit",
        source: "system",
        stepId: "lifepath.term.advancement",
        term: state.term,
        payload: {
          careerId: career.id,
          careerLabel: career.label,
          rank: rank.rank,
          rankTitle: rank.title,
          effectSummary: rankEffectSummary,
        },
      };
      const withRankLog = appendTrackedAction({
        state: withEffects,
        action: rankAction,
        label: `Rank Benefit: ${rank.title}`,
        data: {
          careerId: career.id,
          careerLabel: career.label,
          rank: rank.rank,
          rankTitle: rank.title,
          effectSummary: rankEffectSummary,
        },
      });
      withEffects = applyLifepathEffects(withRankLog, rank.effects ?? []);
    }
  }

  return {
    ...withEffects,
    phase: "aging",
  };
};

export const resolveAgingPhase = (
  state: LifepathRuntimeState,
  definition: LifepathGeneratorDefinition,
): LifepathRuntimeState => {
  if (state.phase !== "aging") throw new Error(`Cannot resolve aging during ${state.phase}.`);
  let next = applyLifepathEffects(state, [
    {
      id: `term-${state.term}.age`,
      type: "age.add",
      payload: { years: 4 },
    },
  ]);
  const agingRules = definition.startingRules.agingRules;
  if (agingRules) {
    const frequencyYears = agingRules.frequencyYears ?? 4;
    const crossedAges: number[] = [];
    for (let age = agingRules.startsAtAge; age <= next.age; age += frequencyYears) {
      if (state.age < age) crossedAges.push(age);
    }

    for (const agingAge of crossedAges) {
      const agingIndex = Math.floor((agingAge - agingRules.startsAtAge) / frequencyYears);
      const characteristicId = agingRules.characteristicCycle?.length
        ? agingRules.characteristicCycle[agingIndex % agingRules.characteristicCycle.length]
        : agingRules.characteristicId;
      if (!characteristicId) continue;

      const before = next.characteristics[characteristicId] ?? 0;
      const after = Math.max(0, before + agingRules.modifier);
      const agingAction: GenerationAction = {
        id: `term-${state.term}.aging.${characteristicId}.${agingAge}`,
        type: "aging.effect",
        source: "system",
        stepId: "lifepath.term.aging",
        term: state.term,
        payload: {
          age: agingAge,
          characteristicId,
          modifier: agingRules.modifier,
          before,
          after,
        },
      };
      const withAgingLog = appendTrackedAction({
        state: next,
        action: agingAction,
        label: `Aging: ${characteristicId.toUpperCase()} ${agingRules.modifier}`,
        data: {
          age: agingAge,
          characteristicId,
          modifier: agingRules.modifier,
          before,
          after,
        },
      });
      next = applyLifepathEffects(withAgingLog, [
        {
          id: `term-${state.term}.aging.${characteristicId}.${agingAge}.effect`,
          type: "characteristic.modify",
          payload: {
            characteristicId,
            modifier: agingRules.modifier,
          },
        },
      ]);
    }
  }

  const careerHistoryEntry = termHistoryFromState(next);
  return {
    ...next,
    phase: "term-complete",
    completedTerms: next.completedTerms + 1,
    careerHistory: careerHistoryEntry
      ? [
          ...next.careerHistory.filter((entry) => entry.term !== careerHistoryEntry.term),
          careerHistoryEntry,
        ]
      : next.careerHistory,
  };
};
