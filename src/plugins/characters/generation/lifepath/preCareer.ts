import type {
  GenerationAction,
} from "../types";
import type {
  LifepathGeneratorDefinition,
} from "../lifepathTypes";
import {
  applyLifepathEffects,
  effectSummary,
} from "./effects";
import { resolveCheckRoll } from "./checks";
import { appendTrackedAction } from "./logging";
import type {
  LifepathRollProvider,
  LifepathRuntimeState,
} from "./runtimeTypes";
import type { ResolveLifepathTable } from "./tableResolution";

export const skipPreCareerEducation = (
  state: LifepathRuntimeState,
  source: GenerationAction["source"] = "player",
): LifepathRuntimeState => {
  if (state.phase !== "pre-career-choice") {
    throw new Error(`Cannot skip pre-career education during ${state.phase}.`);
  }

  const action: GenerationAction = {
    id: "pre-career.skip",
    type: "preCareer.skip",
    source,
    stepId: "lifepath.pre-career-choice",
    term: null,
    payload: {},
  };
  const tracked = appendTrackedAction({
    state,
    action,
    label: "Pre-Career: Enter Career",
  });

  return {
    ...tracked,
    phase: "choose-career",
  };
};

export const selectPreCareerEducation = (
  state: LifepathRuntimeState,
  definition: LifepathGeneratorDefinition,
  educationId: string,
  source: GenerationAction["source"] = "player",
): LifepathRuntimeState => {
  if (state.phase !== "pre-career-choice") {
    throw new Error(`Cannot select pre-career education during ${state.phase}.`);
  }
  const education = definition.preCareerEducation?.find((candidate) => candidate.id === educationId);
  if (!education) throw new Error(`Unknown pre-career education: ${educationId}`);

  const action: GenerationAction = {
    id: `pre-career.${education.id}.select`,
    type: "preCareer.select",
    source,
    stepId: "lifepath.pre-career-choice",
    term: null,
    payload: {
      educationId: education.id,
    },
  };
  const tracked = appendTrackedAction({
    state,
    action,
    label: `Pre-Career: ${education.label}`,
    data: {
      educationId: education.id,
      educationLabel: education.label,
    },
  });

  return {
    ...tracked,
    selectedPreCareerEducationId: education.id,
    phase: education.qualification ? "pre-career-qualification" : "choose-career",
  };
};

export const resolvePreCareerQualificationPhase = (
  state: LifepathRuntimeState,
  definition: LifepathGeneratorDefinition,
  rollProvider: LifepathRollProvider,
): LifepathRuntimeState => {
  if (state.phase !== "pre-career-qualification") {
    throw new Error(`Cannot resolve pre-career qualification during ${state.phase}.`);
  }
  if (!state.selectedPreCareerEducationId) {
    throw new Error("Cannot resolve pre-career qualification without an education path.");
  }

  const education = definition.preCareerEducation
    ?.find((candidate) => candidate.id === state.selectedPreCareerEducationId);
  if (!education) {
    throw new Error(`Unknown pre-career education: ${state.selectedPreCareerEducationId}`);
  }
  if (!education.qualification) return { ...state, phase: "choose-career" };

  const check = resolveCheckRoll({
    state,
    check: education.qualification,
    rollProvider,
    reason: "pre-career qualification",
  });
  const admitted = check.passed;
  const action: GenerationAction = {
    id: `pre-career.${education.id}.qualification`,
    type: "preCareer.qualification.roll",
    source: "system",
    stepId: "lifepath.pre-career.qualification",
    term: null,
    roll: check.roll,
    payload: {
      educationId: education.id,
      roll: check.roll,
      total: check.total,
      target: education.qualification.target,
      characteristicId: check.characteristicId,
      characteristicScore: check.characteristicScore,
      characteristicModifier: check.characteristicModifier,
      skillName: check.skillName,
      skillLevel: check.skillLevel,
      skillModifier: check.skillModifier,
      admitted,
    },
  };
  const qualificationEffects = admitted
    ? education.successEffects ?? []
    : education.failureEffects ?? [];
  const tracked = appendTrackedAction({
    state,
    action,
    label: `${education.qualification.label}: ${admitted ? "Admitted" : "Not admitted"}`,
    data: {
      educationId: education.id,
      educationLabel: education.label,
      roll: check.roll,
      total: check.total,
      target: education.qualification.target,
      characteristicId: check.characteristicId,
      characteristicScore: check.characteristicScore,
      characteristicModifier: check.characteristicModifier,
      skillName: check.skillName,
      skillLevel: check.skillLevel,
      skillModifier: check.skillModifier,
      admitted,
      effectSummary: effectSummary(qualificationEffects),
    },
  });
  const withEffects = applyLifepathEffects(
    tracked,
    qualificationEffects,
    {
      eventId: action.id,
      eventType: action.type,
    },
  );

  return {
    ...withEffects,
    phase: admitted && education.graduation ? "pre-career-graduation" : "choose-career",
  };
};

