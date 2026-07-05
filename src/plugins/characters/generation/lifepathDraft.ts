import type { GenerationLogEntry, GenerationPayload } from "./types";
import type { CareerName, CharacterGender, CharacterSheet, DecisionRecord } from "@/lib/characters/types";
import {
  buildAvatarPromptSlug,
  buildAvatarSlugValuesForGender,
  type CharacterAvatar,
} from "@/lib/characters/avatar";
import type { LifepathGeneratorDefinition } from "./lifepathTypes";
import type {
  LifepathCareerHistoryEntry,
  LifepathRuntimeInjury,
  LifepathRuntimeCharacteristics,
  LifepathRuntimeBenefits,
  LifepathRuntimeRelationship,
  LifepathRuntimeSkill,
  LifepathRuntimeState,
} from "./lifepathRunner";

export interface LifepathCareerDraft {
  careerId: string;
  careerLabel: string;
  assignmentId: string | null;
  assignmentLabel: string | null;
  terms: number;
  finalRank: number;
  finalRankTitle: string | null;
  commissioned: boolean;
}

export interface LifepathHistoryEntry {
  type: string;
  stage: "background" | "preCareer" | "careerTerm" | "musterOut";
  term: number | null;
  label: string;
  detail?: string;
  roll?: number | null;
  careerId?: string | null;
  failedCareerId?: string | null;
  assignmentId?: string | null;
}

export interface LifepathDraft {
  name: string;
  gender?: CharacterGender | null;
  age: number;
  avatar?: CharacterAvatar | null;
  completedTerms: number;
  characteristics: LifepathRuntimeCharacteristics;
  skills: readonly LifepathRuntimeSkill[];
  relationships: readonly LifepathRuntimeRelationship[];
  injuries: readonly LifepathRuntimeInjury[];
  credits: number;
  benefits: LifepathRuntimeBenefits;
  careerHistory: readonly LifepathCareerHistoryEntry[];
  careers: readonly LifepathCareerDraft[];
  history: readonly LifepathHistoryEntry[];
  log: readonly GenerationLogEntry[];
  metadata: {
    generatorId: string;
    generatorLabel: string;
    generatorVersion: string;
    sophontId: string;
    avatarSlugFields?: LifepathGeneratorDefinition["avatarSlugFields"];
  };
}

const payloadString = (
  payload: GenerationPayload,
  key: string,
): string | null => {
  const value = payload[key];
  return typeof value === "string" ? value : null;
};

const payloadBoolean = (
  payload: GenerationPayload,
  key: string,
): boolean | null => {
  const value = payload[key];
  return typeof value === "boolean" ? value : null;
};

const payloadNumber = (
  payload: GenerationPayload,
  key: string,
): number | null => {
  const value = payload[key];
  return typeof value === "number" ? value : null;
};

const payloadStringList = (
  payload: GenerationPayload,
  key: string,
): string[] => {
  const value = payload[key];
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
};

const careerLabel = (
  definition: LifepathGeneratorDefinition,
  careerId: string,
) => definition.careers.find((career) => career.id === careerId)?.label ?? careerId;

const assignmentLabel = (
  definition: LifepathGeneratorDefinition,
  careerId: string,
  assignmentId: string | null,
) => {
  if (!assignmentId) return null;
  const career = definition.careers.find((item) => item.id === careerId);
  return career?.assignments.find((item) => item.id === assignmentId)?.label ?? assignmentId;
};

const careerRankTitle = (
  definition: LifepathGeneratorDefinition,
  careerId: string,
  rank: number,
  commissioned = false,
) => {
  const career = definition.careers.find((item) => item.id === careerId);
  if (!career) return null;
  return career.ranks
    ?.filter((item) => item.rank <= rank)
    .filter((item) => (item.track ?? "enlisted") === (commissioned ? "officer" : "enlisted"))
    .sort((left, right) => right.rank - left.rank)[0]?.title ?? null;
};

const advancementRankText = (entry: GenerationLogEntry): string | null => {
  const careerLabel = payloadString(entry.data, "careerLabel");
  const rank = payloadNumber(entry.data, "rank");
  const rankTitle = payloadString(entry.data, "rankTitle");
  if (rank === null) return null;
  return rankTitle
    ? `${careerLabel ? `${careerLabel} ` : ""}${rankTitle}`
    : `${careerLabel ? `${careerLabel} ` : ""}rank ${rank}`;
};

