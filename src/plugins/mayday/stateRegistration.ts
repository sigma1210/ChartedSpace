import type { InternalPluginRegistration } from "@/plugin-api/types";
import {
  maydayPluginId,
  maydayPluginStateKey,
} from "./metadata";
import maydayReducer, {
  initialMaydayState,
  type MaydayState,
} from "./maydaySlice";

export const maydayStateRegistration = {
  id: maydayPluginId,
  stateKey: maydayPluginStateKey,
  reducer: maydayReducer,
  initialState: initialMaydayState,
} satisfies InternalPluginRegistration<MaydayState> & {
  initialState: MaydayState;
};
