import type { InternalPluginRegistration } from "@/plugin-api/types";
import { economyPluginId, economyStateKey } from "./metadata";
import economyReducer, { type EconomyState } from "./economySlice";

export const economyStateRegistration = {
  id: economyPluginId,
  stateKey: economyStateKey,
  reducer: economyReducer,
} satisfies InternalPluginRegistration<EconomyState>;