const buildHistoryDetail = (entry: GenerationLogEntry): string | undefined => {
  const roll = payloadNumber(entry.data, "roll");
  const total = payloadNumber(entry.data, "total");
  const target = payloadNumber(entry.data, "target");
  const characteristicId = payloadString(entry.data, "characteristicId");
  const characteristicModifier = payloadNumber(entry.data, "characteristicModifier") ?? 0;
  const skillName = payloadString(entry.data, "skillName");
  const skillLevel = payloadNumber(entry.data, "skillLevel");
  const skillModifier = payloadNumber(entry.data, "skillModifier") ?? 0;
  const qualified = payloadBoolean(entry.data, "qualified");
  const admitted = payloadBoolean(entry.data, "admitted");
  const graduated = payloadBoolean(entry.data, "graduated");
  const honorsGraduated = payloadBoolean(entry.data, "honorsGraduated");
  const survived = payloadBoolean(entry.data, "survived");
  const commissioned = payloadBoolean(entry.data, "commissioned");
  const advanced = payloadBoolean(entry.data, "advanced");
  const reenlisted = payloadBoolean(entry.data, "reenlisted");
  const effectSummary = payloadStringList(entry.data, "effectSummary");
  const effectText = effectSummary.length > 0 ? effectSummary.join("; ") : null;
  const appendEffectText = (detail: string) =>
    effectText ? `${detail.replace(/\.$/, "")}; ${effectText}.` : detail;
  const modifierParts = [
    ...(characteristicId && characteristicModifier !== 0
      ? [`${characteristicModifier > 0 ? "+" : ""}${characteristicModifier} ${characteristicId.toUpperCase()}`]
      : []),
    ...(skillName
      ? [`${skillModifier > 0 ? "+" : ""}${skillModifier} ${skillName}${skillLevel === null ? " untrained" : `-${skillLevel}`}`]
      : []),
  ];
  const rollText = roll !== null && total !== null && modifierParts.length > 0
    ? `Roll ${roll} ${modifierParts.join(" ")} = ${total}`
    : roll !== null
      ? `Roll ${roll}`
      : null;

  if (typeof qualified === "boolean" && rollText && target !== null) {
    return appendEffectText(`${rollText} vs ${target}+; ${qualified ? "qualified" : "not qualified"}.`);
  }
  if (typeof admitted === "boolean" && rollText && target !== null) {
    return appendEffectText(`${rollText} vs ${target}+; ${admitted ? "admitted" : "not admitted"}.`);
  }
  if (typeof graduated === "boolean" && rollText && target !== null) {
    const outcome = honorsGraduated ? "graduated with honors" : graduated ? "graduated" : "did not graduate";
    return appendEffectText(`${rollText} vs ${target}+; ${outcome}.`);
  }
  if (typeof survived === "boolean" && rollText && target !== null) {
    return appendEffectText(`${rollText} vs ${target}+; ${survived ? "survived" : "mishap"}.`);
  }
  if (typeof commissioned === "boolean" && rollText && target !== null) {
    return appendEffectText(`${rollText} vs ${target}+; ${commissioned ? "commissioned" : "not commissioned"}.`);
  }
  if (typeof advanced === "boolean" && rollText && target !== null) {
    const rankText = advanced ? advancementRankText(entry) : null;
    return appendEffectText(`${rollText} vs ${target}+; ${advanced ? `advanced${rankText ? ` to ${rankText}` : ""}` : "no advancement"}.`);
  }
  if (typeof reenlisted === "boolean" && rollText && target !== null) {
    const outcome = payloadString(entry.data, "outcome");
    return appendEffectText(`${rollText} vs ${target}+; ${reenlisted ? "continued" : "not retained"}${outcome ? ` (${outcome})` : ""}.`);
  }
  if (effectText) {
    return effectText;
  }
  if (rollText) return appendEffectText(`${rollText}.`);
  return undefined;
};

