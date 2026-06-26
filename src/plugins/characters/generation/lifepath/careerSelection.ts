import type { GenerationAction } from "../types";
import type {
  LifepathCareerDefinition,
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
} from "./lookups";
import { appendTrackedAction } from "./logging";
import { qualificationHistoryModifiers } from "./modifiers";
import { payloadString } from "./payload";
import type {
  LifepathRollProvider,
  LifepathRuntimePhase,
  LifepathRuntimeState,
} from "./runtimeTypes";

const hasFailedReenlistment = (
  state: LifepathRuntimeState,
  careerId: string,
) => state.log.some((entry) =>
  entry.type === "reenlistment.roll"
  && entry.data.careerId === careerId
  && entry.data.reenlisted === false);

export const careerEligibilityReason = (
  state: LifepathRuntimeState,
  career: LifepathCareerDefinition,
): string | null => {
  if (career.eligibility?.disallowAfterFailedReenlistment && hasFailedReenlistment(state, career.id)) {
    return `Not retained by ${career.label}`;
  }

  const minimumCharacteristics = career.eligibility?.minimumCharacteristics ?? {};
  for (const [characteristicId, minimum] of Object.entries(minimumCharacteristics)) {
    if (typeof minimum !== "number") continue;
    const score = state.characteristics[characteristicId] ?? 0;
    if (score < minimum) return `Requires ${characteristicId.toUpperCase()} ${minimum}+`;
  }
  return null;
};

const termStartPhase = (
  career: LifepathCareerDefinition,
  commissioned: boolean,
): LifepathRuntimePhase => career.commission && !commissioned ? "commission" : "ready-for-term";

export const selectCareer = (
  state: LifepathRuntimeState,
  definition: LifepathGeneratorDefinition,
  careerId: string,
  source: GenerationAction["source"] = "player",
): LifepathRuntimeState => {
  if (state.phase !== "choose-career") {
    throw new Error(`Cannot select a career during ${state.phase}.`);
  }

  const career = findCareer(definition, careerId);
  if (!career) throw new Error(`Unknown lifepath career: ${careerId}`);
  const ineligibleReason = careerEligibilityReason(state, career);
  if (ineligibleReason) {
    throw new Error(`Cannot select ${career.label}: ${ineligibleReason}`);
  }

  const action: GenerationAction = {
    id: `term-${state.term}.career.select`,
    type: "career.select",
    source,
    stepId: "lifepath.choose-career",
    term: state.term,
    payload: {
      careerId: career.id,
    },
  };
  const tracked = appendTrackedAction({
    state,
    action,
    label: `Career: ${career.label}`,
    data: {
      careerId: career.id,
      careerLabel: career.label,
    },
  });

  return {
    ...tracked,
    phase: career.qualification ? "qualification" : "choose-assignment",
    selectedCareerId: career.id,
    selectedAssignmentId: null,
    commissioned: false,
  };
};

export const resolveQualificationPhase = (
  state: LifepathRuntimeState,
  definition: LifepathGeneratorDefinition,
  rollProvider: LifepathRollProvider,
): LifepathRuntimeState => {
  if (state.phase !== "qualification") {
    throw new Error(`Cannot resolve qualification during ${state.phase}.`);
  }
  if (!state.selectedCareerId) throw new Error("Cannot resolve qualification without a career.");

  const career = findCareer(definition, state.selectedCareerId);
  if (!career) throw new Error(`Unknown lifepath career: ${state.selectedCareerId}`);
  if (!career.qualification) return { ...state, phase: "choose-assignment" };
  const modifiers = qualificationHistoryModifiers(state, career);

  const check = resolveCheckRoll({
    state,
    check: career.qualification,
    modifiers,
    rollProvider,
    reason: "qualification",
  });
  const qualified = check.passed;
  const action: GenerationAction = {
    id: `term-${state.term}.qualification`,
    type: "qualification.roll",
    source: "system",
    stepId: "lifepath.career.qualification",
    term: state.term,
    roll: check.roll,
    payload: {
      careerId: career.id,
      roll: check.roll,
      total: check.total,
      target: career.qualification.target,
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
      qualified,
    },
  };
  const qualificationEffects = [
    ...(qualified
      ? career.qualification.successEffects ?? []
      : career.qualification.failureEffects ?? []),
    ...modifiers.flatMap((modifier) =>
      qualified ? modifier.successEffects ?? [] : modifier.failureEffects ?? []),
  ];
  const tracked = appendTrackedAction({
    state,
    action,
    label: `${career.qualification.label}: ${qualified ? "Qualified" : "Not qualified"}`,
    data: {
      careerId: career.id,
      roll: check.roll,
      total: check.total,
      target: career.qualification.target,
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
      qualified,
      effectSummary: effectSummary(qualificationEffects),
    },
  });
  const withEffects = applyLifepathEffects(
    tracked,
    qualificationEffects,
    {
      eventId: action.id,
      eventType: action.type,
      careerId: career.id,
      term: state.term,
    },
  );

  return {
    ...withEffects,
    phase: qualified ? "choose-assignment" : "qualification-failed",
    selectedCareerId: career.id,
    selectedAssignmentId: null,
    careerRank: qualified ? withEffects.careerRank : 0,
  };
};

