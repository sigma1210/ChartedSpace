import baseSalaries from "@/data/classic/crewSalaries.json";
import type { AvailableCrewMember } from "@/types";

// ─── Role → required skill mapping ───────────────────────────────────────────

export const ROLE_REQUIRED_SKILL: Record<string, string> = {
  pilot:     "Pilot",
  navigator: "Navigation",
  engineer:  "Engineering",
  steward:   "Steward",
  gunner:    "Gunnery",
  medic:     "Medical",
};

// ─── Salary calculation ───────────────────────────────────────────────────────
// Base salary per role (from crewSalaries.json) plus Cr1,000 per skill level.
// The per-level rate is stored per-role so individual values can be tuned later.

const SALARY_RATE_PER_LEVEL: Record<string, number> = {
  pilot:     1000,
  navigator: 1000,
  engineer:  1000,
  steward:   1000,
  gunner:    1000,
  medic:     1000,
};

export const calculateSalary = (role: string, skillLevel: number): number => {
  const base = (baseSalaries as Record<string, number>)[role] ?? 3000;
  const rate = SALARY_RATE_PER_LEVEL[role] ?? 1000;
  return base + skillLevel * rate;
};

// ─── Qualification check ──────────────────────────────────────────────────────
// Returns the crew member's level in the required skill, or -1 if unqualified.

export const skillLevelForRole = (
  member: Pick<AvailableCrewMember, "skills">,
  role: string,
): number => {
  const requiredSkill = ROLE_REQUIRED_SKILL[role];
  if (!requiredSkill) return -1;
  const skill = member.skills.find(s => s.name === requiredSkill);
  return skill?.level ?? -1;
};

export const qualifiesForRole = (
  member: Pick<AvailableCrewMember, "skills">,
  role: string,
): boolean => skillLevelForRole(member, role) >= 0;

// ─── UPP formatter ────────────────────────────────────────────────────────────

const toHex = (n: number) => Math.min(15, Math.max(0, n)).toString(16).toUpperCase();

export const formatUPP = (upp: AvailableCrewMember["upp"]): string =>
  `${toHex(upp.str)}${toHex(upp.dex)}${toHex(upp.end)}${toHex(upp.int)}${toHex(upp.edu)}${toHex(upp.soc)}`;
