import type { PluginManifest } from "@/plugin-api/types";
import { shipNavigationCapabilityId } from "@/plugins/shipNavigationCapabilities";
import { shipHudMetadata } from "./hudMetadata";
import { shipPluginId } from "./metadata";
import { shipPluginStateRegistration } from "./stateRegistration";
import type { ShipPluginState } from "./shipPluginSlice";

export const shipPlugin = {
  metadata: {
    id: shipPluginId,
  },
  capabilities: {
    provides: [shipNavigationCapabilityId],
  },
  state: shipPluginStateRegistration,
  huds: [
    shipHudMetadata,
  ],
  actions: [],
  handlers: [],
  effectResolvers: [],
} satisfies PluginManifest<ShipPluginState>;

export {
  shipHudMetadata,
} from "./hudMetadata";
export {
  shipHudId,
  shipPluginId,
  shipPluginStateKey,
} from "./metadata";
export {
  initialShipPluginState,
  setDevelopmentJumpRatingOverride,
} from "./shipPluginSlice";
export {
  shipNavigationCapabilitiesProvider,
} from "./shipNavigationCapabilities";
export {
  selectActiveShip,
  selectIsShipDocked,
  selectOwnerOperatorCharacterId,
  selectShipCargo,
  selectShipColor,
  selectShipCrew,
  selectShipLocation,
  selectShipPluginJumpRating,
  selectShipPluginState,
  selectShipStatus,
} from "./selectors";
export {
  buyCargoAndRefresh,
  fetchShip,
  invalidateShip,
  sellCargoAndRefresh,
  setShipColor,
  setShipJumpRating,
  updateShipInStore,
  type CargoLotSummary,
  type CrewMember,
  type ShipSummary,
} from "./actions";
