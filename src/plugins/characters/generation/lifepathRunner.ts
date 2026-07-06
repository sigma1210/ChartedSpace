import type {
  GenerationAction,
  GenerationPayload,
  GenerationStep,
} from "./types";
import {
  careerEligibilityReason,
  chooseAnotherCareerAfterQualificationFailure,
  enterFallbackCareerAfterQualificationFailure,
  resolveQualificationPhase,
  selectAssignment,
  selectCareer,
} from "./lifepath/careerSelection";
import { selectBackgroundSkill } from "./lifepath/background";
import {
  findAssignment,
  findCareer,
  findTable,
} from "./lifepath/lookups";
import {
  changeLifepathCareer,
  continueLifepathCareer,
  getCurrentMusterOutBenefit,
  musterOutLifepath,
  resolveMusterOutPhase,
  resolveReenlistmentPhase,
  selectMusterOutBenefitTable,
  selectPendingChoice,
} from "./lifepath/lifecycle";
import { appendTrackedAction } from "./lifepath/logging";
import {
  characteristicDm,
  commissionHistoryModifiers,
  qualificationHistoryModifiers,
  skillDm,
} from "./lifepath/modifiers";
import {
  payloadString,
  payloadStringList,
} from "./lifepath/payload";
import {
  resolvePreCareerGraduationPhase,
  resolvePreCareerQualificationPhase,
  resolvePreCareerSkillPhase,
  selectPreCareerEducation,
  skipPreCareerEducation,
} from "./lifepath/preCareer";
import {
  resolveAdvancementPhase,
  resolveAgingPhase,
  resolveCommissionPhase,
  resolveEventPhase,
  resolveMishapPhase,
  resolveSkillPhase,
  resolveSurvivalPhase,
} from "./lifepath/termPhases";
import { resolveTable } from "./lifepath/tableResolution";
import type {
  LifepathRollProvider,
  LifepathRuntimeAction,
  LifepathRuntimeCharacteristics,
  LifepathRuntimePhase,
  LifepathRuntimeState,
} from "./lifepath/runtimeTypes";
export { createInitialLifepathState } from "./lifepath/initialState";
export {
  characteristicDm,
  skillDm,
} from "./lifepath/modifiers";
export type {
  LifepathCareerHistoryEntry,
  LifepathEffectContext,
  LifepathMusterOutState,
  LifepathMusterOutTerm,
  LifepathPendingChoice,
  LifepathPreCareerEducationOutcome,
  LifepathRollProvider,
  LifepathRollRequest,
  LifepathRuntimeAction,
  LifepathRuntimeBenefits,
  LifepathRuntimeCharacteristics,
  LifepathRuntimeInjury,
  LifepathRuntimePassages,
  LifepathRuntimePhase,
  LifepathRuntimeRelationship,
  LifepathRuntimeSkill,
  LifepathRuntimeState,
} from "./lifepath/runtimeTypes";
import type {
  LifepathCareerDefinition,
  LifepathCharacteristicId,
  LifepathGeneratorDefinition,
  LifepathQualificationModifierDefinition,
} from "./lifepathTypes";

const postBackgroundPhase = (
  definition: LifepathGeneratorDefinition,
): LifepathRuntimePhase =>
  definition.preCareerEducation?.length ? "pre-career-choice" : "choose-career";

const checkModifierData = (
  state: LifepathRuntimeState,
  check: {
    characteristicModifier?: LifepathCharacteristicId;
    skillModifier?: string;
  } | undefined,
  modifiers: readonly LifepathQualificationModifierDefinition[] = [],
): GenerationPayload => {
  if (!check) return {};
  const characteristicId = check.characteristicModifier ?? null;
  const characteristicScore = characteristicId
    ? state.characteristics[characteristicId] ?? null
    : null;
  const characteristicModifier = typeof characteristicScore === "number"
    ? characteristicDm(characteristicScore)
    : 0;
  const skillName = check.skillModifier ?? null;
  const skillLevel = skillName
    ? state.skills.find((skill) => skill.name === skillName)?.level ?? null
    : null;
  const skillModifier = skillName ? skillDm(skillLevel) : 0;
  const extraModifierTotal = modifiers.reduce((total, modifier) => total + modifier.modifier, 0);

  return {
    characteristicId,
    characteristicScore,
    characteristicModifier,
    skillName,
    skillLevel,
    skillModifier,
    modifiers: modifiers.map((modifier) => ({
      id: modifier.id,
      label: modifier.label,
      modifier: modifier.modifier,
    })),
    extraModifierTotal,
    modifierTotal: characteristicModifier + skillModifier + extraModifierTotal,
  };
};

