// ─── Skill price modifier (stub) ─────────────────────────────────────────────
// Returns an additive credit modifier to apply to a sale price.
// Currently returns 0. Future: broker skill + 2D6 roll → ± modifier.

export interface TradeSkills {
  broker:     number;
  streetwise: number;
  admin:      number;
  steward:    number;
}

export const deriveSkillPriceModifier = (skills: TradeSkills): number => {
  void skills;
  return 0;
};

// ─── UWP field shape (matches both World.uwp client type and Prisma fields) ──

export interface TradeUWP {
  size:          string;
  atmosphere:    string;
  hydrographics: string;
  population:    string;
  government:    string;
  lawLevel:      string;
  techLevel:     string;
}

// ─── Trade code derivation (canonical — used by selectors AND server routes) ─

const hx = (s: string) => parseInt(s, 16);

export const deriveTradeClassifications = (uwp: TradeUWP): string[] => {
  const s = hx(uwp.size);
  const a = hx(uwp.atmosphere);
  const h = hx(uwp.hydrographics);
  const p = hx(uwp.population);
  const g = hx(uwp.government);
  const l = hx(uwp.lawLevel);
  const t = hx(uwp.techLevel);

  const codes: string[] = [];
  if (a >= 4 && a <= 9 && h >= 4 && h <= 8 && p >= 5 && p <= 7) codes.push("Ag");
  if (s === 0 && a === 0 && h === 0)                               codes.push("As");
  if (p === 0 && g === 0 && l === 0)                               codes.push("Ba");
  if (a >= 2 && h === 0)                                           codes.push("De");
  if (a >= 10 && h >= 1)                                           codes.push("Fl");
  if (s >= 6 && s <= 8 && [5, 6, 8].includes(a) && h >= 4 && h <= 8) codes.push("Ga");
  if (p >= 9)                                                      codes.push("Hi");
  if (t >= 12)                                                     codes.push("Ht");
  if (a <= 1 && h >= 1)                                            codes.push("Ic");
  if ([0, 1, 2, 4, 7, 9].includes(a) && p >= 9)                   codes.push("In");
  if (p >= 1 && p <= 3)                                            codes.push("Lo");
  if (t <= 5 && p >= 1)                                            codes.push("Lt");
  if (a <= 3 && h <= 3 && p >= 6)                                  codes.push("Na");
  if (p >= 4 && p <= 6)                                            codes.push("Ni");
  if (a >= 2 && a <= 5 && h <= 3)                                  codes.push("Po");
  if (g >= 4 && g <= 9 && [6, 8].includes(a) && p >= 6 && p <= 8) codes.push("Ri");
  if (a === 0)                                                      codes.push("Va");
  if (h === 10)                                                     codes.push("Wa");
  return codes;
};

// ─── Market demand table ──────────────────────────────────────────────────────

