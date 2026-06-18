import type { PluginHudRendererRegistration } from "@/plugin-api/types";
import { TradeHudIcon, TradeSystemHudContent } from "./TradeHud";
import { tradeHudId } from "./metadata";

export const tradeHudRenderer = {
  id: tradeHudId,
  Icon: TradeHudIcon,
  Component: TradeSystemHudContent,
} satisfies PluginHudRendererRegistration;