export const getCurrentLifepathStep = (
  state: LifepathRuntimeState,
  definition: LifepathGeneratorDefinition,
): GenerationStep => {
  if (state.pendingChoice) {
    return {
      kind: "choice",
      id: state.pendingChoice.id,
      title: state.pendingChoice.title,
      prompt: state.pendingChoice.prompt,
      options: state.pendingChoice.options.map((option) => ({
        id: option.id,
        label: option.label,
        description: option.description,
        data: option.data,
      })),
      data: {
        resumePhase: state.pendingChoice.resumePhase,
        term: state.term,
      },
    };
  }

  if (state.phase === "roll-characteristics") {
    return {
      kind: "roll",
      id: "lifepath.characteristics",
      title: "Roll Characteristics",
      notation: definition.startingRules.characteristicRollNotation,
      data: {
        characteristicIds: definition.characteristics.map((characteristic) => characteristic.id),
      },
    };
  }

  if (state.phase === "background") {
    const tableIds = definition.startingRules.backgroundSkillTableIds ?? [];
    const tables = tableIds.map((tableId) => {
      const table = findTable(definition, tableId);
      if (!table) throw new Error(`Unknown lifepath table: ${tableId}`);
      return table;
    });

    return {
      kind: "choice",
      id: "lifepath.background-skill",
      title: "Choose Background Skill",
      prompt: "Choose one background skill from the character's early life.",
      options: tables.flatMap((table) =>
        table.entries.map((entry) => ({
          id: `${table.id}:${entry.id}`,
          label: entry.label,
          data: {
            tableId: table.id,
            entryId: entry.id,
          },
        })),
      ),
    };
  }

  if (state.phase === "pre-career-choice") {
    return {
      kind: "choice",
      id: "lifepath.pre-career-choice",
      title: "Choose Pre-Career Path",
      prompt: "Choose pre-career education or enter a career directly.",
      options: [
        {
          id: "enter-career",
          label: "Enter Career",
          description: "Skip pre-career education and choose a career.",
        },
        ...(definition.preCareerEducation ?? []).map((education) => ({
          id: education.id,
          label: education.label,
          description: education.description,
          data: {
            educationId: education.id,
          },
        })),
      ],
    };
  }

  if (state.phase === "pre-career-qualification") {
    const education = definition.preCareerEducation
      ?.find((candidate) => candidate.id === state.selectedPreCareerEducationId);

    return {
      kind: "roll",
      id: "lifepath.pre-career.qualification",
      title: "Resolve Pre-Career Admission",
      notation: education?.qualification?.notation ?? "2d6",
      target: education?.qualification?.target,
      data: {
        educationId: state.selectedPreCareerEducationId,
        ...checkModifierData(state, education?.qualification),
      },
    };
  }

  if (state.phase === "pre-career-graduation") {
    const education = definition.preCareerEducation
      ?.find((candidate) => candidate.id === state.selectedPreCareerEducationId);

    return {
      kind: "roll",
      id: "lifepath.pre-career.graduation",
      title: "Resolve Pre-Career Graduation",
      notation: education?.graduation?.notation ?? "2d6",
      target: education?.graduation?.target,
      data: {
        educationId: state.selectedPreCareerEducationId,
        ...checkModifierData(state, education?.graduation),
      },
    };
  }

  if (state.phase === "pre-career-skill") {
    const education = definition.preCareerEducation
      ?.find((candidate) => candidate.id === state.selectedPreCareerEducationId);

    return {
      kind: "table",
      id: "lifepath.pre-career.skill",
      title: "Resolve Pre-Career Skill",
      tableId: education?.skillTableIds?.[0] ?? "",
      data: {
        educationId: state.selectedPreCareerEducationId,
      },
    };
  }

  if (state.phase === "choose-career") {
    return {
      kind: "choice",
      id: "lifepath.choose-career",
      title: "Choose Career",
      prompt: "Select the career path this character will attempt to enter.",
      options: definition.careers
        .filter((career) => career.data?.hideFromCareerSelection !== true)
        .map((career) => {
          const ineligibleReason = careerEligibilityReason(state, career);
          return {
            id: career.id,
            label: career.label,
            description: ineligibleReason ?? career.description,
            disabled: Boolean(ineligibleReason),
            data: ineligibleReason ? { ineligibleReason } : undefined,
          };
        }),
    };
  }

  if (state.phase === "choose-assignment") {
    const career = state.selectedCareerId
      ? findCareer(definition, state.selectedCareerId)
      : null;

    return {
      kind: "choice",
      id: "lifepath.choose-assignment",
      title: "Choose Assignment",
      prompt: career
        ? `Select an assignment for ${career.label}.`
        : "Select an assignment.",
      options: (career?.assignments ?? []).map((assignment) => ({
        id: assignment.id,
        label: assignment.label,
        description: assignment.description,
      })),
      data: {
        careerId: state.selectedCareerId,
      },
    };
  }

  if (state.phase === "qualification") {
    const career = state.selectedCareerId
      ? findCareer(definition, state.selectedCareerId)
      : null;
    const modifiers = career ? qualificationHistoryModifiers(state, career) : [];

    return {
      kind: "roll",
      id: "lifepath.career.qualification",
      title: "Resolve Qualification",
      notation: career?.qualification?.notation ?? "2d6",
      target: career?.qualification?.target,
      data: {
        careerId: state.selectedCareerId,
        term: state.term,
        ...checkModifierData(state, career?.qualification, modifiers),
      },
    };
  }

  if (state.phase === "qualification-failed") {
    const fallbackCareerId = payloadString(definition.data, "qualificationFallbackCareerId");
    const fallbackCareer = fallbackCareerId ? findCareer(definition, fallbackCareerId) : null;
    const failedCareer = state.selectedCareerId
      ? findCareer(definition, state.selectedCareerId)
      : null;
    const alternateCareers = payloadStringList(failedCareer?.data, "qualificationFailureCareerIds")
      .map((careerId) => findCareer(definition, careerId))
      .filter((career): career is LifepathCareerDefinition => Boolean(career))
      .filter((career) => career.id !== failedCareer?.id);
    const alternateCareerIds = new Set(alternateCareers.map((career) => career.id));

    return {
      kind: "choice",
      id: "lifepath.qualification-failed",
      title: "Qualification Failed",
      prompt: failedCareer
        ? [
            `${failedCareer.label} did not accept this character.`,
            alternateCareers.length > 0
              ? `Try another career, enter ${alternateCareers.map((career) => career.label).join(", ")}, or fall back.`
              : "Try another career or fall back.",
          ].join(" ")
        : "Choose what happens next.",
      options: [
        {
          id: "choose-another-career",
          label: "Choose Another Career",
          description: "Return to career selection.",
        },
        ...alternateCareers.map((career) => ({
          id: `enter-career:${career.id}`,
          label: `Enter ${career.label}`,
          description: "Accept this alternate career and continue generation.",
          data: {
            careerId: career.id,
            failurePath: "alternate",
          },
        })),
        ...(fallbackCareer
          && !alternateCareerIds.has(fallbackCareer.id)
          ? [{
              id: "enter-fallback-career",
              label: `Enter ${fallbackCareer.label}`,
              description: "Accept a fallback career and continue generation.",
              data: {
                careerId: fallbackCareer.id,
                failurePath: "fallback",
              },
            }]
          : []),
      ],
      data: {
        careerId: state.selectedCareerId,
        fallbackCareerId,
        term: state.term,
      },
    };
  }

  if (state.phase === "ready-for-term" || state.phase === "survival") {
    const career = state.selectedCareerId
      ? findCareer(definition, state.selectedCareerId)
      : null;

    return {
      kind: "roll",
      id: "lifepath.term.survival",
      title: "Resolve Survival",
      notation: "2d6",
      data: {
        careerId: state.selectedCareerId,
        assignmentId: state.selectedAssignmentId,
        term: state.term,
        ...checkModifierData(state, career?.survival),
      },
    };
  }

  if (state.phase === "commission") {
    const career = state.selectedCareerId
      ? findCareer(definition, state.selectedCareerId)
      : null;
    const modifiers = career ? commissionHistoryModifiers(state, career) : [];

    return {
      kind: "roll",
      id: "lifepath.term.commission",
      title: "Resolve Commission",
      notation: career?.commission?.notation ?? "2d6",
      target: career?.commission?.target,
      data: {
        careerId: state.selectedCareerId,
        assignmentId: state.selectedAssignmentId,
        term: state.term,
        ...checkModifierData(state, career?.commission, modifiers),
      },
    };
  }

  if (state.phase === "event") {
    return {
      kind: "table",
      id: "lifepath.term.event",
      title: "Resolve Career Event",
      tableId: state.selectedCareerId
        ? findCareer(definition, state.selectedCareerId)?.eventTableId ?? ""
        : "",
      data: {
        careerId: state.selectedCareerId,
        term: state.term,
      },
    };
  }

  if (state.phase === "skill") {
    const career = state.selectedCareerId
      ? findCareer(definition, state.selectedCareerId)
      : null;
    const assignment = state.selectedAssignmentId && career
      ? findAssignment(career, state.selectedAssignmentId)
      : null;

    return {
      kind: "table",
      id: "lifepath.term.skill",
      title: "Resolve Term Skill",
      tableId: assignment?.skillTableIds?.[0] ?? career?.skillTableIds[0] ?? "",
      data: {
        careerId: state.selectedCareerId,
        assignmentId: state.selectedAssignmentId,
        term: state.term,
      },
    };
  }

  if (state.phase === "mishap") {
    return {
      kind: "table",
      id: "lifepath.term.mishap",
      title: "Resolve Mishap",
      tableId: state.selectedCareerId
        ? findCareer(definition, state.selectedCareerId)?.mishapTableId ?? ""
        : "",
      data: {
        careerId: state.selectedCareerId,
        term: state.term,
      },
    };
  }

  if (state.phase === "advancement") {
    const career = state.selectedCareerId
      ? findCareer(definition, state.selectedCareerId)
      : null;

    return {
      kind: "roll",
      id: "lifepath.term.advancement",
      title: "Resolve Advancement",
      notation: career?.advancement?.notation ?? "2d6",
      target: career?.advancement?.target,
      data: {
        careerId: state.selectedCareerId,
        term: state.term,
      },
    };
  }

  if (state.phase === "aging") {
    return {
      kind: "running",
      id: "lifepath.term.aging",
      title: "Apply Aging",
      data: {
        term: state.term,
      },
    };
  }

  if (state.phase === "term-complete") {
    const options = [
      ...(state.selectedCareerId && state.selectedAssignmentId
        ? [{
            id: "continue-career",
            label: "Continue Career",
            description: "Begin another term in the same career and assignment.",
          }]
        : []),
      {
        id: "change-career",
        label: "Change Career",
        description: "Choose a new career for the next term.",
      },
      {
        id: "muster-out",
        label: "Muster Out",
        description: "End generation and review the character.",
      },
    ];

    return {
      kind: "choice",
      id: "lifepath.term-complete",
      title: "Term Complete",
      prompt: "Choose what happens next.",
      options,
      data: {
        careerId: state.selectedCareerId,
        assignmentId: state.selectedAssignmentId,
        term: state.term,
      },
    };
  }

  if (state.phase === "reenlistment") {
    const career = state.selectedCareerId
      ? findCareer(definition, state.selectedCareerId)
      : null;

    return {
      kind: "roll",
      id: "lifepath.term.reenlistment",
      title: "Resolve Reenlistment",
      notation: career?.reenlistment?.notation ?? "2d6",
      target: career?.reenlistment?.target,
      data: {
        careerId: state.selectedCareerId,
        assignmentId: state.selectedAssignmentId,
        term: state.term,
        ...checkModifierData(state, career?.reenlistment),
      },
    };
  }

  if (state.phase === "muster-out") {
    const currentBenefit = getCurrentMusterOutBenefit(state, definition);
    if (currentBenefit && !currentBenefit.tableId && currentBenefit.tables.length > 1) {
      return {
        kind: "choice",
        id: "lifepath.muster-out-benefit-choice",
        title: "Choose Muster-Out Benefit",
        prompt: `Choose a benefit table for ${currentBenefit.career.label}, term ${currentBenefit.term.term}.`,
        options: currentBenefit.tables.map((table) => ({
          id: table.id,
          label: table.label,
        })),
        data: {
          careerId: currentBenefit.career.id,
          term: currentBenefit.term.term,
        },
      };
    }

    return {
      kind: "roll",
      id: "lifepath.muster-out",
      title: "Resolve Muster Out",
      notation: currentBenefit?.table?.notation ?? "1d6",
      data: {
        completedTerms: state.completedTerms,
        tableId: currentBenefit?.table?.id ?? null,
        ...(currentBenefit
          ? {
              careerId: currentBenefit.career.id,
              term: currentBenefit.term.term,
            }
          : {}),
      },
    };
  }

  return {
    kind: "running",
    id: "lifepath.generation-complete",
    title: "Generation Complete",
    data: {
      careerId: state.selectedCareerId,
      assignmentId: state.selectedAssignmentId,
      term: state.term,
    },
  };
};

