import type { InternalPluginRegistration } from "@/plugin-api/types";
import {
  tradePluginId,
  tradeStateKey,
} from "./metadata";
import tradeReducer, {
  initialTradeState,
  type TradeState,
} from "./tradeSlice";

export const tradeStateRegistration = {
  id: tradePluginId,
  stateKey: tradeStateKey,
  reducer: tradeReducer,
  initialState: initialTradeState,
} satisfies InternalPluginRegistration<TradeState> & { initialState: TradeState };
