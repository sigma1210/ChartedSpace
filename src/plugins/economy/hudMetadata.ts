import { economyPluginId } from "./metadata";

export const economyLedgerHudId = "plugin.core.economy.ledger" as const;

export const economyLedgerHudMetadata = {
  id: economyLedgerHudId,
  pluginId: economyPluginId,
  title: "Ledger",
  openTitle: "Open economy ledger",
  visibleTitle: "Economy ledger visible",
  defaultLayout: {
    visible: false,
    pinned: true,
    offset: { x: 0.08, y: -0.18 },
  },
} as const;
