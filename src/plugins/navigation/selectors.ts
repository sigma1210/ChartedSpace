import type { JumpRangeTarget } from "@/lib/jumpRange";
import type { RootState } from "@/store";
import { selectShipNavigationCapabilities } from "@/plugin-api";
import { selectShipLocation } from "@/plugins/ship";
import {
  navigationStateKey,
} from "./metadata";
import type {
  NavigationJumpExecutionRequest,
  NavigationSnapshotOrigin,
  NavigationState,
} from "./navigationSlice";

export type NavigationPluginRoot = RootState & {
  plugins: RootState["plugins"] & Record<typeof navigationStateKey, NavigationState>;
};

export const selectNavigationState = (state: NavigationPluginRoot) =>
  state.plugins[navigationStateKey];

export const selectNavigationJumpRating = (state: NavigationPluginRoot) =>
  selectShipNavigationCapabilities(state).jumpRating;

export const selectNavigationSnapshotStatus = (state: NavigationPluginRoot) =>
  selectNavigationState(state).snapshotStatus;

export const selectNavigationPlottedRoute = (state: NavigationPluginRoot) =>
  selectNavigationState(state).plottedRoute;

export const selectNavigationJumpExecutionRequest = (
  state: NavigationPluginRoot,
): NavigationJumpExecutionRequest | null => {
  const navigationState = selectNavigationState(state);
  const route = navigationState.plottedRoute;
  const plotResult = navigationState.plotResult;

  if (navigationState.plotStatus !== "success") return null;
  if (!route || !plotResult?.success) return null;
  if (navigationState.selectedDestinationKey !== route.destinationKey) return null;

  return {
    destination: {
      sectorAbbr: route.sectorAbbr,
      hex: route.hex,
    },
    jumpDistance: route.jumpDistance,
    fuelCostEstimate: route.fuelCostEstimate,
    plotCheck: {
      roll: plotResult.roll,
      target: plotResult.target,
    },
  };
};

export const selectNavigationSnapshotOrigin = (state: NavigationPluginRoot) =>
  selectNavigationState(state).snapshotOrigin;

export const selectNavigationCurrentOrigin = (state: NavigationPluginRoot): NavigationSnapshotOrigin | null => {
  const location = selectShipLocation(state);
  if (!location?.sectorAbbr || !location.hex) return null;
  return {
    worldName:  location.worldName,
    sectorAbbr: location.sectorAbbr,
    hex:        location.hex,
  };
};

export const selectNavigationCurrentOriginKey = (state: NavigationPluginRoot) => {
  const origin = selectNavigationCurrentOrigin(state);
  if (!origin) return null;
  return `${origin.sectorAbbr}:${origin.hex}`;
};

export const selectNavigationGridCells = (state: NavigationPluginRoot) =>
  selectNavigationState(state).snapshotCells.filter(
    (cell) => cell.distance <= selectNavigationJumpRating(state),
  );

export const selectNavigationSnapshotWorldCells = (state: NavigationPluginRoot) =>
  selectNavigationState(state).snapshotCells.filter((cell) => cell.inRange && cell.world);

export const selectNavigationTargets = (state: NavigationPluginRoot): JumpRangeTarget[] =>
  selectNavigationGridCells(state)
    .filter((cell): cell is typeof cell & { sectorAbbr: string; hex: string } =>
      cell.inRange && !!cell.sectorAbbr && !!cell.hex)
    .map((cell) => ({
      key: `${cell.sectorAbbr}:${cell.hex}`,
      sectorAbbr: cell.sectorAbbr,
      hex: cell.hex,
      name: cell.name,
      starport: cell.starport,
      distance: cell.distance,
      dq: cell.dq,
      dr: cell.dr,
      world: cell.world,
    }))
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      const aName = a.name ?? a.hex;
      const bName = b.name ?? b.hex;
      return aName.localeCompare(bName);
    });

export const selectNavigationSelectedDestinationKey = (
  state: NavigationPluginRoot,
) => {
  const selectedKey = selectNavigationState(state).selectedDestinationKey;
  if (!selectedKey) return null;
  return selectNavigationTargets(state).some((target) => target.key === selectedKey)
    ? selectedKey
    : null;
};

export const selectNavigationSelectedDestination = (state: NavigationPluginRoot) => {
  const selectedKey = selectNavigationSelectedDestinationKey(state);
  if (!selectedKey) return null;
  return selectNavigationTargets(state).find((target) => target.key === selectedKey) ?? null;
};

export const selectNavigationShipLocation = (state: NavigationPluginRoot) => {
  const location = selectShipLocation(state);
  return {
    sectorAbbr: location?.sectorAbbr ?? null,
    hex: location?.hex ?? null,
    worldName: location?.worldName ?? null,
  };
};
