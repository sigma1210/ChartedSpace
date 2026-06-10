import { stayInLocationPluginId } from "./metadata";

export const stayInLocationNextTurnHudId = "plugin.core.stayInLocation.nextTurn" as const;

export const stayInLocationHudMetadata = {
  id: stayInLocationNextTurnHudId,
  pluginId: stayInLocationPluginId,
  title: "Next Turn",
  openTitle: "Open next turn",
  visibleTitle: "Next turn visible",
  defaultLayout: {
    visible: false,
    pinned: true,
    offset: { x: 0.34, y: 0.34 },
  },
} as const;
