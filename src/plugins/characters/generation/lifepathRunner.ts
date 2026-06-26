import type {
  GenerationAction,
  GenerationEffect,
  GenerationLogEntry,
  GenerationPayload,
  GenerationStep,
} from "./types";
import { createInitialLifepathState } from "./lifepath/initialState";
import {
  applyLifepathEffects,
  effectSummary,
} from "./lifepath/effects";
import { resolveCheckRoll } from "./lifepath/checks";
import {
  findAssignment,
  findCareer,
  findTable,
  findTableEntry,
} from "./lifepath/lookups";
import {
  characteristicDm,
  commissionHistoryModifiers,
  qualificationHistoryModifiers,
  skillDm,
} from "./lifepath/modifiers";
import {
  payloadBoolean,
  payloadNumber,
  payloadString,
  payloadStringList,
} from "./lifepath/payload";
import type {
  LifepathCareerHistoryEntry,
  LifepathMusterOutTerm,
  LifepathPendingChoice,
  LifepathRollProvider,
  LifepathRuntimeAction,
  LifepathRuntimeCharacteristics,
  LifepathRuntimePhase,
  LifepathRuntimeSkill,
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
  LifepathEffect,
  LifepathGeneratorDefinition,
  LifepathQualificationModifierDefinition,
} from "./lifepathTypes";

const nextSequence = (state: LifepathRuntimeState) => state.log.length;

const appendActionAndLog = ({
  state,
  action,
  label,
  data,
}: {
  state: LifepathRuntimeState;
  action: GenerationAction;
  label: string;
  data?: GenerationLogEntry["data"];
}): Pick<LifepathRuntimeState, "actions" | "log"> => ({
  actions: [...state.actions, action],
  log: [
    ...state.log,
    {
      sequence: nextSequence(state),
      type: action.type,
      actionId: action.id,
      term: action.term === undefined ? state.term : action.term,
      label,
      data: data ?? {},
    },
  ],
});

const postBackgroundPhase = (
  definition: LifepathGeneratorDefinition,
): LifepathRuntimePhase =>
  definition.preCareerEducation?.length ? "pre-career-choice" : "choose-career";

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

const termStartPhase = (
  career: LifepathCareerDefinition,
  commissioned: boolean,
): LifepathRuntimePhase => career.commission && !commissioned ? "commission" : "ready-for-term";

const hasFailedReenlistment = (
  state: LifepathRuntimeState,
  careerId: string,
) => state.log.some((entry) =>
  entry.type === "reenlistment.roll"
  && entry.data.careerId === careerId
  && entry.data.reenlisted === false);

