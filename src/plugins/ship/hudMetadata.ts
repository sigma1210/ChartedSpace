import {
  shipHudId,
  shipPluginId,
} from "./metadata";

export const shipHudMetadata = {
  id: shipHudId,
  pluginId: shipPluginId,
  title: "Ship Systems",
  openTitle: "Open ship systems",
  visibleTitle: "Ship systems visible",
  defaultLayout: {
    visible: false,
    pinned: true,
    offset: { x: 0.5, y: 0.22 },
  },
} as const;
