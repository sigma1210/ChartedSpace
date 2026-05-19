import type { RootState } from "../index";
import type { World, WorldCoord, MapMode, WorldDotStyle } from "../../types";

const hx = (s: string) => parseInt(s, 16);

export const deriveTradeClassifications = (world: World): string[] => {
  const {
    size,
    atmosphere,
    hydrographics,
    population,
    government,
    lawLevel,
    techLevel,
  } = world.uwp;
  const s = hx(size);
  const a = hx(atmosphere);
  const h = hx(hydrographics);
  const p = hx(population);
  const g = hx(government);
  const l = hx(lawLevel);
  const t = hx(techLevel);

  const codes: string[] = [];

  if (a >= 4 && a <= 9 && h >= 4 && h <= 8 && p >= 5 && p <= 7)
    codes.push("Ag");
  if (s === 0 && a === 0 && h === 0) codes.push("As");
  if (p === 0 && g === 0 && l === 0) codes.push("Ba");
  if (a >= 2 && h === 0) codes.push("De");
  if (a >= 10 && h >= 1) codes.push("Fl");
  if (s >= 6 && s <= 8 && [5, 6, 8].includes(a) && h >= 4 && h <= 8)
    codes.push("Ga");
  if (p >= 9) codes.push("Hi");
  if (t >= 12) codes.push("Ht");
  if (a <= 1 && h >= 1) codes.push("Ic");
  if ([0, 1, 2, 4, 7, 9].includes(a) && p >= 9) codes.push("In");
  if (p >= 1 && p <= 3) codes.push("Lo");
  if (t <= 5 && p >= 1) codes.push("Lt");
  if (a <= 3 && h <= 3 && p >= 6) codes.push("Na");
  if (p >= 4 && p <= 6) codes.push("Ni");
  if (a >= 2 && a <= 5 && h <= 3) codes.push("Po");
  if (g >= 4 && g <= 9 && [6, 8].includes(a) && p >= 6 && p <= 8)
    codes.push("Ri");
  if (a === 0) codes.push("Va");
  if (h === 10) codes.push("Wa");

  return codes;
};

export const selectAllSectors = (state: RootState) => state.galaxy.sectors;
export const selectSectorData = (abbr: string) => (state: RootState) =>
  state.galaxy.sectorData[abbr];
export const selectSectorLoadStatus = (abbr: string) => (state: RootState) =>
  state.galaxy.loadingStatus[abbr] ?? "idle";
export const selectIsSectorLoaded = (abbr: string) => (state: RootState) =>
  state.galaxy.loadingStatus[abbr] === "loaded";

export const selectActiveSectorAbbr = (state: RootState) =>
  state.galaxy.activeSectorAbbr;
export const selectActiveSubsectorKey = (state: RootState) =>
  state.galaxy.activeSubsectorKey;
export const selectActiveWorldHex = (state: RootState) =>
  state.galaxy.activeWorldHex;
export const selectActiveWorldSectorAbbr = (state: RootState) =>
  state.galaxy.activeWorldSectorAbbr;

export const selectActiveWorld = (state: RootState) => {
  const abbr = state.galaxy.activeWorldSectorAbbr;
  const hex = state.galaxy.activeWorldHex;
  if (!abbr || !hex) return null;
  return (
    state.galaxy.sectorData[abbr]?.worlds.find((w) => w.hex === hex) ?? null
  );
};

export const selectActiveWorldName = (state: RootState) =>
  selectActiveWorld(state)?.name ?? null;

export const selectActiveWorldTradeCodes = (state: RootState): string[] => {
  const world = selectActiveWorld(state);
  return world ? deriveTradeClassifications(world) : [];
};

export const TRADE_CODE_LABELS: Record<string, string> = {
  Ag: "Agricultural",
  As: "Asteroid",
  Ba: "Barren",
  De: "Desert",
  Fl: "Fluid Oceans",
  Ga: "Garden",
  Hi: "High Population",
  Ht: "High Technology",
  Ic: "Ice-Capped",
  In: "Industrial",
  Lo: "Low Population",
  Lt: "Low Technology",
  Na: "Non-Agricultural",
  Ni: "Non-Industrial",
  Po: "Poor",
  Ri: "Rich",
  Va: "Vacuum",
  Wa: "Water World",
};

export const TRADE_CODE_COST_MODS: Record<string, number> = {
  Ag: -1000,
  As: -1000,
  Ba: 1000,
  De: 1000,
  Fl: 1000,
  Ga: 0,
  Hi: -1000,
  Ht: 0,
  Ic: 0,
  In: -1000,
  Lo: 1000,
  Lt: 0,
  Na: 0,
  Ni: 1000,
  Po: -1000,
  Ri: 1000,
  Va: 1000,
  Wa: 0,
};

