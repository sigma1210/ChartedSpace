import careersRaw from "../../data/classic/careers.json";
import musteringOutRaw from "../../data/classic/mustering-out.json";
import cascadesRaw from "../../data/classic/cascades.json";
import agingRaw from "../../data/classic/aging.json";

export interface DM {
  stat: string;
  min: number;
  dm: number;
}

export interface RollTarget {
  target: number;
  dms: DM[];
}

export interface TableAccess {
  minEDU?: number;
  requiresCommission?: boolean;
}

export type SkillEntry =
  | { type: "skill"; name: string }
  | { type: "stat"; stat: string; delta: number }
  | { type: "cascade"; name: string };

export interface SkillTable {
  key: string;
  access: TableAccess | null;
  entries: SkillEntry[];
}

export interface CareerData {
  name: string;
  enlistment: RollTarget;
  survival: RollTarget;
  commission: RollTarget | null;
  promotion: RollTarget | null;
  reenlistment: { target: number };
  enlistmentBonus: SkillEntry | null;
  ranks: string[];
  musterBonusRolls: number[];
  skillTables: SkillTable[];
}

export type BenefitEntry =
  | { type: "passage"; class: "low" | "middle" | "high" }
  | { type: "stat"; stat: string; delta: number }
  | { type: "cascade"; name: string }
  | { type: "society"; name: "TAS" }
  | { type: "ship"; name: "scout" | "free_trader" }
  | { type: "none" };

export interface AgingCheck {
  stat: string;
  target: number;
  delta: number;
}

export interface AgingBracket {
  ageMin: number;
  ageMax: number | null;
  checks: AgingCheck[];
}

export const CAREER_NAMES = [
  "navy",
  "marines",
  "army",
  "scouts",
  "merchants",
  "other",
] as const;

// Draft table: 1D6 index → career name
export const DRAFT_TABLE: readonly string[] = [
  "navy",
  "marines",
  "army",
  "scouts",
  "merchants",
  "other",
];

const careersData = careersRaw as { careers: Record<string, CareerData> };
const musterData = musteringOutRaw as {
  cash: Record<string, number[]>;
  benefits: Record<string, BenefitEntry[]>;
  retirementPay: Record<string, number | string>;
};
const cascadeData = cascadesRaw as unknown as Record<string, string[]>;
const agingData = agingRaw as { brackets: AgingBracket[] };

export const careers: Record<string, CareerData> = careersData.careers;
export const musterCash: Record<string, number[]> = musterData.cash;
export const musterBenefits: Record<string, BenefitEntry[]> = musterData.benefits;
export const cascades: Record<string, string[]> = cascadeData;
export const agingBrackets: AgingBracket[] = agingData.brackets;

export const getCareer = (name: string): CareerData => {
  const data = careers[name];
  if (!data) throw new Error(`Unknown career: ${name}`);
  return data;
};

export const getRetirementPay = (terms: number, career: string): number | null => {
  if (career === "scouts" || career === "other") return null;
  if (terms < 5) return null;
  const val = musterData.retirementPay[String(terms)];
  if (typeof val === "number") return val;
  return 12000 + (terms - 9) * 2000;
};
