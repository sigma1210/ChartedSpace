import {
  navigationPluginId,
  navigationSelectHudId,
} from "./metadata";

export const navigationHudMetadata = {
  id: navigationSelectHudId,
  pluginId: navigationPluginId,
  title: "Navigation",
  openTitle: "Open navigation",
  visibleTitle: "Navigation visible",
  defaultLayout: {
    visible: false,
    pinned: true,
    offset: { x: 0.08, y: 0.28 },
  },
} as const;
