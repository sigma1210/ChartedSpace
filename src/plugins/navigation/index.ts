import type { PluginManifest } from "@/plugin-api/types";
import { shipNavigationCapabilityId } from "@/plugins/shipNavigationCapabilities";
import { navigationHudMetadata } from "./hudMetadata";
import { navigationPluginId } from "./metadata";
import { navigationStateRegistration } from "./stateRegistration";
import type { NavigationState } from "./navigationSlice";

export const navigationPlugin = {
  metadata: {
    id: navigationPluginId,
  },
  capabilities: {
    uses: [shipNavigationCapabilityId],
  },
  state: navigationStateRegistration,
  huds: [
    navigationHudMetadata,
  ],
  actions: [],
  handlers: [],
  effectResolvers: [],
} satisfies PluginManifest<NavigationState>;

export {
  navigationHudMetadata,
} from "./hudMetadata";
export {
  navigationPluginId,
  navigationSelectHudId,
  navigationStateKey,
} from "./metadata";
export {
  clearNavigationSelection,
  initialNavigationState,
  selectNavigationDestination,
} from "./navigationSlice";
export type {
  NavigationJumpExecutionRequest,
} from "./navigationSlice";
