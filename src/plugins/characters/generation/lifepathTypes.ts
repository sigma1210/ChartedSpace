import type {
  GenerationEffect,
  GenerationPayload,
  GenerationTable,
  GenerationTableEntry,
} from "./types";
import type { AvatarSlugFieldDefinition } from "@/lib/characters/avatar";

export type LifepathCharacteristicId =
  | "str"
  | "dex"
  | "end"
  | "int"
  | "edu"
  | "soc"
  | (string & {});

export type LifepathRelationshipType =
  | "contact"
  | "ally"
  | "friend"
  | "rival"
  | "enemy"
  | "patron"
  | "dependent";

export type LifepathStandardEffectType =
  | "age.add"
  | "asset.add"
  | "benefit.add"
  | "career.assign"
  | "career.enter"
  | "career.leave"
  | "career.promote"
  | "characteristic.modify"
  | "credit.add"
  | "generation.complete"
  | "injury.add"
  | "note.add"
  | "relationship.add"
  | "skill.add";

export interface LifepathEffect extends Omit<GenerationEffect, "type"> {
  type: LifepathStandardEffectType | `plugin.${string}`;
}

export interface LifepathCharacteristicDefinition {
  id: LifepathCharacteristicId;
  label: string;
  abbreviation: string;
  rollNotation?: string;
  minimum?: number;
  maximum?: number;
}

export interface LifepathCheckDefinition {
  id: string;
  label: string;
  notation: string;
  target: number;
  characteristicModifier?: LifepathCharacteristicId;
  skillModifier?: string;
  successEffects?: readonly LifepathEffect[];
  failureEffects?: readonly LifepathEffect[];
  data?: GenerationPayload;
}

export interface LifepathRankDefinition {
  rank: number;
  title: string;
  track?: "enlisted" | "officer" | (string & {});
  effects?: readonly LifepathEffect[];
}

export interface LifepathAssignmentDefinition {
  id: string;
  label: string;
  description?: string;
  skillTableIds?: readonly string[];
  survivalModifier?: number;
  advancementModifier?: number;
  eventTableModifier?: number;
  data?: GenerationPayload;
}

export interface LifepathQualificationModifierDefinition {
  id: string;
  label: string;
  modifier: number;
  when: "hasCareerHistory" | "previousCareer" | "sameCareer" | "preCareerEducation";
  careerIds?: readonly string[];
  educationIds?: readonly string[];
  survived?: boolean;
  graduated?: boolean;
  honorsGraduated?: boolean;
  minimumTerms?: number;
  maximumTerms?: number;
  successEffects?: readonly LifepathEffect[];
  failureEffects?: readonly LifepathEffect[];
  data?: GenerationPayload;
}

export interface LifepathCareerDefinition {
  id: string;
  label: string;
  description?: string;
  eligibility?: {
    minimumCharacteristics?: Partial<Record<LifepathCharacteristicId, number>>;
    disallowAfterFailedReenlistment?: boolean;
  };
  qualification?: LifepathCheckDefinition;
  qualificationModifiers?: readonly LifepathQualificationModifierDefinition[];
  commissionModifiers?: readonly LifepathQualificationModifierDefinition[];
  assignments: readonly LifepathAssignmentDefinition[];
  ranks?: readonly LifepathRankDefinition[];
  skillTableIds: readonly string[];
  survival: LifepathCheckDefinition;
  advancement?: LifepathCheckDefinition;
  commission?: LifepathCheckDefinition;
  reenlistment?: LifepathCheckDefinition;
  eventTableId: string;
  mishapTableId: string;
  benefitTableIds: readonly string[];
  data?: GenerationPayload;
}

export interface LifepathPreCareerEducationDefinition {
  id: string;
  label: string;
  description?: string;
  qualification?: LifepathCheckDefinition;
  graduation?: LifepathCheckDefinition;
  honorsTarget?: number;
  skillTableIds?: readonly string[];
  successEffects?: readonly LifepathEffect[];
  failureEffects?: readonly LifepathEffect[];
  honorsEffects?: readonly LifepathEffect[];
  data?: GenerationPayload;
}

export type LifepathTableScope =
  | "background"
  | "benefit"
  | "career-event"
  | "choice"
  | "mishap"
  | "relationship"
  | "skill";

export interface LifepathTableEntry extends Omit<GenerationTableEntry, "effects"> {
  effects: readonly LifepathEffect[];
  choicePrompt?: string;
  choices?: readonly {
    id: string;
    label: string;
    description?: string;
    effects: readonly LifepathEffect[];
    data?: GenerationPayload;
  }[];
}

export interface LifepathTableDefinition extends Omit<GenerationTable, "entries"> {
  scope: LifepathTableScope;
  entries: readonly LifepathTableEntry[];
}

export interface LifepathRelationshipDefinition {
  id: string;
  type: LifepathRelationshipType;
  label: string;
  description?: string;
  defaultEffects?: readonly LifepathEffect[];
  data?: GenerationPayload;
}

export type LifepathTermPhase =
  | "qualify"
  | "choose-assignment"
  | "survival"
  | "event"
  | "mishap"
  | "advancement"
  | "commission"
  | "skill"
  | "aging"
  | "reenlist"
  | "benefits"
  | "complete";

export interface LifepathTermDefinition {
  id: string;
  label: string;
  phases: readonly LifepathTermPhase[];
}

export interface LifepathStartingRulesDefinition {
  age: number;
  characteristicRollNotation: string;
  backgroundSkillTableIds?: readonly string[];
  startingEffects?: readonly LifepathEffect[];
  agingRules?: {
    startsAtAge: number;
    frequencyYears?: number;
    characteristicId?: LifepathCharacteristicId;
    characteristicCycle?: readonly LifepathCharacteristicId[];
    modifier: number;
  };
}

export interface LifepathCompletionRulesDefinition {
  requiredName?: boolean;
  finalEffects?: readonly LifepathEffect[];
}

export interface LifepathGeneratorDefinition {
  id: string;
  label: string;
  version: string;
  sophontId: string;
  avatarSlugFields?: readonly AvatarSlugFieldDefinition[];
  characteristics: readonly LifepathCharacteristicDefinition[];
  startingRules: LifepathStartingRulesDefinition;
  preCareerEducation?: readonly LifepathPreCareerEducationDefinition[];
  term: LifepathTermDefinition;
  careers: readonly LifepathCareerDefinition[];
  tables: readonly LifepathTableDefinition[];
  relationships?: readonly LifepathRelationshipDefinition[];
  completionRules?: LifepathCompletionRulesDefinition;
  data?: GenerationPayload;
}
