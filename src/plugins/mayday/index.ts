import type { PluginManifest } from "@/plugin-api/types";
import { maydayHudMetadata } from "./hudMetadata";
import { maydayPluginId } from "./metadata";
import { maydayStateRegistration } from "./stateRegistration";
import type { MaydayState } from "./maydaySlice";

export const maydayPlugin = {
  metadata: {
    id: maydayPluginId,
  },
  state: maydayStateRegistration,
  huds: maydayHudMetadata,
  actions: [],
  handlers: [],
  effectResolvers: [],
} satisfies PluginManifest<MaydayState>;

export {
  maydayActionsHudId,
  maydayPluginId,
  maydayPluginStateKey,
} from "./metadata";
export {
  initialMaydayState,
  type MaydayState,
} from "./maydaySlice";
