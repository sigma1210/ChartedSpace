import type { RootState } from "@/store";
import type { CargoManifestLot } from "./ship/shipPluginSlice";

export const shipTradeCapabilityId = "ship.trade" as const;

export interface ShipTradeCapabilities {
  shipId: string;
  status: string;
  isDocked: boolean;
  currentWorld: {
    location: string | null;
    name: string | null;
    sectorAbbr: string | null;
    hex: string | null;
  };
  cargoCapacity: number;
  usedCargoTons: number;
  remainingCargoTons: number;
  cargo: CargoManifestLot[];
  crewTradeSkills: {
    broker: number;
    streetwise: number;
    admin: number;
    steward: number;
  };
}

export interface ShipTradeCapabilitiesProvider {
  id: string;
  pluginId: string;
  priority: number;
  selectCapabilities: (state: RootState) => ShipTradeCapabilities | null;
}

export const resolveShipTradeCapabilities = (
  providers: readonly ShipTradeCapabilitiesProvider[],
  state: RootState,
): ShipTradeCapabilities | null => {
  const orderedProviders = [...providers].sort((left, right) => right.priority - left.priority);

  for (const provider of orderedProviders) {
    const capabilities = provider.selectCapabilities(state);
    if (capabilities) return capabilities;
  }

  return null;
};
