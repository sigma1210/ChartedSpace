import type {
  CareerName,
  CharacterSheet,
  DecisionMadeBy,
  DecisionPoint,
  DecisionProvider,
  DecisionRecord,
  DecisionStep,
  GenerationMode,
  GenerationOptions,
  UPP,
} from "./types";
import {
  CAREER_NAMES,
  DRAFT_TABLE,
  agingBrackets,
  cascades,
  getCareer,
  getRetirementPay,
  musterBenefits,
  musterCash,
  type BenefitEntry,
  type SkillEntry,
} from "./tables";

// ─── Dice ────────────────────────────────────────────────────────────────────

const roll1d6 = (): number => Math.floor(Math.random() * 6) + 1;
const roll2d6 = (): number => roll1d6() + roll1d6();
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// ─── UPP helpers ─────────────────────────────────────────────────────────────

const UPP_STAT_KEYS: Record<string, keyof UPP> = {
  STR: "str",
  DEX: "dex",
  END: "end",
  INT: "int",
  EDU: "edu",
  SOC: "soc",
};

const statKey = (stat: string): keyof UPP => {
  const k = UPP_STAT_KEYS[stat];
  if (!k) throw new Error(`Unknown stat: ${stat}`);
  return k;
};

const getStat = (upp: UPP, stat: string): number => upp[statKey(stat)];

const modStat = (upp: UPP, stat: string, delta: number) => {
  const k = statKey(stat);
  upp[k] = clamp(upp[k] + delta, 0, 15);
};

const uppToHex = (upp: UPP): string =>
  [upp.str, upp.dex, upp.end, upp.int, upp.edu, upp.soc]
    .map(v => Math.min(15, v).toString(16).toUpperCase())
    .join("");

// ─── DM calculation ──────────────────────────────────────────────────────────

const calcDMs = (
  dms: Array<{ stat: string; min: number; dm: number }>,
  upp: UPP
): number => dms.reduce((sum, d) => sum + (getStat(upp, d.stat) >= d.min ? d.dm : 0), 0);

// ─── Entry labels ─────────────────────────────────────────────────────────────

const entryLabel = (e: SkillEntry): string => {
  if (e.type === "skill") return e.name;
  if (e.type === "stat") return `${e.stat}${e.delta > 0 ? "+" : ""}${e.delta}`;
  return `cascade:${e.name}`;
};

const benefitLabel = (e: BenefitEntry): string => {
  if (e.type === "passage") return `${e.class} passage`;
  if (e.type === "stat") return `${e.stat}${e.delta > 0 ? "+" : ""}${e.delta}`;
  if (e.type === "cascade") return `cascade:${e.name}`;
  if (e.type === "society") return e.name;
  if (e.type === "ship") return e.name;
  return "none";
};

// ─── Character draft (mutable working state) ─────────────────────────────────

interface CharacterDraft {
  name: string;
  upp: UPP;
  skillMap: Map<string, number>;
  career: CareerName;
  terms: number;
  rank: number;
  commissioned: boolean;
  credits: number;
  passages: { low: number; middle: number; high: number };
  ships: Array<"scout" | "free_trader">;
  societies: Array<"TAS">;
  weaponBenefits: string[];
  cashRollsUsed: number;
  decisions: DecisionRecord[];
  age: number;
}

const rec = (
  step: DecisionStep,
  term: number | null,
  options: string[],
  chosen: string,
  roll: number | null,
  madeBy: DecisionMadeBy
): DecisionRecord => ({ step, term, options, chosen, roll, madeBy });

// ─── Skill application ────────────────────────────────────────────────────────

const addSkill = (draft: CharacterDraft, name: string) => {
  draft.skillMap.set(name, (draft.skillMap.get(name) ?? 0) + 1);
};

