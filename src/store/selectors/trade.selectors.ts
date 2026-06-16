import type { RootState } from "../index";
import { selectActiveShip } from "../../plugins/ship";
import { deriveWorldPricePerTon } from "../../lib/trade";
import { deriveTradeClassifications, selectWorldByCoord } from "./galaxy.selectors";

export interface CurrentMarketData {
  worldName: string;
  tradeCodes: string[];
  basePricePerTon: number;
  pricePerTon: number;
  remainingCapacity: number;
}

export const selectCurrentMarketData = (state: RootState): CurrentMarketData | null => {
  const ship = selectActiveShip(state);
  if (!ship || ship.status !== "docked") return null;

  const world = selectWorldByCoord(ship.sectorAbbr, ship.hex)(state);
  if (!world) return null;

  const tradeCodes = deriveTradeClassifications(world);
  const basePricePerTon = deriveWorldPricePerTon(
    tradeCodes,
    world.uwp.starport,
    world.uwp.techLevel,
  );
  const usedTons = ship.cargo.reduce((sum, lot) => sum + lot.tons, 0);
  const remainingCapacity = Math.max(0, ship.cargoCapacity - usedTons);

  return {
    worldName: world.name,
    tradeCodes,
    basePricePerTon,
    pricePerTon: basePricePerTon,
    remainingCapacity,
  };
};
