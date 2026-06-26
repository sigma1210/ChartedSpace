import type {
  GenerationAction,
  GenerationEffect,
  GenerationLogEntry,
  GenerationPayload,
} from "../types";
import type {
  LifepathCharacteristicId,
  LifepathEffect,
} from "../lifepathTypes";

export type LifepathRuntimePhase =
  | "roll-characteristics"
  | "background"
  | "pre-career-choice"
  | "pre-career-qualification"
  | "pre-career-graduation"
  | "pre-career-skill"
  | "choose-career"
  | "qualification"
  | "qualification-failed"
  | "choose-assignment"
  | "ready-for-term"
  | "commission"
  | "survival"
  | "skill"
  | "event"
  | "mishap"
  | "advancement"
  | "aging"
  | "term-complete"
  | "reenlistment"
  | "muster-out"
  | "generation-complete";

export interface LifepathRuntimeSkill {
  name: string;
  level: number;
}

export interface LifepathRuntimeRelationship {
  id?: string;
  type: string;
  label: string;
  source?: string;
  careerId?: string;
  term?: number;
  notes?: string;
  characterId?: string;
  role?: string;
  eventId?: string;
  eventType?: string;
}

export interface LifepathRuntimeInjury {
  severity: string;
  label?: string;
}

export type LifepathRuntimeCharacteristics = Partial<Record<LifepathCharacteristicId, number>>;

export interface LifepathRuntimePassages {
  low: number;
  middle: number;
  high: number;
}

export interface LifepathRuntimeBenefits {
  passages: LifepathRuntimePassages;
  ships: string[];
  societies: string[];
  weapons: string[];
  retirementPay: number | null;
}

export interface LifepathEffectContext {
  eventId?: string;
  eventType?: string;
  careerId?: string;
  term?: number;
}

export interface LifepathMusterOutTerm {
  term: number;
  careerId: string;
}

export interface LifepathCareerHistoryEntry {
  term: number;
  careerId: string;
  assignmentId: string | null;
  survived: boolean;
  rank: number;
  commissioned: boolean;
}

export interface LifepathPreCareerEducationOutcome {
  educationId: string;
  graduated: boolean;
  honorsGraduated: boolean;
}

export interface LifepathMusterOutState {
  pendingTerms: LifepathMusterOutTerm[];
  selectedBenefitTableId: string | null;
}

export interface LifepathPendingChoice {
  id: string;
  title: string;
  prompt: string;
  resumePhase: LifepathRuntimePhase;
  options: readonly {
    id: string;
    label: string;
    description?: string;
    effects: readonly LifepathEffect[];
    data?: GenerationPayload;
  }[];
}

export interface LifepathRuntimeState {
  generatorId: string;
  phase: LifepathRuntimePhase;
  term: number;
  age: number;
  selectedPreCareerEducationId: string | null;
  preCareerEducationOutcomes: LifepathPreCareerEducationOutcome[];
  preCareerHonorsGraduated: boolean;
  pendingPreCareerSkillRolls: number;
  selectedCareerId: string | null;
  selectedAssignmentId: string | null;
  termSurvived: boolean | null;
  commissioned: boolean;
  pendingChoice: LifepathPendingChoice | null;
  characteristics: LifepathRuntimeCharacteristics;
  careerRank: number;
  completedTerms: number;
  careerHistory: LifepathCareerHistoryEntry[];
  skills: LifepathRuntimeSkill[];
  relationships: LifepathRuntimeRelationship[];
  injuries: LifepathRuntimeInjury[];
  credits: number;
  benefits: LifepathRuntimeBenefits;
  musterOut: LifepathMusterOutState | null;
  actions: GenerationAction[];
  effects: GenerationEffect[];
  log: GenerationLogEntry[];
}

export type LifepathRuntimeAction =
  | {
      type: "characteristics.roll";
      source?: GenerationAction["source"];
    }
  | {
      type: "career.select";
      careerId: string;
      source?: GenerationAction["source"];
    }
  | {
      type: "background.skill.select";
      tableId: string;
      entryId: string;
      source?: GenerationAction["source"];
    }
  | {
      type: "preCareer.skip";
      source?: GenerationAction["source"];
    }
  | {
      type: "preCareer.select";
      educationId: string;
      source?: GenerationAction["source"];
    }
  | {
      type: "preCareer.qualification.resolve";
    }
  | {
      type: "preCareer.graduation.resolve";
    }
  | {
      type: "preCareer.skill.resolve";
    }
  | {
      type: "assignment.select";
      assignmentId: string;
      source?: GenerationAction["source"];
    }
  | {
      type: "career.qualification.resolve";
    }
  | {
      type: "qualification.choose-career";
      source?: GenerationAction["source"];
    }
  | {
      type: "qualification.fallback";
      careerId?: string;
      source?: GenerationAction["source"];
    }
  | {
      type: "term.survival.resolve";
    }
  | {
      type: "term.commission.resolve";
    }
  | {
      type: "term.skill.resolve";
    }
  | {
      type: "term.event.resolve";
    }
  | {
      type: "term.mishap.resolve";
    }
  | {
      type: "term.advancement.resolve";
    }
  | {
      type: "term.aging.resolve";
    }
  | {
      type: "term.reenlistment.resolve";
    }
  | {
      type: "table.choice.select";
      choiceId: string;
      source?: GenerationAction["source"];
    }
  | {
      type: "term.continue";
      source?: GenerationAction["source"];
    }
  | {
      type: "career.change";
      source?: GenerationAction["source"];
    }
  | {
      type: "generation.muster-out";
      source?: GenerationAction["source"];
    }
  | {
      type: "muster-out.benefit.select";
      tableId: string;
      source?: GenerationAction["source"];
    }
  | {
      type: "muster-out.resolve";
    };

export interface LifepathRollRequest {
  id: string;
  notation: string;
  reason: string;
}

export interface LifepathRollProvider {
  roll: (request: LifepathRollRequest) => number;
}