const applySkillEntry = (entry: SkillEntry, draft: CharacterDraft, term: number | null) => {
  if (entry.type === "skill") {
    addSkill(draft, entry.name);
  } else if (entry.type === "stat") {
    modStat(draft.upp, entry.stat, entry.delta);
  } else if (entry.type === "cascade") {
    const table = cascades[entry.name];
    if (!table) throw new Error(`Unknown cascade: ${entry.name}`);
    const r = roll1d6();
    const result = table[Math.min(r - 1, table.length - 1)];
    addSkill(draft, result);
    draft.decisions.push(rec("cascade_roll", term, table, result, r, "random"));
  }
};

const applyBenefitEntry = (entry: BenefitEntry, draft: CharacterDraft) => {
  if (entry.type === "passage") {
    draft.passages[entry.class]++;
  } else if (entry.type === "stat") {
    modStat(draft.upp, entry.stat, entry.delta);
  } else if (entry.type === "cascade") {
    const table = cascades[entry.name];
    if (!table) return;
    const r = roll1d6();
    const result = table[Math.min(r - 1, table.length - 1)];
    draft.weaponBenefits.push(result);
    draft.decisions.push(rec("cascade_roll", null, table, result, r, "random"));
  } else if (entry.type === "society") {
    if (!draft.societies.includes(entry.name)) draft.societies.push(entry.name);
  } else if (entry.type === "ship") {
    draft.ships.push(entry.name);
  }
  // "none" → no effect
};

// ─── Error ────────────────────────────────────────────────────────────────────

export class CharacterDeathError extends Error {
  constructor(
    public readonly cause: "survival" | "aging",
    public readonly career: CareerName,
    public readonly term: number
  ) {
    super(`Character died during ${cause} check in term ${term} of ${career}`);
  }
}

// ─── Main engine ──────────────────────────────────────────────────────────────