export const selectAssignment = (
  state: LifepathRuntimeState,
  definition: LifepathGeneratorDefinition,
  assignmentId: string,
  source: GenerationAction["source"] = "player",
): LifepathRuntimeState => {
  if (state.phase !== "choose-assignment") {
    throw new Error(`Cannot select an assignment during ${state.phase}.`);
  }
  if (!state.selectedCareerId) {
    throw new Error("Cannot select an assignment before selecting a career.");
  }

  const career = findCareer(definition, state.selectedCareerId);
  if (!career) throw new Error(`Unknown lifepath career: ${state.selectedCareerId}`);

  const assignment = findAssignment(career, assignmentId);
  if (!assignment) {
    throw new Error(`Unknown lifepath assignment: ${assignmentId}`);
  }

  const action: GenerationAction = {
    id: `term-${state.term}.assignment.select`,
    type: "assignment.select",
    source,
    stepId: "lifepath.choose-assignment",
    term: state.term,
    payload: {
      careerId: career.id,
      assignmentId: assignment.id,
    },
  };
  const tracked = appendTrackedAction({
    state,
    action,
    label: `Assignment: ${assignment.label}`,
    data: {
      careerId: career.id,
      assignmentId: assignment.id,
      assignmentLabel: assignment.label,
    },
  });

  return {
    ...tracked,
    phase: termStartPhase(career, state.commissioned),
    selectedAssignmentId: assignment.id,
  };
};

export const chooseAnotherCareerAfterQualificationFailure = (
  state: LifepathRuntimeState,
  source: GenerationAction["source"] = "player",
): LifepathRuntimeState => {
  if (state.phase !== "qualification-failed") {
    throw new Error(`Cannot choose another career during ${state.phase}.`);
  }

  const action: GenerationAction = {
    id: `term-${state.term}.qualification.choose-career`,
    type: "qualification.choose-career",
    source,
    stepId: "lifepath.qualification-failed",
    term: state.term,
    payload: {
      failedCareerId: state.selectedCareerId,
    },
  };
  const tracked = appendTrackedAction({
    state,
    action,
    label: "Choose Another Career",
    data: {
      failedCareerId: state.selectedCareerId,
    },
  });

  return {
    ...tracked,
    phase: "choose-career",
    selectedCareerId: null,
    selectedAssignmentId: null,
    careerRank: 0,
    commissioned: false,
  };
};

export const enterFallbackCareerAfterQualificationFailure = (
  state: LifepathRuntimeState,
  definition: LifepathGeneratorDefinition,
  careerId?: string,
  source: GenerationAction["source"] = "player",
): LifepathRuntimeState => {
  if (state.phase !== "qualification-failed") {
    throw new Error(`Cannot enter a fallback career during ${state.phase}.`);
  }

  const fallbackCareerId = careerId ?? payloadString(definition.data, "qualificationFallbackCareerId");
  if (!fallbackCareerId) throw new Error("No qualification fallback career is defined.");
  const fallbackCareer = findCareer(definition, fallbackCareerId);
  if (!fallbackCareer) throw new Error(`Unknown qualification fallback career: ${fallbackCareerId}`);
  const globalFallbackCareerId = payloadString(definition.data, "qualificationFallbackCareerId");
  const failurePath = fallbackCareer.id === globalFallbackCareerId ? "fallback" : "alternate";
  const labelPrefix = failurePath === "alternate" ? "Alternate Career" : "Fallback Career";

  const action: GenerationAction = {
    id: `term-${state.term}.qualification.fallback`,
    type: "qualification.fallback",
    source,
    stepId: "lifepath.qualification-failed",
    term: state.term,
    payload: {
      failedCareerId: state.selectedCareerId,
      careerId: fallbackCareer.id,
      failurePath,
    },
  };
  const tracked = appendTrackedAction({
    state,
    action,
    label: `${labelPrefix}: ${fallbackCareer.label}`,
    data: {
      failedCareerId: state.selectedCareerId,
      careerId: fallbackCareer.id,
      careerLabel: fallbackCareer.label,
      failurePath,
    },
  });

  return {
    ...tracked,
    phase: "choose-assignment",
    selectedCareerId: fallbackCareer.id,
    selectedAssignmentId: null,
    careerRank: 0,
    commissioned: false,
  };
};