export const STARPORT_COST_MODS: Record<string, number> = {
  A: -1000,
  B: 0,
  C: 1000,
  D: 2000,
  E: 3000,
  X: 5000,
};

export const MARKET_DEMAND_TABLE: Record<string, Record<string, number>> = {
  Ag: {
    Ag: 1,
    As: 1,
    Ba: 0,
    De: 1,
    Fl: 0,
    Ga: 0,
    Hi: 1,
    Ht: 0,
    Ic: 0,
    In: 1,
    Lo: 1,
    Lt: 0,
    Na: 1,
    Ni: 0,
    Po: 0,
    Ri: 1,
    Va: 0,
    Wa: 0,
  },
  As: {
    Ag: 0,
    As: 1,
    Ba: 0,
    De: 0,
    Fl: 0,
    Ga: 0,
    Hi: 0,
    Ht: 0,
    Ic: 0,
    In: 1,
    Lo: 0,
    Lt: 0,
    Na: 1,
    Ni: 0,
    Po: 0,
    Ri: 1,
    Va: 1,
    Wa: 0,
  },
  Ba: {
    Ag: 1,
    As: 0,
    Ba: 0,
    De: 0,
    Fl: 0,
    Ga: 0,
    Hi: 0,
    Ht: 0,
    Ic: 0,
    In: 1,
    Lo: 0,
    Lt: 0,
    Na: 0,
    Ni: 0,
    Po: 0,
    Ri: 0,
    Va: 0,
    Wa: 0,
  },
  De: {
    Ag: 0,
    As: 0,
    Ba: 0,
    De: 1,
    Fl: 0,
    Ga: 0,
    Hi: 0,
    Ht: 0,
    Ic: 0,
    In: 1,
    Lo: 0,
    Lt: 0,
    Na: 1,
    Ni: 0,
    Po: 0,
    Ri: 0,
    Va: 0,
    Wa: 0,
  },
  Fl: {
    Ag: 0,
    As: 0,
    Ba: 0,
    De: 0,
    Fl: 1,
    Ga: 0,
    Hi: 0,
    Ht: 0,
    Ic: 0,
    In: 1,
    Lo: 0,
    Lt: 0,
    Na: 0,
    Ni: 0,
    Po: 0,
    Ri: 0,
    Va: 0,
    Wa: 0,
  },
  Ga: {
    Ag: 0,
    As: 0,
    Ba: 0,
    De: 0,
    Fl: 1,
    Ga: 0,
    Hi: 0,
    Ht: 0,
    Ic: 0,
    In: 0,
    Lo: 0,
    Lt: 0,
    Na: 0,
    Ni: 0,
    Po: 0,
    Ri: 0,
    Va: 0,
    Wa: 0,
  },
  Hi: {
    Ag: 0,
    As: 0,
    Ba: 0,
    De: 0,
    Fl: 0,
    Ga: 0,
    Hi: 1,
    Ht: 0,
    Ic: 0,
    In: 0,
    Lo: 1,
    Lt: 0,
    Na: 0,
    Ni: 0,
    Po: 0,
    Ri: 1,
    Va: 0,
    Wa: 0,
  },
  Ht: {
    Ag: 0,
    As: 0,
    Ba: 0,
    De: 0,
    Fl: 0,
    Ga: 0,
    Hi: 0,
    Ht: 0,
    Ic: 0,
    In: 0,
    Lo: 0,
    Lt: 0,
    Na: 0,
    Ni: 0,
    Po: 0,
    Ri: 0,
    Va: 0,
    Wa: 0,
  },
  Ic: {
    Ag: 0,
    As: 0,
    Ba: 0,
    De: 0,
    Fl: 0,
    Ga: 0,
    Hi: 1,
    Ht: 0,
    Ic: 0,
    In: 1,
    Lo: 0,
    Lt: 0,
    Na: 0,
    Ni: 0,
    Po: 0,
    Ri: 0,
    Va: 0,
    Wa: 0,
  },
  In: {
    Ag: 1,
    As: 1,
    Ba: 0,
    De: 1,
    Fl: 1,
    Ga: 1,
    Hi: 1,
    Ht: 1,
    Ic: 0,
    In: 1,
    Lo: 0,
    Lt: 1,
    Na: 0,
    Ni: 1,
    Po: 1,
    Ri: 1,
    Va: 1,
    Wa: 1,
  },
  Lo: {
    Ag: 0,
    As: 0,
    Ba: 0,
    De: 0,
    Fl: 0,
    Ga: 0,
    Hi: 1,
    Ht: 0,
    Ic: 0,
    In: 0,
    Lo: 1,
    Lt: 0,
    Na: 0,
    Ni: 0,
    Po: 0,
    Ri: 0,
    Va: 0,
    Wa: 0,
  },
  Lt: {
    Ag: 0,
    As: 0,
    Ba: 0,
    De: 0,
    Fl: 0,
    Ga: 0,
    Hi: 0,
    Ht: 1,
    Ic: 0,
    In: 0,
    Lo: 0,
    Lt: 0,
    Na: 0,
    Ni: 0,
    Po: 0,
    Ri: 0,
    Va: 0,
    Wa: 0,
  },
  Na: {
    Ag: 0,
    As: 1,
    Ba: 0,
    De: 1,
    Fl: 0,
    Ga: 0,
    Hi: 0,
    Ht: 0,
    Ic: 0,
    In: 0,
    Lo: 0,
    Lt: 0,
    Na: 0,
    Ni: 0,
    Po: 0,
    Ri: 0,
    Va: 1,
    Wa: 0,
  },
  Ni: {
    Ag: 0,
    As: 0,
    Ba: 0,
    De: 0,
    Fl: 0,
    Ga: 0,
    Hi: 0,
    Ht: 0,
    Ic: 0,
    In: 1,
    Lo: 0,
    Lt: 0,
    Na: 0,
    Ni: -1,
    Po: 0,
    Ri: 0,
    Va: 0,
    Wa: 0,
  },
  Po: {
    Ag: 0,
    As: 0,
    Ba: 0,
    De: 0,
    Fl: 0,
    Ga: 0,
    Hi: 0,
    Ht: 0,
    Ic: 0,
    In: 0,
    Lo: 0,
    Lt: 0,
    Na: 0,
    Ni: 0,
    Po: -1,
    Ri: 0,
    Va: 0,
    Wa: 0,
  },
  Ri: {
    Ag: 1,
    As: 0,
    Ba: 0,
    De: 1,
    Fl: 0,
    Ga: 0,
    Hi: 1,
    Ht: 0,
    Ic: 0,
    In: 1,
    Lo: 0,
    Lt: 0,
    Na: 1,
    Ni: 0,
    Po: 0,
    Ri: 1,
    Va: 0,
    Wa: 0,
  },
  Va: {
    Ag: 0,
    As: 1,
    Ba: 0,
    De: 0,
    Fl: 0,
    Ga: 0,
    Hi: 0,
    Ht: 0,
    Ic: 0,
    In: 1,
    Lo: 0,
    Lt: 0,
    Na: 0,
    Ni: 0,
    Po: 0,
    Ri: 0,
    Va: 1,
    Wa: 0,
  },
  Wa: {
    Ag: 0,
    As: 0,
    Ba: 0,
    De: 0,
    Fl: 0,
    Ga: 0,
    Hi: 0,
    Ht: 0,
    Ic: 0,
    In: 1,
    Lo: 0,
    Lt: 0,
    Na: 0,
    Ni: 0,
    Po: 0,
    Ri: 1,
    Va: 0,
    Wa: 1,
  },
};

