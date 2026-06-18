import {
  tradeHudId,
  tradePluginId,
} from "./metadata";

export const tradeHudMetadata = {
  id: tradeHudId,
  pluginId: tradePluginId,
  title: "Trade",
  openTitle: "Open trade",
  visibleTitle: "Trade visible",
  defaultLayout: {
    visible: false,
    pinned: true,
    offset: { x: 0.2, y: -0.1 },
  },
} as const;
