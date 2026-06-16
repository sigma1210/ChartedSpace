import type { RootState } from "@/store";
import { DEFAULT_SHIP_COLOR } from "./shipPluginSlice";
import {
  shipPluginStateKey,
} from "./metadata";
import type { ShipPluginState } from "./shipPluginSlice";

export type ShipPluginRoot = RootState & {
  plugins: RootState["plugins"] & Record<typeof shipPluginStateKey, ShipPluginState>;
};

export const selectShipPluginState = (state: ShipPluginRoot) =>
  state.plugins[shipPluginStateKey];

export const selectShipPluginJumpRating = (state: RootState) =>
  state.plugins.shipPlugin.developmentJumpRatingOverride ??
  state.plugins.shipPlugin.ship?.jumpRating ??
  null;

export const selectActiveShip = (state: RootState) => state.plugins.shipPlugin.ship;
export const selectShipStatus = (state: RootState) => state.plugins.shipPlugin.status;
export const selectShipCrew = (state: RootState) => state.plugins.shipPlugin.ship?.crew ?? [];
export const selectShipCargo = (state: RootState) => state.plugins.shipPlugin.ship?.cargo ?? [];
export const selectShipColor = (state: RootState) =>
  state.plugins.shipPlugin.shipColor ?? DEFAULT_SHIP_COLOR;
export const selectIsShipDocked = (state: RootState) =>
  state.plugins.shipPlugin.ship?.status === "docked";
export const selectOwnerOperatorCharacterId = (state: RootState) =>
  state.plugins.shipPlugin.ship?.crew.find((member) => member.isOwnerOperator)?.characterId ?? null;

export const selectShipLocation = (state: RootState) => {
  const ship = state.plugins.shipPlugin.ship;
  if (!ship) return null;
  return {
    worldName:  ship.worldName,
    hex:        ship.hex,
    sectorAbbr: ship.sectorAbbr,
    status:     ship.status,
  };
};
