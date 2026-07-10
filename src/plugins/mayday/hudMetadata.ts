import {
  maydayActionsHudId,
  maydayPluginId,
} from "./metadata";

export const maydayActionsHudMetadata = {
  id: maydayActionsHudId,
  pluginId: maydayPluginId,
  title: "Mayday",
  openTitle: "Open Mayday tools",
  visibleTitle: "Mayday tools visible",
  showInHudControls: true,
  panelClassName: "px-1.5 py-1 text-[8px] tracking-normal",
  defaultLayout: {
    visible: false,
    pinned: true,
    offset: { x: 0.5, y: 0.32 },
  },
} as const;

export const maydayHudMetadata = [
  maydayActionsHudMetadata,
] as const;
