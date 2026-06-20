import type { InternalPluginRegistration } from "@/plugin-api/types";
import { demographicsPluginId, demographicsStateKey } from "./metadata";
import demographicsReducer, { type DemographicsState } from "./demographicsSlice";

export const demographicsStateRegistration = {
  id: demographicsPluginId,
  stateKey: demographicsStateKey,
  reducer: demographicsReducer,
} satisfies InternalPluginRegistration<DemographicsState>;
