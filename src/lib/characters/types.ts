export type CareerName = "navy" | "marines" | "army" | "scouts" | "merchants" | "other";
export type GenerationMode = "random" | "guided" | "directed";
export type DecisionMadeBy = "random" | "human" | "directed";
export type DecisionStep =
  | "characteristics"
  | "career_selection"
  | "enlistment_roll"
  | "survival_roll"
  | "commission_roll"
  | "promotion_roll"
  | "skill_table_choice"
  | "skill_roll"
  | "cascade_roll"
  | "aging_roll"
  | "reenlistment_decision"
  | "muster_roll_type"
  | "muster_roll";

export interface UPP {
  str: number;
  dex: number;
  end: number;
  int: number;
  edu: number;
  soc: number;
}

export interface Skill {
  name: string;
  level: number;
}

export interface CareerRecord {
  career: CareerName;
  terms: number;
  rank: number;
  commissioned: boolean;
}

export interface Passages {
  low: number;
  middle: number;
  high: number;
}

export interface Benefits {
  passages: Passages;
  ships: Array<"scout" | "free_trader">;
  societies: Array<"TAS">;
  weapons: string[];
  retirementPay: number | null;
}

export interface DecisionRecord {
  step: DecisionStep;
  term: number | null;
  options: string[];
  chosen: string;
  roll: number | null;
  madeBy: DecisionMadeBy;
}

export interface Generation {
  ruleset: "classic";
  mode: GenerationMode;
  targetRole: string | null;
  decisions: DecisionRecord[];
}

export interface CharacterSheet {
  name: string;
  age: number;
  upp: UPP;
  skills: Skill[];
  careers: CareerRecord[];
  credits: number;
  benefits: Benefits;
  homeWorldId: string | null;
  currentWorldId: string | null;
  generation: Generation;
}

// --- Engine internals ---

export interface DecisionOption {
  id: string;
  label: string;
}

export interface DecisionPoint {
  step: DecisionStep;
  term: number | null;
  options: DecisionOption[];
  roll?: number;
}

export interface DecisionProvider {
  decide(point: DecisionPoint): Promise<string>;
}

export interface GenerationOptions {
  mode?: GenerationMode;
  targetRole?: string;
  homeWorldId?: string;
  currentWorldId?: string;
}
