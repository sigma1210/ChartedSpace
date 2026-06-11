import type { PluginManifest } from "@/plugin-api/types";
import { economyEffectResolvers } from "./effectResolvers";
import { economyHandlers } from "./handlerRegistration";
import { economyLedgerHudMetadata } from "./hudMetadata";
import { economyPluginId } from "./metadata";
import { economyStateRegistration } from "./stateRegistration";
import type { EconomyState } from "./economySlice";

export const economyPlugin = {
  metadata: {
    id: economyPluginId,
  },
  state: economyStateRegistration,
  huds: [
    economyLedgerHudMetadata,
  ],
  actions: [],
  handlers: economyHandlers,
  effectResolvers: economyEffectResolvers,
} satisfies PluginManifest<EconomyState>;

export {
  economyLedgerPostResolver,
  economyEffectResolvers,
} from "./effectResolvers";
export {
  economyMonthlyExpensesHandler,
  economyHandlers,
} from "./handlerRegistration";
export {
  economyLedgerHudId,
  economyLedgerHudMetadata,
} from "./hudMetadata";
export {
  economyLedgerPostEffectType,
  economyPluginId,
  economyStateKey,
} from "./metadata";
export {
  clearEconomyLedgerRequests,
  commitEconomyLedgerRequest,
  commitEconomyLedgerRequestToCredits,
  initialEconomyState,
  recordEconomyLegacyMonthlyExpenses,
  recordEconomyLedgerRequest,
} from "./economySlice";
export {
  recordEconomyLegacyMonthlyExpenseObservations,
} from "./legacyMonthlyExpenses";