export const generateCharacter = async (
  name: string,
  provider: DecisionProvider,
  options: GenerationOptions = {}
): Promise<CharacterSheet> => {
  const mode: GenerationMode = options.mode ?? "random";
  const provMadeBy: DecisionMadeBy =
    mode === "directed" ? "directed" : mode === "guided" ? "human" : "random";

  // Phase 1: Characteristics
  const upp: UPP = {
    str: clamp(roll2d6(), 1, 15),
    dex: clamp(roll2d6(), 1, 15),
    end: clamp(roll2d6(), 1, 15),
    int: clamp(roll2d6(), 1, 15),
    edu: clamp(roll2d6(), 1, 15),
    soc: clamp(roll2d6(), 1, 15),
  };

  const draft: CharacterDraft = {
    name,
    upp,
    skillMap: new Map(),
    career: "other",
    terms: 0,
    rank: 0,
    commissioned: false,
    credits: 0,
    passages: { low: 0, middle: 0, high: 0 },
    ships: [],
    societies: [],
    weaponBenefits: [],
    cashRollsUsed: 0,
    decisions: [],
    age: 18,
  };

  draft.decisions.push(rec("characteristics", null, [], uppToHex(upp), null, "random"));

  // Phase 2: Career selection
  const careerOpts = CAREER_NAMES.map(c => ({ id: c, label: c }));
  const chosenCareer = await provider.decide({
    step: "career_selection",
    term: null,
    options: careerOpts,
  });
  draft.decisions.push(
    rec("career_selection", null, [...CAREER_NAMES], chosenCareer, null, provMadeBy)
  );

  // Phase 3: Enlistment
  const chosenCareerData = getCareer(chosenCareer);
  const enlistRoll = roll2d6();
  const enlistTotal = enlistRoll + calcDMs(chosenCareerData.enlistment.dms, upp);
  const enlisted = enlistTotal >= chosenCareerData.enlistment.target;

  draft.decisions.push(
    rec("enlistment_roll", null, ["success", "fail"], enlisted ? "success" : "fail", enlistRoll, "random")
  );

  if (enlisted) {
    draft.career = chosenCareer as CareerName;
  } else {
    const draftRoll = roll1d6();
    draft.career = DRAFT_TABLE[draftRoll - 1] as CareerName;
  }

  const career = getCareer(draft.career);

  // Phase 4: Enlistment bonus (automatic grant, not a rolled decision)
  if (career.enlistmentBonus) {
    applySkillEntry(career.enlistmentBonus, draft, null);
  }

  // Phase 5: Career terms
  let continuing = true;
  while (continuing) {
    draft.terms++;
    draft.age += 4;

    // Survival
    const survRoll = roll2d6();
    const survived = survRoll + calcDMs(career.survival.dms, draft.upp) >= career.survival.target;
    draft.decisions.push(
      rec("survival_roll", draft.terms, ["success", "fail"], survived ? "success" : "fail", survRoll, "random")
    );
    if (!survived) throw new CharacterDeathError("survival", draft.career, draft.terms);

    let skillRolls = 1;

    // Commission (one attempt per career; scouts/other have no commission)
    if (!draft.commissioned && career.commission) {
      const commRoll = roll2d6();
      const commissioned = commRoll + calcDMs(career.commission.dms, draft.upp) >= career.commission.target;
      draft.decisions.push(
        rec("commission_roll", draft.terms, ["success", "fail"], commissioned ? "success" : "fail", commRoll, "random")
      );
      if (commissioned) {
        draft.commissioned = true;
        draft.rank = 1;
        skillRolls++;
      }
    }

    // Promotion (commissioned officers only; max rank 6)
    if (draft.commissioned && career.promotion && draft.rank < 6) {
      const promRoll = roll2d6();
      const promoted = promRoll + calcDMs(career.promotion.dms, draft.upp) >= career.promotion.target;
      draft.decisions.push(
        rec("promotion_roll", draft.terms, ["success", "fail"], promoted ? "success" : "fail", promRoll, "random")
      );
      if (promoted) {
        draft.rank++;
        skillRolls++;
      }
    }

    // Skill rolls
    const availTables = career.skillTables.filter(t => {
      if (!t.access) return true;
      if (t.access.minEDU !== undefined && draft.upp.edu < t.access.minEDU) return false;
      if (t.access.requiresCommission && !draft.commissioned) return false;
      return true;
    });

    for (let i = 0; i < skillRolls; i++) {
      const tableKey = await provider.decide({
        step: "skill_table_choice",
        term: draft.terms,
        options: availTables.map(t => ({ id: t.key, label: t.key })),
      });
      draft.decisions.push(
        rec("skill_table_choice", draft.terms, availTables.map(t => t.key), tableKey, null, provMadeBy)
      );

      const table = availTables.find(t => t.key === tableKey) ?? availTables[0];
      const skillRollVal = roll1d6();
      const entry = table.entries[Math.min(skillRollVal - 1, table.entries.length - 1)];
      draft.decisions.push(
        rec("skill_roll", draft.terms, table.entries.map(entryLabel), entryLabel(entry), skillRollVal, "random")
      );
      applySkillEntry(entry, draft, draft.terms);
    }

    // Aging (starts after age 34, i.e. after completing 4 terms)
    if (draft.age >= 34) {
      const medBonus = draft.skillMap.get("Medical") ?? 0;
      const bracket = agingBrackets.find(
        b => draft.age >= b.ageMin && (b.ageMax === null || draft.age <= b.ageMax)
      );
      if (bracket) {
        for (const check of bracket.checks) {
          const r = roll2d6();
          const failed = r + medBonus < check.target;
          const outcome = failed ? `${check.stat}${check.delta}` : "pass";
          draft.decisions.push(rec("aging_roll", draft.terms, ["pass", "fail"], outcome, r, "random"));
          if (failed) {
            modStat(draft.upp, check.stat, check.delta);
            if (draft.upp[statKey(check.stat)] <= 0) {
              throw new CharacterDeathError("aging", draft.career, draft.terms);
            }
          }
        }
      }
    }

    // Reenlistment
    if (draft.terms >= 7) {
      continuing = false;
      break;
    }

    const reenlRoll = roll2d6();
    if (reenlRoll === 12) {
      // Mandatory reenlistment — character has no choice
      draft.decisions.push(
        rec("reenlistment_decision", draft.terms, ["reenlist", "muster_out"], "reenlist", reenlRoll, "random")
      );
    } else if (reenlRoll < career.reenlistment.target) {
      // Must muster out
      draft.decisions.push(
        rec("reenlistment_decision", draft.terms, ["reenlist", "muster_out"], "muster_out", reenlRoll, "random")
      );
      continuing = false;
    } else {
      // Eligible — provider decides
      const choice = await provider.decide({
        step: "reenlistment_decision",
        term: draft.terms,
        options: [
          { id: "reenlist", label: "Re-enlist" },
          { id: "muster_out", label: "Muster Out" },
        ],
        roll: reenlRoll,
      });
      draft.decisions.push(
        rec("reenlistment_decision", draft.terms, ["reenlist", "muster_out"], choice, reenlRoll, provMadeBy)
      );
      if (choice === "muster_out") continuing = false;
    }
  }

  // Phase 6: Mustering out
  const bonusRolls = career.musterBonusRolls[draft.rank] ?? 0;
  const totalMusterRolls = draft.terms + bonusRolls;
  const gamblingBonus = draft.skillMap.has("Gambling") ? 1 : 0;
  const highRankBonus = draft.rank >= 5 ? 1 : 0;
  const cashTable = musterCash[draft.career] ?? [];
  const benefitsTable = musterBenefits[draft.career] ?? [];

  for (let i = 0; i < totalMusterRolls; i++) {
    const canUseCash = draft.cashRollsUsed < 3;
    const rollTypeOpts = [
      ...(canUseCash ? [{ id: "cash", label: "Cash" }] : []),
      { id: "benefits", label: "Benefits" },
    ];
    const rollType = await provider.decide({
      step: "muster_roll_type",
      term: null,
      options: rollTypeOpts,
    });
    draft.decisions.push(
      rec("muster_roll_type", null, rollTypeOpts.map(o => o.id), rollType, null, provMadeBy)
    );

    const musterRoll = roll1d6();

    if (rollType === "cash" && canUseCash && cashTable.length > 0) {
      const idx = clamp(musterRoll - 1 + gamblingBonus, 0, cashTable.length - 1);
      const amount = cashTable[idx];
      draft.credits += amount;
      draft.decisions.push(
        rec("muster_roll", null, cashTable.map(String), String(amount), musterRoll, "random")
      );
      draft.cashRollsUsed++;
    } else if (benefitsTable.length > 0) {
      const idx = clamp(musterRoll - 1 + highRankBonus, 0, benefitsTable.length - 1);
      const benefit = benefitsTable[idx];
      draft.decisions.push(
        rec("muster_roll", null, benefitsTable.map(benefitLabel), benefitLabel(benefit), musterRoll, "random")
      );
      applyBenefitEntry(benefit, draft);
    }
  }

  // Phase 7: Finalize
  return {
    name: draft.name,
    age: draft.age,
    upp: draft.upp,
    skills: Array.from(draft.skillMap.entries()).map(([n, level]) => ({ name: n, level })),
    careers: [
      {
        career: draft.career,
        terms: draft.terms,
        rank: draft.rank,
        commissioned: draft.commissioned,
      },
    ],
    credits: draft.credits,
    benefits: {
      passages: draft.passages,
      ships: draft.ships,
      societies: draft.societies,
      weapons: draft.weaponBenefits,
      retirementPay: getRetirementPay(draft.terms, draft.career),
    },
    homeWorldId: options.homeWorldId ?? null,
    currentWorldId: options.currentWorldId ?? null,
    generation: {
      ruleset: "classic",
      mode,
      targetRole: options.targetRole ?? null,
      decisions: draft.decisions,
    },
  };
};
