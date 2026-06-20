import type { RootState } from "../index";
import { createSelector } from "@reduxjs/toolkit";
import type { World, WorldCoord, MapMode, WorldDotStyle } from "../../types";
import {
  deriveTradeClassifications as deriveTradeCodes,
  calculateWorldPairSalePrice,
  deriveWorldPricePerTon,
} from "@/lib/trade";
import { selectShipLocation } from "@/plugins/ship";
import { selectDemographicWorldDotStyleResolver } from "@/plugins/demographics/selectors";
import { uwpVal } from "../../lib/worldMap";

// Wrapper so callers using the World shape still work
export const deriveTradeClassifications = (world: World): string[] =>
  deriveTradeCodes(world.uwp);

export const selectAllSectors = (state: RootState) => state.galaxy.sectors;
export const selectSectorData = (abbr: string) => (state: RootState) =>
  state.galaxy.sectorData[abbr];
export const selectSectorLoadStatus = (abbr: string) => (state: RootState) =>
  state.galaxy.loadingStatus[abbr] ?? "idle";
export const selectShipSectorLoadStatus = (state: RootState) => {
  const sectorAbbr = selectShipLocation(state)?.sectorAbbr;
  return sectorAbbr ? state.galaxy.loadingStatus[sectorAbbr] ?? "idle" : "idle";
};
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

export const selectWorldByCoord =
  (sectorAbbr: string | null | undefined, hex: string | null | undefined) =>
  (state: RootState): World | null => {
    if (!sectorAbbr || !hex) return null;
    return (
      state.galaxy.sectorData[sectorAbbr]?.worlds.find((w) => w.hex === hex) ??
      null
    );
  };

export const selectActiveWorldName = (state: RootState) =>
  selectActiveWorld(state)?.name ?? null;

const emptyTradeCodes: string[] = [];

export const selectActiveWorldTradeCodes = createSelector(
  [selectActiveWorld],
  (world): string[] => world ? deriveTradeCodes(world.uwp) : emptyTradeCodes,
);

export const deriveWorldTechLevel = (world: World | null): number | null =>
  world ? uwpVal(world.uwp.techLevel) : null;

export const selectActiveWorldTechLevel = (state: RootState): number | null =>
  deriveWorldTechLevel(selectActiveWorld(state));

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

export const selectActiveWorldTradeLabels = createSelector(
  [selectActiveWorldTradeCodes],
  (tradeCodes): string[] => tradeCodes.map((code) => TRADE_CODE_LABELS[code] ?? code),
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

export const selectTargetWorldTradeCodes = createSelector(
  [selectTargetWorld],
  (world): string[] => world ? deriveTradeCodes(world.uwp) : emptyTradeCodes,
);

export const selectTargetWorldTechLevel = (state: RootState): number | null =>
  deriveWorldTechLevel(selectTargetWorld(state));

export const selectTargetWorldTradeLabels = createSelector(
  [selectTargetWorldTradeCodes],
  (tradeCodes): string[] => tradeCodes.map((code) => TRADE_CODE_LABELS[code] ?? code),
);

export const selectTargetWorldCost = (state: RootState): number | null => {
  const world = selectTargetWorld(state);
  return world ? deriveWorldCost(world) : null;
};

export const deriveExpectedSalePrice = (
  sourceWorld: World,
  targetWorld: World,
): number => {
  return calculateWorldPairSalePrice(sourceWorld.uwp, targetWorld.uwp);
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

const selectShipWorldDotHex = (state: RootState) =>
  state.plugins.shipPlugin.ship?.hex ?? null;

const selectShipWorldDotSector = (state: RootState) =>
  state.plugins.shipPlugin.ship?.sectorAbbr ?? null;

const selectedWorldDotRadius = (mode: MapMode) =>
  mode === "galaxyMiniMap" ? 20 : 10;

const resolveSelectionWorldDotStyle = ({
  activeHex,
  activeSector,
  targetHex,
  targetSector,
  shipHex,
  shipSector,
  coord,
  mode,
  baseStyle,
}: {
  activeHex: string | null;
  activeSector: string | null;
  targetHex: string | null;
  targetSector: string | null;
  shipHex: string | null;
  shipSector: string | null;
  coord: WorldCoord;
  mode: MapMode;
  baseStyle: WorldDotStyle;
}): WorldDotStyle => {
  const { hex, sectorAbbr } = coord;
  const selectedR = selectedWorldDotRadius(mode);

  if (shipHex && shipSector && shipHex === hex && shipSector === sectorAbbr) {
    return { fill: "var(--hud-ship)",    r: selectedR * 2 };
  }
  if (activeHex === hex && activeSector === sectorAbbr) {
    return { fill: "var(--hud-error)",   r: selectedR };
  }
  if (targetHex === hex && targetSector === sectorAbbr) {
    return { fill: "var(--hud-success)", r: selectedR };
  }
  return baseStyle;
};

export const selectWorldDotStyle = createSelector(
  [
    selectActiveWorldHex,
    selectActiveWorldSectorAbbr,
    selectTargetWorldHex,
    selectTargetWorldSectorAbbr,
    selectShipWorldDotHex,
    selectShipWorldDotSector,
    (state: RootState) => state.galaxy.sectorData,
    selectDemographicWorldDotStyleResolver,
  ],
  (
    activeHex,
    activeSector,
    targetHex,
    targetSector,
    shipHex,
    shipSector,
    sectorData,
    resolveDemographicStyle,
  ) =>
    (coord: WorldCoord, mode: MapMode): WorldDotStyle => {
      const world = sectorData[coord.sectorAbbr]?.worlds.find((candidate) =>
        candidate.hex === coord.hex,
      ) ?? null;
      const baseStyle = resolveDemographicStyle(world, coord, mode);
      return resolveSelectionWorldDotStyle({
        activeHex,
        activeSector,
        targetHex,
        targetSector,
        shipHex,
        shipSector,
        coord,
        mode,
        baseStyle,
      });
    },
);

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
