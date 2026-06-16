import type { InternalPluginRegistration } from "@/plugin-api/types";
import {
  shipPluginId,
  shipPluginStateKey,
} from "./metadata";
import shipPluginReducer, {
  initialShipPluginState,
  type ShipPluginState,
} from "./shipPluginSlice";

export const shipPluginStateRegistration = {
  id: shipPluginId,
  stateKey: shipPluginStateKey,
  reducer: shipPluginReducer,
  initialState: initialShipPluginState,
} satisfies InternalPluginRegistration<ShipPluginState> & {
  initialState: ShipPluginState;
};
