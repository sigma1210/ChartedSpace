import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/store";
import type { MapMode, SectorDetail, World, WorldCoord, WorldDotStyle } from "@/types";
import { demographicsStateKey } from "./metadata";
import {
  initialDemographicsState,
  type DemographicDotMode,
  type DemographicsState,
} from "./demographicsSlice";
import {
  defaultWorldDotColor,
  getAllegianceColor,
  getPrimaryStellarColor,
  stellarLegendItems,
  type LegendItem,
} from "./palettes";

export type DemographicWorldDotStyleResolver = (
  world: World | null,
  coord: WorldCoord,
  mode: MapMode,
) => WorldDotStyle;

export type DemographicsPluginRoot = RootState & {
  plugins: RootState["plugins"] & Record<typeof demographicsStateKey, DemographicsState>;
};

const baseDotRadius = () => 5;

export const selectDemographicsState = (state: DemographicsPluginRoot) =>
  state.plugins[demographicsStateKey] ?? initialDemographicsState;

export const selectSelectedDemographicDotMode = (state: DemographicsPluginRoot) =>
  selectDemographicsState(state).selectedDotMode;

export const selectDemographicWorldDotStyleResolver = createSelector(
  [selectSelectedDemographicDotMode],
  (selectedMode): DemographicWorldDotStyleResolver =>
    (world) => {
      if (selectedMode === "stellar") {
        return { fill: getPrimaryStellarColor(world), r: baseDotRadius() };
      }
      if (selectedMode === "allegiance") {
        return { fill: getAllegianceColor(world?.allegiance), r: baseDotRadius() };
      }
      return { fill: defaultWorldDotColor, r: baseDotRadius() };
    },
);

const collectAllegianceLegendItems = (
  sectorData: Record<string, SectorDetail | undefined>,
): LegendItem[] => {
  const labels = new Map<string, string>();

  for (const sector of Object.values(sectorData)) {
    if (!sector) continue;
    for (const [key, label] of Object.entries(sector.allegiances)) {
      labels.set(key, label);
    }
    for (const world of sector.worlds) {
      if (!world.allegiance) continue;
      labels.set(world.allegiance, labels.get(world.allegiance) ?? world.allegiance);
    }
  }

  return [...labels.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, label]) => ({
      key,
      label: label || key,
      color: getAllegianceColor(key),
    }));
};

export const selectAllegianceLegendItems = createSelector(
  [(state: DemographicsPluginRoot) => state.galaxy.sectorData],
  collectAllegianceLegendItems,
);

export const selectVisibleDemographicLegendItems = createSelector(
  [selectSelectedDemographicDotMode, selectAllegianceLegendItems],
  (selectedMode, allegianceItems): LegendItem[] => {
    if (selectedMode === "stellar") return stellarLegendItems;
    if (selectedMode === "allegiance") return allegianceItems;
    return [];
  },
);

export const selectDemographicModeLabel = (mode: DemographicDotMode) => {
  if (mode === "stellar") return "Stellar";
  if (mode === "allegiance") return "Allegiance";
  return "Default";
};