export const applyLifepathAction = (
  state: LifepathRuntimeState,
  definition: LifepathGeneratorDefinition,
  runtimeAction: LifepathRuntimeAction,
  rollProvider?: LifepathRollProvider,
): LifepathRuntimeState => {
  switch (runtimeAction.type) {
    case "characteristics.roll":
      return rollCharacteristicsPhase(
        state,
        definition,
        requireRollProvider(rollProvider),
        runtimeAction.source,
      );

    case "background.skill.select":
      return selectBackgroundSkill(
        state,
        definition,
        runtimeAction.tableId,
        runtimeAction.entryId,
        runtimeAction.source,
      );

    case "preCareer.skip":
      return skipPreCareerEducation(state, runtimeAction.source);

    case "preCareer.select":
      return selectPreCareerEducation(
        state,
        definition,
        runtimeAction.educationId,
        runtimeAction.source,
      );

    case "preCareer.qualification.resolve":
      return resolvePreCareerQualificationPhase(
        state,
        definition,
        requireRollProvider(rollProvider),
      );

    case "preCareer.graduation.resolve":
      return resolvePreCareerGraduationPhase(
        state,
        definition,
        requireRollProvider(rollProvider),
      );

    case "preCareer.skill.resolve":
      return resolvePreCareerSkillPhase(
        state,
        definition,
        requireRollProvider(rollProvider),
        resolveTable,
      );

    case "career.select":
      return selectCareer(
        state,
        definition,
        runtimeAction.careerId,
        runtimeAction.source,
      );

    case "career.qualification.resolve":
      return resolveQualificationPhase(state, definition, requireRollProvider(rollProvider));

    case "qualification.choose-career":
      return chooseAnotherCareerAfterQualificationFailure(state, runtimeAction.source);

    case "qualification.fallback":
      return enterFallbackCareerAfterQualificationFailure(
        state,
        definition,
        runtimeAction.careerId,
        runtimeAction.source,
      );

    case "assignment.select":
      return selectAssignment(
        state,
        definition,
        runtimeAction.assignmentId,
        runtimeAction.source,
      );

    case "term.commission.resolve":
      return resolveCommissionPhase(state, definition, requireRollProvider(rollProvider));

    case "term.survival.resolve":
      return resolveSurvivalPhase(state, definition, requireRollProvider(rollProvider));

    case "term.skill.resolve":
      return resolveSkillPhase(state, definition, requireRollProvider(rollProvider), resolveTable);

    case "term.event.resolve":
      return resolveEventPhase(state, definition, requireRollProvider(rollProvider), resolveTable);

    case "term.mishap.resolve":
      return resolveMishapPhase(state, definition, requireRollProvider(rollProvider), resolveTable);

    case "term.advancement.resolve":
      return resolveAdvancementPhase(state, definition, requireRollProvider(rollProvider));

    case "term.aging.resolve":
      return resolveAgingPhase(state, definition);

    case "term.reenlistment.resolve":
      return resolveReenlistmentPhase(state, definition, requireRollProvider(rollProvider));

    case "table.choice.select":
      return selectPendingChoice(state, runtimeAction.choiceId, runtimeAction.source);

    case "term.continue":
      return continueLifepathCareer(definition, state, runtimeAction.source);

    case "career.change":
      return changeLifepathCareer(state, runtimeAction.source);

    case "generation.muster-out":
      return musterOutLifepath(state, runtimeAction.source);

    case "muster-out.benefit.select":
      return selectMusterOutBenefitTable(state, definition, runtimeAction.tableId, runtimeAction.source);

    case "muster-out.resolve":
      return resolveMusterOutPhase(state, definition, requireRollProvider(rollProvider));
  }
};

