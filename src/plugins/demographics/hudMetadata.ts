import { demographicsHudId, demographicsPluginId } from "./metadata";

export { demographicsHudId } from "./metadata";

export const demographicsHudMetadata = {
  id: demographicsHudId,
  pluginId: demographicsPluginId,
  title: "Demographics",
  openTitle: "Open demographics legend",
  visibleTitle: "Demographics legend visible",
  defaultLayout: {
    visible: false,
    pinned: true,
    offset: { x: -0.08, y: 0.16 },
  },
} as const;
