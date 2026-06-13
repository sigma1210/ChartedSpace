import type { PluginManifest } from "@/plugin-api/types";
import { shipNavigationCapabilityId } from "@/plugins/shipNavigationCapabilities";
import { mockShipHudMetadata } from "./hudMetadata";
import { mockShipPluginId } from "./metadata";
import { mockShipStateRegistration } from "./stateRegistration";
import type { MockShipState } from "./mockShipSlice";

export const mockShipPlugin = {
  metadata: {
    id: mockShipPluginId,
  },
  capabilities: {
    provides: [shipNavigationCapabilityId],
  },
  state: mockShipStateRegistration,
  huds: [
    mockShipHudMetadata,
  ],
  actions: [],
  handlers: [],
  effectResolvers: [],
} satisfies PluginManifest<MockShipState>;

export {
  mockShipHudMetadata,
} from "./hudMetadata";
export {
  mockShipHudId,
  mockShipPluginId,
  mockShipStateKey,
} from "./metadata";
export {
  initialMockShipState,
  recordMockShipJumpRating,
} from "./mockShipSlice";
export {
  mockShipNavigationCapabilitiesProvider,
} from "./shipNavigationCapabilities";
