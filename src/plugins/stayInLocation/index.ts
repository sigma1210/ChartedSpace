import type { PluginManifest } from "@/plugin-api/types";
import { stayInLocationActions } from "./actionRegistration";
import { stayInLocationHandlers } from "./handlerRegistration";
import { stayInLocationHudMetadata } from "./hudMetadata";
import { stayInLocationPluginId } from "./metadata";
import { stayInLocationStateRegistration } from "./stateRegistration";
import type { StayInLocationState } from "./stayInLocationSlice";

export const stayInLocationPlugin = {
  metadata: {
    id: stayInLocationPluginId,
  },
  state: stayInLocationStateRegistration,
  huds: [
    stayInLocationHudMetadata,
  ],
  actions: stayInLocationActions,
  handlers: stayInLocationHandlers,
  effectResolvers: [],
} satisfies PluginManifest<StayInLocationState>;

export {
  stayInLocationPluginId,
  stayInLocationStateKey,
  stayInLocationAdvanceTurnActionId,
} from "./metadata";
export {
  stayInLocationActions,
  stayInLocationAdvanceTurnAction,
} from "./actionRegistration";
export {
  stayInLocationBlockBeforeTurnAdvanceHandler,
  stayInLocationHandlers,
} from "./handlerRegistration";
export {
  stayInLocationHudMetadata,
  stayInLocationNextTurnHudId,
} from "./hudMetadata";
export {
  initialStayInLocationState,
  recordStayInLocationTurn,
} from "./stayInLocationSlice";