export const selectActiveWorldTradeLabels = (state: RootState): string[] =>
  selectActiveWorldTradeCodes(state).map(
    (code) => TRADE_CODE_LABELS[code] ?? code,
  );

const BASE_PRICE = 4000;

export const deriveWorldCost = (world: World): number => {
  const codes = deriveTradeClassifications(world);

  const tradeCodeMod = codes.reduce(
    (sum, code) => sum + (TRADE_CODE_COST_MODS[code] ?? 0),
    0,
  );

  const techMod = hx(world.uwp.techLevel) * 100;

  const starportMod = STARPORT_COST_MODS[world.uwp.starport] ?? 0;

  return BASE_PRICE + tradeCodeMod + techMod + starportMod;
};

export const selectActiveWorldCost = (state: RootState): number | null => {
  const world = selectActiveWorld(state);
  return world ? deriveWorldCost(world) : null;
};

export const selectTargetWorldHex = (state: RootState) =>
  state.galaxy.targetWorldHex;
export const selectTargetWorldSectorAbbr = (state: RootState) =>
  state.galaxy.targetWorldSectorAbbr;

export const selectTargetWorld = (state: RootState) => {
  const abbr = state.galaxy.targetWorldSectorAbbr;
  const hex = state.galaxy.targetWorldHex;
  if (!abbr || !hex) return null;
  return (
    state.galaxy.sectorData[abbr]?.worlds.find((w) => w.hex === hex) ?? null
  );
};

export const selectTargetWorldName = (state: RootState) =>
  selectTargetWorld(state)?.name ?? null;