export const MARKET_DEMAND_TABLE: Record<string, Record<string, number>> = {
  Ag: { Ag:1, As:1, Ba:0, De:1, Fl:0, Ga:0, Hi:1, Ht:0, Ic:0, In:1, Lo:1, Lt:0, Na:1, Ni:0, Po:0, Ri:1, Va:0, Wa:0 },
  As: { Ag:0, As:1, Ba:0, De:0, Fl:0, Ga:0, Hi:0, Ht:0, Ic:0, In:1, Lo:0, Lt:0, Na:1, Ni:0, Po:0, Ri:1, Va:1, Wa:0 },
  Ba: { Ag:1, As:0, Ba:0, De:0, Fl:0, Ga:0, Hi:0, Ht:0, Ic:0, In:1, Lo:0, Lt:0, Na:0, Ni:0, Po:0, Ri:0, Va:0, Wa:0 },
  De: { Ag:0, As:0, Ba:0, De:1, Fl:0, Ga:0, Hi:0, Ht:0, Ic:0, In:1, Lo:0, Lt:0, Na:1, Ni:0, Po:0, Ri:0, Va:0, Wa:0 },
  Fl: { Ag:0, As:0, Ba:0, De:0, Fl:1, Ga:0, Hi:0, Ht:0, Ic:0, In:1, Lo:0, Lt:0, Na:0, Ni:0, Po:0, Ri:0, Va:0, Wa:0 },
  Ga: { Ag:0, As:0, Ba:0, De:0, Fl:1, Ga:0, Hi:0, Ht:0, Ic:0, In:0, Lo:0, Lt:0, Na:0, Ni:0, Po:0, Ri:0, Va:0, Wa:0 },
  Hi: { Ag:0, As:0, Ba:0, De:0, Fl:0, Ga:0, Hi:1, Ht:0, Ic:0, In:0, Lo:1, Lt:0, Na:0, Ni:0, Po:0, Ri:1, Va:0, Wa:0 },
  Ht: { Ag:0, As:0, Ba:0, De:0, Fl:0, Ga:0, Hi:0, Ht:0, Ic:0, In:0, Lo:0, Lt:0, Na:0, Ni:0, Po:0, Ri:0, Va:0, Wa:0 },
  Ic: { Ag:0, As:0, Ba:0, De:0, Fl:0, Ga:0, Hi:1, Ht:0, Ic:0, In:1, Lo:0, Lt:0, Na:0, Ni:0, Po:0, Ri:0, Va:0, Wa:0 },
  In: { Ag:1, As:1, Ba:0, De:1, Fl:1, Ga:1, Hi:1, Ht:1, Ic:0, In:1, Lo:0, Lt:1, Na:0, Ni:1, Po:1, Ri:1, Va:1, Wa:1 },
  Lo: { Ag:0, As:0, Ba:0, De:0, Fl:0, Ga:0, Hi:1, Ht:0, Ic:0, In:0, Lo:1, Lt:0, Na:0, Ni:0, Po:0, Ri:0, Va:0, Wa:0 },
  Lt: { Ag:0, As:0, Ba:0, De:0, Fl:0, Ga:0, Hi:0, Ht:1, Ic:0, In:0, Lo:0, Lt:0, Na:0, Ni:0, Po:0, Ri:0, Va:0, Wa:0 },
  Na: { Ag:0, As:1, Ba:0, De:1, Fl:0, Ga:0, Hi:0, Ht:0, Ic:0, In:0, Lo:0, Lt:0, Na:0, Ni:0, Po:0, Ri:0, Va:1, Wa:0 },
  Ni: { Ag:0, As:0, Ba:0, De:0, Fl:0, Ga:0, Hi:0, Ht:0, Ic:0, In:1, Lo:0, Lt:0, Na:0, Ni:-1, Po:0, Ri:0, Va:0, Wa:0 },
  Po: { Ag:0, As:0, Ba:0, De:0, Fl:0, Ga:0, Hi:0, Ht:0, Ic:0, In:0, Lo:0, Lt:0, Na:0, Ni:0, Po:-1, Ri:0, Va:0, Wa:0 },
  Ri: { Ag:1, As:0, Ba:0, De:1, Fl:0, Ga:0, Hi:1, Ht:0, Ic:0, In:1, Lo:0, Lt:0, Na:1, Ni:0, Po:0, Ri:1, Va:0, Wa:0 },
  Va: { Ag:0, As:1, Ba:0, De:0, Fl:0, Ga:0, Hi:0, Ht:0, Ic:0, In:1, Lo:0, Lt:0, Na:0, Ni:0, Po:0, Ri:0, Va:1, Wa:0 },
  Wa: { Ag:0, As:0, Ba:0, De:0, Fl:0, Ga:0, Hi:0, Ht:0, Ic:0, In:1, Lo:0, Lt:0, Na:0, Ni:0, Po:0, Ri:1, Va:0, Wa:1 },
};

// ─── Sale price calculation ───────────────────────────────────────────────────
// modifier: additive credit adjustment reserved for future dice roll integration
// (e.g. broker skill DM + 2D6 result → pass result of deriveSkillPriceModifier here).
// Pass 0 or omit for deterministic pricing.

export const calculateSalePrice = (
  originCodes: string[],
  originTL:    number,
  destCodes:   string[],
  destTL:      number,
  modifier     = 0,
): number => {
  const demandSum = originCodes.reduce(
    (sum, sc) =>
      sum + destCodes.reduce((inner, tc) => inner + (MARKET_DEMAND_TABLE[sc]?.[tc] ?? 0), 0),
    0,
  );
  const techDelta = (originTL - destTL) * 0.1;
  return Math.max(0, (demandSum * 1000 + 5000) * (1 + techDelta) + modifier);
};

// ─── Purchase price helpers (used by cargo buy API) ──────────────────────────

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