const requireRollProvider = (rollProvider: LifepathRollProvider | undefined) => {
  if (!rollProvider) throw new Error("A roll provider is required to resolve this lifepath phase.");
  return rollProvider;
};

const rollCharacteristicsPhase = (
  state: LifepathRuntimeState,
  definition: LifepathGeneratorDefinition,
  rollProvider: LifepathRollProvider,
  source: GenerationAction["source"] = "system",
): LifepathRuntimeState => {
  if (state.phase !== "roll-characteristics") {
    throw new Error(`Cannot roll characteristics during ${state.phase}.`);
  }

  const characteristics: LifepathRuntimeCharacteristics = {};
  const rolls: GenerationPayload = {};

  for (const characteristic of definition.characteristics) {
    const notation = characteristic.rollNotation ?? definition.startingRules.characteristicRollNotation;
    const roll = rollProvider.roll({
      id: `characteristic.${characteristic.id}`,
      notation,
      reason: `characteristic ${characteristic.abbreviation}`,
    });
    characteristics[characteristic.id] = roll;
    rolls[characteristic.id] = roll;
  }

  const action: GenerationAction = {
    id: "lifepath.characteristics.roll",
    type: "characteristics.roll",
    source,
    stepId: "lifepath.characteristics",
    term: null,
    payload: {
      characteristics: rolls,
    },
  };
  const tracked = appendTrackedAction({
    state,
    action,
    label: "Characteristics Rolled",
    data: {
      characteristics: rolls,
    },
  });

  return {
    ...tracked,
    phase: definition.startingRules.backgroundSkillTableIds?.length ? "background" : postBackgroundPhase(definition),
    characteristics,
  };
};

