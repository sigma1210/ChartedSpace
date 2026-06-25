import type { GenerationLogEntry, GenerationPayload } from "./types";
import type { CareerName, CharacterSheet, DecisionRecord } from "@/lib/characters/types";
import type { LifepathGeneratorDefinition } from "./lifepathTypes";
import type {
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
  age: number;
  completedTerms: number;
  characteristics: LifepathRuntimeCharacteristics;
  skills: readonly LifepathRuntimeSkill[];
  relationships: readonly LifepathRuntimeRelationship[];
  injuries: readonly LifepathRuntimeInjury[];
  credits: number;
  benefits: LifepathRuntimeBenefits;
  careers: readonly LifepathCareerDraft[];
  history: readonly LifepathHistoryEntry[];
  log: readonly GenerationLogEntry[];
  metadata: {
    generatorId: string;
    generatorLabel: string;
    generatorVersion: string;
    sophontId: string;
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
  const survived = payloadBoolean(entry.data, "survived");
  const commissioned = payloadBoolean(entry.data, "commissioned");
  const advanced = payloadBoolean(entry.data, "advanced");
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
    return `${rollText} vs ${target}+; ${qualified ? "qualified" : "not qualified"}.`;
  }
  if (typeof survived === "boolean" && rollText && target !== null) {
    return `${rollText} vs ${target}+; ${survived ? "survived" : "mishap"}.`;
  }
  if (typeof commissioned === "boolean" && rollText && target !== null) {
    return `${rollText} vs ${target}+; ${commissioned ? "commissioned" : "not commissioned"}.`;
  }
  if (typeof advanced === "boolean" && rollText && target !== null) {
    const rankText = advanced ? advancementRankText(entry) : null;
    return `${rollText} vs ${target}+; ${advanced ? `advanced${rankText ? ` to ${rankText}` : ""}` : "no advancement"}.`;
  }
  if (rollText) return `${rollText}.`;
  return undefined;
};

const historyLabel = (entry: GenerationLogEntry): string => {
  switch (entry.type) {
    case "background.skill.select":
      return `Background skill: ${payloadString(entry.data, "entryLabel") ?? entry.label}`;
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
    case "benefit.choice":
      return `Muster-out choice: ${payloadString(entry.data, "tableLabel") ?? entry.label}`;
    case "rank.benefit":
      return `Rank benefit: ${payloadString(entry.data, "rankTitle") ?? entry.label}`;
    default:
      return entry.label;
  }
};

const buildLifepathHistory = (
  log: readonly GenerationLogEntry[],
): LifepathHistoryEntry[] =>
  log
    .filter((entry) => [
      "career.select",
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
      "term.continue",
      "career.change",
      "generation.muster-out",
      "benefit.choice",
      "benefit.roll",
    ].includes(entry.type))
    .map((entry) => ({
      type: entry.type,
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
): LifepathDraft => {
  const careerTerms = new Map<string, {
    careerId: string;
    assignmentId: string | null;
    terms: Set<number>;
  }>();

  for (const entry of state.log) {
    if (entry.type !== "survival.roll" || entry.term === null) continue;
    const careerId = payloadString(entry.data, "careerId");
    if (!careerId) continue;
    const assignmentId = payloadString(entry.data, "assignmentId");
    const key = `${careerId}:${assignmentId ?? ""}`;
    const record = careerTerms.get(key) ?? {
      careerId,
      assignmentId,
      terms: new Set<number>(),
    };
    record.terms.add(entry.term);
    careerTerms.set(key, record);
  }

  const history = buildLifepathHistory(state.log);

  return {
    name,
    age: state.age,
    completedTerms: state.completedTerms,
    characteristics: state.characteristics,
    skills: state.skills,
    relationships: state.relationships,
    injuries: state.injuries,
    credits: state.credits,
    benefits: state.benefits,
    careers: Array.from(careerTerms.values()).map((record) => {
      const finalRank = state.selectedCareerId === record.careerId ? state.careerRank : 0;
      const commissioned = state.selectedCareerId === record.careerId ? state.commissioned : false;
      return {
        careerId: record.careerId,
        careerLabel: careerLabel(definition, record.careerId),
        assignmentId: record.assignmentId,
        assignmentLabel: assignmentLabel(definition, record.careerId, record.assignmentId),
        terms: record.terms.size,
        finalRank,
        finalRankTitle: careerRankTitle(definition, record.careerId, finalRank, commissioned),
        commissioned,
      };
    }),
    history,
    log: state.log,
    metadata: {
      generatorId: definition.id,
      generatorLabel: definition.label,
      generatorVersion: definition.version,
      sophontId: definition.sophontId,
    },
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
  age: draft.age,
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
      completedTerms: draft.completedTerms,
      characteristics: draft.characteristics,
      credits: draft.credits,
      benefits: draft.benefits,
      relationships: draft.relationships,
      injuries: draft.injuries,
      careers: draft.careers,
      history: draft.history,
    },
  },
});