export const selectTargetWorldTradeCodes = (state: RootState): string[] => {
  const world = selectTargetWorld(state);
  return world ? deriveTradeClassifications(world) : [];
};

export const selectTargetWorldTradeLabels = (state: RootState): string[] =>
  selectTargetWorldTradeCodes(state).map(
    (code) => TRADE_CODE_LABELS[code] ?? code,
  );

export const selectTargetWorldCost = (state: RootState): number | null => {
  const world = selectTargetWorld(state);
  return world ? deriveWorldCost(world) : null;
};

export const deriveExpectedSalePrice = (
  sourceWorld: World,
  targetWorld: World,
): number => {
  const sourceCodes = deriveTradeClassifications(sourceWorld);
  const targetCodes = deriveTradeClassifications(targetWorld);
  const demandSum = sourceCodes.reduce(
    (sum, sc) =>
      sum +
      targetCodes.reduce((inner, tc) => inner + (MARKET_DEMAND_TABLE[sc]?.[tc] ?? 0), 0),
    0,
  );

  const sourceTL = hx(sourceWorld.uwp.techLevel);
  const targetTL = hx(targetWorld.uwp.techLevel);
  const techDelta = (sourceTL - targetTL) * 0.1;
  return Math.max(0, (demandSum * 1000 + 5000) * (1 + techDelta));
};

export const selectExpectedSalePrice = (state: RootState): number | null => {
  const sourceWorld = selectActiveWorld(state);
  const targetWorld = selectTargetWorld(state);
  if (!sourceWorld || !targetWorld) return null;
  if (
    state.galaxy.activeWorldHex === state.galaxy.targetWorldHex &&
    state.galaxy.activeWorldSectorAbbr === state.galaxy.targetWorldSectorAbbr
  )
    return 0;
  return deriveExpectedSalePrice(sourceWorld, targetWorld);
};

const SUBSECTOR_KEYS = "ABCDEFGHIJKLMNOP";

const worldSubsectorKey = (hexX: number, hexY: number): string => {
  const subCol = Math.floor((hexX - 1) / 8);
  const subRow = Math.floor((hexY - 1) / 10);
  return SUBSECTOR_KEYS[subRow * 4 + subCol] ?? "A";
};

export interface WorldLocation {
  sectorAbbr: string;
  sectorName: string;
  subsectorKey: string;
  subsectorName: string;
}

export const selectActiveWorldLocation = (
  state: RootState,
): WorldLocation | null => {
  const world = selectActiveWorld(state);
  const abbr = state.galaxy.activeWorldSectorAbbr;
  if (!world || !abbr) return null;
  const sectorData = state.galaxy.sectorData[abbr];
  if (!sectorData) return null;
  const subsectorKey = worldSubsectorKey(world.hexX, world.hexY);
  return {
    sectorAbbr: abbr,
    sectorName: sectorData.sector,
    subsectorKey,
    subsectorName: sectorData.subsectors[subsectorKey] ?? subsectorKey,
  };
};

export const selectWorldDotStyle = (state: RootState) => {
  const activeHex    = state.galaxy.activeWorldHex;
  const activeSector = state.galaxy.activeWorldSectorAbbr;
  const targetHex    = state.galaxy.targetWorldHex;
  const targetSector = state.galaxy.targetWorldSectorAbbr;
  const shipHex      = state.ship.ship?.hex    ?? null;
  const shipSector   = state.ship.ship?.sectorAbbr ?? null;

  return (coord: WorldCoord, mode: MapMode): WorldDotStyle => {
    const { hex, sectorAbbr } = coord;
    const selectedR = mode === "galaxyMiniMap" ? 20 : 10;

    if (shipHex && shipSector && shipHex === hex && shipSector === sectorAbbr) {
      return { fill: "var(--hud-ship)",    r: selectedR * 2 };
    }
    if (activeHex === hex && activeSector === sectorAbbr) {
      return { fill: "var(--hud-error)",   r: selectedR };
    }
    if (targetHex === hex && targetSector === sectorAbbr) {
      return { fill: "var(--hud-success)", r: selectedR };
    }
    return { fill: "white", r: 5 };
  };
};

export const selectTargetWorldLocation = (
  state: RootState,
): WorldLocation | null => {
  const world = selectTargetWorld(state);
  const abbr = state.galaxy.targetWorldSectorAbbr;
  if (!world || !abbr) return null;
  const sectorData = state.galaxy.sectorData[abbr];
  if (!sectorData) return null;
  const subsectorKey = worldSubsectorKey(world.hexX, world.hexY);
  return {
    sectorAbbr: abbr,
    sectorName: sectorData.sector,
    subsectorKey,
    subsectorName: sectorData.subsectors[subsectorKey] ?? subsectorKey,
  };
};
