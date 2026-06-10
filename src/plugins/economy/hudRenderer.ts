import type { PluginHudRendererRegistration } from "@/plugin-api/types";
import {
  EconomyLedgerHudContent,
  EconomyLedgerHudIcon,
} from "./EconomyLedgerHud";
import { economyLedgerHudId } from "./hudMetadata";

export const economyLedgerHudRenderer = {
  id: economyLedgerHudId,
  Icon: EconomyLedgerHudIcon,
  Component: EconomyLedgerHudContent,
} satisfies PluginHudRendererRegistration;
