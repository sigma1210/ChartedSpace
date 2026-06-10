import type { InternalPluginRegistration } from "@/plugin-api/types";
import {
  stayInLocationPluginId,
  stayInLocationStateKey,
} from "./metadata";
import stayInLocationReducer, {
  type StayInLocationState,
} from "./stayInLocationSlice";

export const stayInLocationStateRegistration = {
  id: stayInLocationPluginId,
  stateKey: stayInLocationStateKey,
  reducer: stayInLocationReducer,
} satisfies InternalPluginRegistration<StayInLocationState>;
