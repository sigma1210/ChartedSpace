import type { PluginManifest } from "@/plugin-api/types";
import { shipTradeCapabilityId } from "@/plugins/ship";
import { tradeHudMetadata } from "./hudMetadata";
import { tradePluginId } from "./metadata";
import { tradeStateRegistration } from "./stateRegistration";
import type { TradeState } from "./tradeSlice";

export const tradePlugin = {
  metadata: {
    id: tradePluginId,
  },
  capabilities: {
    uses: [shipTradeCapabilityId],
  },
  state: tradeStateRegistration,
  huds: [
    tradeHudMetadata,
  ],
  actions: [],
  handlers: [],
  effectResolvers: [],
} satisfies PluginManifest<TradeState>;

export {
  tradeHudMetadata,
} from "./hudMetadata";
export {
  buyCargoAndRefresh,
  sellCargoAndRefresh,
} from "./actions";
export {
  tradeHudId,
  tradePluginId,
  tradeStateKey,
} from "./metadata";
export {
  initialTradeState,
} from "./tradeSlice";