const historyLabel = (entry: GenerationLogEntry): string => {
  switch (entry.type) {
    case "background.skill.select":
      return `Background skill: ${payloadString(entry.data, "entryLabel") ?? entry.label}`;
    case "preCareer.skip":
      return "Skipped pre-career education";
    case "preCareer.select":
      return `Selected pre-career education: ${payloadString(entry.data, "educationLabel") ?? entry.label}`;
    case "preCareer.qualification.roll": {
      const admitted = payloadBoolean(entry.data, "admitted");
      return admitted === false
        ? `Failed admission: ${payloadString(entry.data, "educationLabel") ?? entry.label}`
        : entry.label;
    }
    case "preCareer.graduation.roll": {
      const graduated = payloadBoolean(entry.data, "graduated");
      return graduated === false
        ? `Failed graduation: ${payloadString(entry.data, "educationLabel") ?? entry.label}`
        : entry.label;
    }
    case "career.select":
      return `Attempted ${payloadString(entry.data, "careerLabel") ?? entry.label}`;
    case "qualification.roll": {
      const qualified = payloadBoolean(entry.data, "qualified");
      return qualified === false
        ? `Failed qualification: ${entry.label}`
        : entry.label;
    }
    case "qualification.fallback":
      return payloadString(entry.data, "failurePath") === "alternate"
        ? `Entered alternate career: ${payloadString(entry.data, "careerLabel") ?? entry.label}`
        : `Entered fallback career: ${payloadString(entry.data, "careerLabel") ?? entry.label}`;
    case "assignment.select":
      return `Assignment: ${payloadString(entry.data, "assignmentLabel") ?? entry.label}`;
    case "commission.roll":
      return entry.label;
    case "reenlistment.roll":
      return entry.label;
    case "benefit.choice":
      return `Muster-out choice: ${payloadString(entry.data, "tableLabel") ?? entry.label}`;
    case "rank.benefit":
      return `Rank benefit: ${payloadString(entry.data, "rankTitle") ?? entry.label}`;
    case "aging.effect":
      return entry.label;
    default:
      return entry.label;
  }
};

const preCareerHistoryTypes = new Set([
  "preCareer.skip",
  "preCareer.select",
  "preCareer.qualification.roll",
  "preCareer.graduation.roll",
]);

const musterOutHistoryTypes = new Set([
  "generation.muster-out",
  "benefit.choice",
  "benefit.roll",
]);

const historyStage = (
  entry: GenerationLogEntry,
): LifepathHistoryEntry["stage"] => {
  const explicitStage = payloadString(entry.data, "historyStage");
  if (
    explicitStage === "background"
    || explicitStage === "preCareer"
    || explicitStage === "careerTerm"
    || explicitStage === "musterOut"
  ) {
    return explicitStage;
  }
  if (preCareerHistoryTypes.has(entry.type)) return "preCareer";
  if (musterOutHistoryTypes.has(entry.type)) return "musterOut";
  if (entry.term === null) return "background";
  return "careerTerm";
};

const buildLifepathHistory = (
  log: readonly GenerationLogEntry[],
): LifepathHistoryEntry[] =>
  log
    .filter((entry) => [
      "career.select",
      "preCareer.skip",
      "preCareer.select",
      "preCareer.qualification.roll",
      "preCareer.graduation.roll",
      "background.skill.select",
      "qualification.roll",
      "qualification.choose-career",
      "qualification.fallback",
      "assignment.select",
      "survival.roll",
      "skill.roll",
      "career-event.roll",
      "table.choice.select",
      "mishap.roll",
      "commission.roll",
      "advancement.roll",
      "rank.benefit",
      "aging.effect",
      "term.continue",
      "reenlistment.roll",
      "career.change",
      "generation.muster-out",
      "benefit.choice",
      "benefit.roll",
    ].includes(entry.type))
    .map((entry) => ({
      type: entry.type,
      stage: historyStage(entry),
      term: entry.term,
      label: historyLabel(entry),
      detail: buildHistoryDetail(entry),
      roll: payloadNumber(entry.data, "roll"),
      careerId: payloadString(entry.data, "careerId"),
      failedCareerId: payloadString(entry.data, "failedCareerId"),
      assignmentId: payloadString(entry.data, "assignmentId"),
    }));

