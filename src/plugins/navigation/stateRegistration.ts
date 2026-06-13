import type { InternalPluginRegistration } from "@/plugin-api/types";
import {
  navigationPluginId,
  navigationStateKey,
} from "./metadata";
import navigationReducer, {
  initialNavigationState,
  type NavigationState,
} from "./navigationSlice";

export const navigationStateRegistration = {
  id: navigationPluginId,
  stateKey: navigationStateKey,
  reducer: navigationReducer,
  initialState: initialNavigationState,
} satisfies InternalPluginRegistration<NavigationState> & {
  initialState: NavigationState;
};
