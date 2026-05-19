export interface TradeSkills {
  broker:     number;
  streetwise: number;
  admin:      number;
  steward:    number;
}

// Stub — multiply base price per ton by this modifier.
// Returns 1 (no change). Define actual skill-based rules here when decided.
export const deriveSkillPriceModifier = (skills: TradeSkills): number => {
  void skills;
  return 1;
};

const KNOWN_TRADE_CODES = new Set([
  "Ag","As","Ba","De","Fl","Ga","Hi","Ht","Ic","In",
  "Lo","Lt","Na","Ni","Po","Ri","Va","Wa",
]);

const TRADE_CODE_COST_MODS: Record<string, number> = {
  Ag: -1000, As: -1000, Ba:  1000, De:  1000, Fl:  1000, Ga:     0,
  Hi: -1000, Ht:     0, Ic:     0, In: -1000, Lo:  1000, Lt:     0,
  Na:     0, Ni:  1000, Po: -1000, Ri:  1000, Va:  1000, Wa:     0,
};

const STARPORT_COST_MODS: Record<string, number> = {
  A: -1000, B: 0, C: 1000, D: 2000, E: 3000, X: 5000,
};

const BASE_PRICE = 4000;

export const filterTradeCodes = (remarks: string[]): string[] =>
  remarks.filter(r => KNOWN_TRADE_CODES.has(r));

// Port of deriveWorldCost from galaxy.selectors — usable server-side without Redux.
export const deriveWorldPricePerTon = (
  tradeCodes: string[],
  starport:   string,
  techLevel:  string,
): number => {
  const tradeCodeMod = tradeCodes.reduce((sum, c) => sum + (TRADE_CODE_COST_MODS[c] ?? 0), 0);
  const techMod      = parseInt(techLevel, 16) * 100;
  const starportMod  = STARPORT_COST_MODS[starport] ?? 0;
  return Math.max(100, BASE_PRICE + tradeCodeMod + techMod + starportMod);
};
