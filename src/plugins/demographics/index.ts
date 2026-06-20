import type { PluginManifest } from "@/plugin-api/types";
import { demographicsHudMetadata } from "./hudMetadata";
import { demographicsPluginId } from "./metadata";
import { demographicsStateRegistration } from "./stateRegistration";
import type { DemographicsState } from "./demographicsSlice";

export const demographicsPlugin = {
  metadata: {
    id: demographicsPluginId,
  },
  state: demographicsStateRegistration,
  huds: [
    demographicsHudMetadata,
  ],
  actions: [],
  handlers: [],
  effectResolvers: [],
} satisfies PluginManifest<DemographicsState>;

export {
  demographicsHudId,
  demographicsPluginId,
  demographicsStateKey,
} from "./metadata";
export {
  demographicDotModes,
  initialDemographicsState,
  setDemographicDotMode,
  type DemographicDotMode,
} from "./demographicsSlice";
export {
  demographicsHudMetadata,
} from "./hudMetadata";
