import type { RootState } from "../index";
import type { World, WorldCoord, MapMode, WorldDotStyle } from "../../types";
import {
  deriveTradeClassifications as deriveTradeCodes,
  calculateSalePrice,
  deriveWorldPricePerTon,
} from "@/lib/trade";

// Wrapper so callers using the World shape still work
export const deriveTradeClassifications = (world: World): string[] =>
  deriveTradeCodes(world.uwp);

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
  return world ? deriveTradeCodes(world.uwp) : [];
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

export const selectActiveWorldTradeLabels = (state: RootState): string[] =>
  selectActiveWorldTradeCodes(state).map(
    (code) => TRADE_CODE_LABELS[code] ?? code,
  );

export const deriveWorldCost = (world: World): number =>
  deriveWorldPricePerTon(
    deriveTradeCodes(world.uwp),
    world.uwp.starport,
    world.uwp.techLevel,
  );

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
  return world ? deriveTradeCodes(world.uwp) : [];
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
  const sourceCodes = deriveTradeCodes(sourceWorld.uwp);
  const targetCodes = deriveTradeCodes(targetWorld.uwp);
  const sourceTL = parseInt(sourceWorld.uwp.techLevel, 16);
  const targetTL = parseInt(targetWorld.uwp.techLevel, 16);
  return calculateSalePrice(sourceCodes, sourceTL, targetCodes, targetTL);
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
