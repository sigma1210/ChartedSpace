import type { PluginManifest } from "@/plugin-api/types";
import { shipNavigationCapabilityId } from "./shipNavigationCapabilities";
import { shipTradeCapabilityId } from "./shipTradeCapabilities";
import { shipHudMetadataList } from "./hudMetadata";
import { shipPluginId } from "./metadata";
import { shipPluginStateRegistration } from "./stateRegistration";
import type { ShipPluginState } from "./shipPluginSlice";

export const shipPlugin = {
  metadata: {
    id: shipPluginId,
  },
  capabilities: {
    provides: [shipNavigationCapabilityId, shipTradeCapabilityId],
  },
  state: shipPluginStateRegistration,
  huds: [...shipHudMetadataList],
  actions: [],
  handlers: [],
  effectResolvers: [],
} satisfies PluginManifest<ShipPluginState>;

export {
  shipActionsHudMetadata,
  shipCrewAssignmentHudMetadata,
  shipCrewListHudMetadata,
  shipHudMetadata,
  shipHudMetadataList,
} from "./hudMetadata";
export {
  shipActionsHudId,
  shipCrewAssignmentHudId,
  shipCrewListHudId,
  shipHudId,
  shipPluginId,
  shipPluginStateKey,
} from "./metadata";
export {
  initialShipPluginState,
  setDevelopmentJumpRatingOverride,
} from "./shipPluginSlice";
export {
  resolveShipNavigationCapabilities,
  shipNavigationCapabilityId,
  shipNavigationCapabilitiesProvider,
  type ShipNavigationCapabilities,
  type ShipNavigationCapabilitiesProvider,
} from "./shipNavigationCapabilities";
export {
  resolveShipTradeCapabilities,
  shipTradeCapabilityId,
  shipTradeCapabilitiesProvider,
  type ShipTradeCapabilities,
  type ShipTradeCapabilitiesProvider,
} from "./shipTradeCapabilities";
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
  fetchShip,
  invalidateShip,
  setShipColor,
  setShipJumpRating,
  updateShipInStore,
  type CargoManifestLot,
  type CrewMember,
  type ShipSummary,
  type WorldCoordinateToken,
} from "./actions";