export const resolveLifepathTerm = (
  state: LifepathRuntimeState,
  definition: LifepathGeneratorDefinition,
  rollProvider: LifepathRollProvider,
): LifepathRuntimeState => {
  if (![
    "ready-for-term",
    "commission",
    "skill",
    "event",
    "mishap",
    "advancement",
    "aging",
  ].includes(state.phase)) {
    throw new Error(`Cannot resolve a term during ${state.phase}.`);
  }

  let next = state.phase === "ready-for-term"
    ? applyLifepathAction(
        state,
        definition,
        { type: "term.survival.resolve" },
        rollProvider,
      )
    : state;

  while (next.phase !== "term-complete" && !next.pendingChoice) {
    switch (next.phase) {
      case "ready-for-term":
        next = applyLifepathAction(
          next,
          definition,
          { type: "term.survival.resolve" },
          rollProvider,
        );
        break;
      case "commission":
        next = applyLifepathAction(
          next,
          definition,
          { type: "term.commission.resolve" },
          rollProvider,
        );
        break;
      case "skill":
        next = applyLifepathAction(
          next,
          definition,
          { type: "term.skill.resolve" },
          rollProvider,
        );
        break;
      case "event":
        next = applyLifepathAction(
          next,
          definition,
          { type: "term.event.resolve" },
          rollProvider,
        );
        break;
      case "mishap":
        next = applyLifepathAction(
          next,
          definition,
          { type: "term.mishap.resolve" },
          rollProvider,
        );
        break;
      case "advancement":
        next = applyLifepathAction(
          next,
          definition,
          { type: "term.advancement.resolve" },
          rollProvider,
        );
        break;
      case "aging":
        next = applyLifepathAction(next, definition, { type: "term.aging.resolve" });
        break;
      default:
        throw new Error(`Cannot auto-resolve lifepath phase: ${next.phase}`);
    }
  }

  return next;
};
