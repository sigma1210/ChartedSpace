import { selectShipTradeCapabilities } from "@/plugins/runtime";
import { deriveWorldPricePerTon } from "@/lib/trade";
import type { RootState } from "@/store";
import { deriveTradeClassifications, selectWorldByCoord } from "@/store/selectors/galaxy.selectors";

export interface CurrentMarketData {
  worldName: string;
  commodity: string;
  tradeCodes: string[];
  basePricePerTon: number;
  pricePerTon: number;
  remainingCapacity: number;
}

export const selectCurrentMarketData = (state: RootState): CurrentMarketData | null => {
  const shipTrade = selectShipTradeCapabilities(state);
  if (!shipTrade?.isDocked) return null;

  const world = selectWorldByCoord(
    shipTrade.currentWorld.sectorAbbr,
    shipTrade.currentWorld.hex,
  )(state);
  if (!world) return null;

  const tradeCodes = deriveTradeClassifications(world);
  const basePricePerTon = deriveWorldPricePerTon(
    tradeCodes,
    world.uwp.starport,
    world.uwp.techLevel,
  );

  return {
    worldName: world.name,
    commodity: world.commodity ?? `Goods from ${world.name}`,
    tradeCodes,
    basePricePerTon,
    pricePerTon: basePricePerTon,
    remainingCapacity: shipTrade.remainingCargoTons,
  };
};
