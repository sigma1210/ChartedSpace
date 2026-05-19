import type { RootState } from "../index";

export const selectShip       = (state: RootState) => state.ship.ship;
export const selectShipStatus = (state: RootState) => state.ship.status;
export const selectShipCrew     = (state: RootState) => state.ship.ship?.crew ?? [];

export const selectShipLocation = (state: RootState) => {
  const ship = state.ship.ship;
  if (!ship) return null;
  return {
    hex:        ship.hex,
    sectorAbbr: ship.sectorAbbr,
    status:     ship.status,
  };
};
