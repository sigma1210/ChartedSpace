import {
  buildJumpRangeCells,
  buildJumpRangeTargets,
  neededJumpSectorAbbrs,
} from "../../lib/jumpRange";
import type { RootState } from "../index";

export const selectJumpNavigationState = (state: RootState) => state.jumpNavigation;
export const selectHasStoredJumpDestination = (state: RootState) =>
  state.jumpNavigation.hasStoredJumpDestination;

export const selectNeededJumpSectorAbbrs = (state: RootState) =>
  neededJumpSectorAbbrs({
    shipHex: state.ship.ship?.hex,
    shipSectorAbbr: state.ship.ship?.sectorAbbr,
    jumpRating: state.ship.ship?.jumpRating ?? 1,
    allSectors: state.galaxy.sectors,
  });

export const selectJumpRangeTargets = (state: RootState) =>
  buildJumpRangeTargets({
    shipHex: state.ship.ship?.hex,
    shipSectorAbbr: state.ship.ship?.sectorAbbr,
    jumpRating: state.ship.ship?.jumpRating ?? 1,
    allSectors: state.galaxy.sectors,
    sectorData: state.galaxy.sectorData,
  });

export const selectJumpRangeCells = (state: RootState) =>
  buildJumpRangeCells({
    shipHex: state.ship.ship?.hex,
    shipSectorAbbr: state.ship.ship?.sectorAbbr,
    jumpRating: state.ship.ship?.jumpRating ?? 1,
    allSectors: state.galaxy.sectors,
    sectorData: state.galaxy.sectorData,
  });

export const selectEffectiveJumpDestinationKey = (state: RootState) => {
  const selectedKey = state.jumpNavigation.selectedDestinationKey;
  if (!selectedKey) return null;
  return selectJumpRangeTargets(state).some((target) => target.key === selectedKey)
    ? selectedKey
    : null;
};

export const selectEffectiveJumpDestination = (state: RootState) => {
  const selectedKey = selectEffectiveJumpDestinationKey(state);
  if (!selectedKey) return null;
  return selectJumpRangeTargets(state).find((target) => target.key === selectedKey) ?? null;
};

export const selectEffectivePlotStatus = (state: RootState) =>
  selectEffectiveJumpDestinationKey(state)
    ? state.jumpNavigation.plotStatus
    : "idle";

export const selectJumpTargetsLoading = (state: RootState) => {
  const neededSectors = selectNeededJumpSectorAbbrs(state);
  return neededSectors.length > 0 &&
    neededSectors.some((abbr) => {
      const status = state.galaxy.loadingStatus[abbr];
      return status === "loading" || !status;
    });
};

export const selectJumpTargetsError = (state: RootState) =>
  selectNeededJumpSectorAbbrs(state).some(
    (abbr) => state.galaxy.loadingStatus[abbr] === "error",
  );