export const buildLifepathDraft = (
  state: LifepathRuntimeState,
  definition: LifepathGeneratorDefinition,
  name = "Unnamed Traveller",
  gender: CharacterGender | null = null,
): LifepathDraft => {
  const careerTerms = new Map<string, {
    careerId: string;
    assignmentId: string | null;
    terms: Set<number>;
    finalRank: number;
    commissioned: boolean;
  }>();

  for (const entry of state.careerHistory) {
    const careerId = entry.careerId;
    const assignmentId = entry.assignmentId;
    const key = `${careerId}:${assignmentId ?? ""}`;
    const record = careerTerms.get(key) ?? {
      careerId,
      assignmentId,
      terms: new Set<number>(),
      finalRank: entry.rank,
      commissioned: entry.commissioned,
    };
    record.terms.add(entry.term);
    record.finalRank = entry.rank;
    record.commissioned = entry.commissioned;
    careerTerms.set(key, record);
  }

  const history = buildLifepathHistory(state.log);
  const avatar = buildLifepathAvatar(definition, gender);

  return {
    name,
    gender,
    age: state.age,
    avatar,
    completedTerms: state.completedTerms,
    characteristics: state.characteristics,
    skills: state.skills,
    relationships: state.relationships,
    injuries: state.injuries,
    credits: state.credits,
    benefits: state.benefits,
    careerHistory: state.careerHistory,
    careers: Array.from(careerTerms.values()).map((record) => {
      return {
        careerId: record.careerId,
        careerLabel: careerLabel(definition, record.careerId),
        assignmentId: record.assignmentId,
        assignmentLabel: assignmentLabel(definition, record.careerId, record.assignmentId),
        terms: record.terms.size,
        finalRank: record.finalRank,
        finalRankTitle: careerRankTitle(definition, record.careerId, record.finalRank, record.commissioned),
        commissioned: record.commissioned,
      };
    }),
    history,
    log: state.log,
    metadata: {
      generatorId: definition.id,
      generatorLabel: definition.label,
      generatorVersion: definition.version,
      sophontId: definition.sophontId,
      avatarSlugFields: definition.avatarSlugFields,
    },
  };
};

const buildLifepathAvatar = (
  definition: LifepathGeneratorDefinition,
  gender: CharacterGender | null,
): CharacterAvatar | null => {
  const fields = definition.avatarSlugFields;
  if (!fields || fields.length === 0) return null;

  const slugValues = buildAvatarSlugValuesForGender(fields, gender);
  return {
    slugValues,
    promptSlug: buildAvatarPromptSlug(fields, slugValues),
    currentPortraitPath: null,
    images: [],
  };
};

const lifepathCareerToClassicCareer = (careerId: string): CareerName => {
  if (careerId.includes("trader")) return "merchants";
  if (careerId.includes("scout")) return "scouts";
  return "other";
};

const lifepathLogToDecisionRecord = (
  entry: GenerationLogEntry,
): DecisionRecord => ({
  step: "lifepath_event",
  term: entry.term,
  options: [],
  chosen: entry.label,
  roll: typeof entry.data.roll === "number" ? entry.data.roll : null,
  madeBy: "directed",
});

export const lifepathDraftToCharacterSheet = (
  draft: LifepathDraft,
): CharacterSheet => ({
  name: draft.name,
  gender: draft.gender ?? null,
  age: draft.age,
  avatar: draft.avatar ?? null,
  upp: {
    str: draft.characteristics.str ?? 7,
    dex: draft.characteristics.dex ?? 7,
    end: draft.characteristics.end ?? 7,
    int: draft.characteristics.int ?? 7,
    edu: draft.characteristics.edu ?? 7,
    soc: draft.characteristics.soc ?? 7,
  },
  skills: draft.skills.map((skill) => ({
    name: skill.name,
    level: skill.level,
  })),
  careers: draft.careers.map((career) => ({
    career: lifepathCareerToClassicCareer(career.careerId),
    terms: career.terms,
    rank: career.finalRank,
    commissioned: career.commissioned,
  })),
  credits: draft.credits,
  benefits: {
    passages: draft.benefits.passages,
    ships: draft.benefits.ships.filter((ship) =>
      ship === "scout" || ship === "free_trader"),
    societies: draft.benefits.societies.filter((society) => society === "TAS"),
    weapons: [...draft.benefits.weapons],
    retirementPay: draft.benefits.retirementPay,
  },
  homeWorldId: null,
  currentLocation: null,
  generation: {
    ruleset: "lifepath",
    mode: "directed",
    targetRole: null,
    decisions: draft.log.map(lifepathLogToDecisionRecord),
    metadata: {
      ...draft.metadata,
      gender: draft.gender ?? null,
      avatar: draft.avatar ?? null,
      completedTerms: draft.completedTerms,
      characteristics: draft.characteristics,
      credits: draft.credits,
      benefits: draft.benefits,
      relationships: draft.relationships,
      injuries: draft.injuries,
      careerHistory: draft.careerHistory,
      careers: draft.careers,
      history: draft.history,
    },
  },
});