export const resolvePreCareerGraduationPhase = (
  state: LifepathRuntimeState,
  definition: LifepathGeneratorDefinition,
  rollProvider: LifepathRollProvider,
): LifepathRuntimeState => {
  if (state.phase !== "pre-career-graduation") {
    throw new Error(`Cannot resolve pre-career graduation during ${state.phase}.`);
  }
  if (!state.selectedPreCareerEducationId) {
    throw new Error("Cannot resolve pre-career graduation without an education path.");
  }

  const education = definition.preCareerEducation
    ?.find((candidate) => candidate.id === state.selectedPreCareerEducationId);
  if (!education) {
    throw new Error(`Unknown pre-career education: ${state.selectedPreCareerEducationId}`);
  }
  if (!education.graduation) return { ...state, phase: "choose-career" };

  const check = resolveCheckRoll({
    state,
    check: education.graduation,
    rollProvider,
    reason: "pre-career graduation",
  });
  const graduated = check.passed;
  const honorsGraduated = graduated
    && typeof education.honorsTarget === "number"
    && check.total >= education.honorsTarget;
  const action: GenerationAction = {
    id: `pre-career.${education.id}.graduation`,
    type: "preCareer.graduation.roll",
    source: "system",
    stepId: "lifepath.pre-career.graduation",
    term: null,
    roll: check.roll,
    payload: {
      educationId: education.id,
      roll: check.roll,
      total: check.total,
      target: education.graduation.target,
      characteristicId: check.characteristicId,
      characteristicScore: check.characteristicScore,
      characteristicModifier: check.characteristicModifier,
      skillName: check.skillName,
      skillLevel: check.skillLevel,
      skillModifier: check.skillModifier,
      graduated,
      honorsTarget: education.honorsTarget ?? null,
      honorsGraduated,
    },
  };
  const graduationEffects = [
    ...(graduated
      ? education.graduation.successEffects ?? []
      : education.graduation.failureEffects ?? []),
    ...(honorsGraduated ? education.honorsEffects ?? [] : []),
  ];
  const tracked = appendTrackedAction({
    state,
    action,
    label: `${education.graduation.label}: ${
      honorsGraduated
        ? "Graduated with Honors"
        : graduated
          ? "Graduated"
          : "Did not graduate"
    }`,
    data: {
      educationId: education.id,
      educationLabel: education.label,
      roll: check.roll,
      total: check.total,
      target: education.graduation.target,
      characteristicId: check.characteristicId,
      characteristicScore: check.characteristicScore,
      characteristicModifier: check.characteristicModifier,
      skillName: check.skillName,
      skillLevel: check.skillLevel,
      skillModifier: check.skillModifier,
      graduated,
      honorsTarget: education.honorsTarget ?? null,
      honorsGraduated,
      effectSummary: effectSummary(graduationEffects),
    },
  });
  const withEffects = applyLifepathEffects(
    tracked,
    graduationEffects,
    {
      eventId: action.id,
      eventType: action.type,
    },
  );

  return {
    ...withEffects,
    preCareerEducationOutcomes: [
      ...withEffects.preCareerEducationOutcomes.filter((outcome) => outcome.educationId !== education.id),
      {
        educationId: education.id,
        graduated,
        honorsGraduated,
      },
    ],
    preCareerHonorsGraduated: honorsGraduated,
    pendingPreCareerSkillRolls: graduated && education.skillTableIds?.[0]
      ? honorsGraduated ? 2 : 1
      : 0,
    phase: graduated && education.skillTableIds?.[0] ? "pre-career-skill" : "choose-career",
  };
};

export const resolvePreCareerSkillPhase = (
  state: LifepathRuntimeState,
  definition: LifepathGeneratorDefinition,
  rollProvider: LifepathRollProvider,
  resolveTable: ResolveLifepathTable,
): LifepathRuntimeState => {
  if (state.phase !== "pre-career-skill") {
    throw new Error(`Cannot resolve pre-career skill during ${state.phase}.`);
  }
  if (!state.selectedPreCareerEducationId) {
    throw new Error("Cannot resolve pre-career skill without an education path.");
  }

  const education = definition.preCareerEducation
    ?.find((candidate) => candidate.id === state.selectedPreCareerEducationId);
  if (!education) {
    throw new Error(`Unknown pre-career education: ${state.selectedPreCareerEducationId}`);
  }
  const tableId = education.skillTableIds?.[0];
  if (!tableId) return { ...state, phase: "choose-career" };

  const next = resolveTable({
    state,
    definition,
    tableId,
    rollProvider,
    reason: "pre-career skill",
    term: null,
    historyStage: "preCareer",
    resumePhase: "choose-career",
  });

  return {
    ...next,
    pendingPreCareerSkillRolls: Math.max(0, state.pendingPreCareerSkillRolls - 1),
    phase: next.pendingChoice
      ? state.phase
      : state.pendingPreCareerSkillRolls > 1
        ? "pre-career-skill"
        : "choose-career",
  };
};