const careerEligibilityReason = (
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
      );

    case "career.select": {
      if (state.phase !== "choose-career") {
        throw new Error(`Cannot select a career during ${state.phase}.`);
      }

      const career = findCareer(definition, runtimeAction.careerId);
      if (!career) throw new Error(`Unknown lifepath career: ${runtimeAction.careerId}`);
      const ineligibleReason = careerEligibilityReason(state, career);
      if (ineligibleReason) {
        throw new Error(`Cannot select ${career.label}: ${ineligibleReason}`);
      }

      const action: GenerationAction = {
        id: `term-${state.term}.career.select`,
        type: "career.select",
        source: runtimeAction.source ?? "player",
        stepId: "lifepath.choose-career",
        term: state.term,
        payload: {
          careerId: career.id,
        },
      };
      const tracked = appendActionAndLog({
        state,
        action,
        label: `Career: ${career.label}`,
        data: {
          careerId: career.id,
          careerLabel: career.label,
        },
      });

      return {
        ...state,
        ...tracked,
        phase: career.qualification ? "qualification" : "choose-assignment",
        selectedCareerId: career.id,
        selectedAssignmentId: null,
        commissioned: false,
      };
    }

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

    case "assignment.select": {
      if (state.phase !== "choose-assignment") {
        throw new Error(`Cannot select an assignment during ${state.phase}.`);
      }
      if (!state.selectedCareerId) {
        throw new Error("Cannot select an assignment before selecting a career.");
      }

      const career = findCareer(definition, state.selectedCareerId);
      if (!career) throw new Error(`Unknown lifepath career: ${state.selectedCareerId}`);

      const assignment = findAssignment(career, runtimeAction.assignmentId);
      if (!assignment) {
        throw new Error(`Unknown lifepath assignment: ${runtimeAction.assignmentId}`);
      }

      const action: GenerationAction = {
        id: `term-${state.term}.assignment.select`,
        type: "assignment.select",
        source: runtimeAction.source ?? "player",
        stepId: "lifepath.choose-assignment",
        term: state.term,
        payload: {
          careerId: career.id,
          assignmentId: assignment.id,
        },
      };
      const tracked = appendActionAndLog({
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
        ...state,
        ...tracked,
        phase: termStartPhase(career, state.commissioned),
        selectedAssignmentId: assignment.id,
      };
    }

    case "term.commission.resolve":
      return resolveCommissionPhase(state, definition, requireRollProvider(rollProvider));

    case "term.survival.resolve":
      return resolveSurvivalPhase(state, definition, requireRollProvider(rollProvider));

    case "term.skill.resolve":
      return resolveSkillPhase(state, definition, requireRollProvider(rollProvider));

    case "term.event.resolve":
      return resolveEventPhase(state, definition, requireRollProvider(rollProvider));

    case "term.mishap.resolve":
      return resolveMishapPhase(state, definition, requireRollProvider(rollProvider));

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

const appendTrackedAction = ({
  state,
  action,
  label,
  data,
}: {
  state: LifepathRuntimeState;
  action: GenerationAction;
  label: string;
  data?: GenerationLogEntry["data"];
}): LifepathRuntimeState => ({
  ...state,
  ...appendActionAndLog({ state, action, label, data }),
});

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

const selectBackgroundSkill = (
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

const skipPreCareerEducation = (
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

const selectPreCareerEducation = (
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

const resolvePreCareerQualificationPhase = (
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

const resolvePreCareerGraduationPhase = (
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

const resolvePreCareerSkillPhase = (
  state: LifepathRuntimeState,
  definition: LifepathGeneratorDefinition,
  rollProvider: LifepathRollProvider,
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

const resolveTable = ({
  state,
  definition,
  tableId,
  rollProvider,
  reason,
  term = state.term,
  historyStage,
  resumePhase,
}: {
  state: LifepathRuntimeState;
  definition: LifepathGeneratorDefinition;
  tableId: string;
  rollProvider: LifepathRollProvider;
  reason: string;
  term?: number | null;
  historyStage?: "background" | "preCareer" | "careerTerm" | "musterOut";
  resumePhase: LifepathRuntimePhase;
}): LifepathRuntimeState => {
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

const resolveCommissionPhase = (
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

const resolveSurvivalPhase = (
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

const resolveQualificationPhase = (
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

const chooseAnotherCareerAfterQualificationFailure = (
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

const enterFallbackCareerAfterQualificationFailure = (
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

const nextSuccessfulTermPhase = (
  definition: LifepathGeneratorDefinition,
  career: LifepathCareerDefinition,
  assignmentId: string | null,
): LifepathRuntimePhase => {
  const assignment = assignmentId ? findAssignment(career, assignmentId) : null;
  const skillTableId = assignment?.skillTableIds?.[0] ?? career.skillTableIds[0];
  return skillTableId && findTable(definition, skillTableId) ? "skill" : "event";
};

const resolveSkillPhase = (
  state: LifepathRuntimeState,
  definition: LifepathGeneratorDefinition,
  rollProvider: LifepathRollProvider,
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

const resolveEventPhase = (
  state: LifepathRuntimeState,
  definition: LifepathGeneratorDefinition,
  rollProvider: LifepathRollProvider,
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

const resolveMishapPhase = (
  state: LifepathRuntimeState,
  definition: LifepathGeneratorDefinition,
  rollProvider: LifepathRollProvider,
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

const resolveAdvancementPhase = (
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

const resolveAgingPhase = (
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

const selectPendingChoice = (
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

const continueLifepathCareer = (
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

const resolveReenlistmentPhase = (
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

const changeLifepathCareer = (
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

const musterOutLifepath = (
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

const getCurrentMusterOutBenefit = (
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

const selectMusterOutBenefitTable = (
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

const resolveMusterOutPhase = (
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
