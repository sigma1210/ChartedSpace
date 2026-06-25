import {
  characterActionsHudId,
  characterCreateHudId,
  characterListHudId,
  characterProfileHudId,
  charactersPluginId,
} from "./metadata";

export const characterActionsHudMetadata = {
  id: characterActionsHudId,
  pluginId: charactersPluginId,
  title: "Characters",
  openTitle: "Open character tools",
  visibleTitle: "Character tools visible",
  showInHudControls: true,
  panelClassName: "px-1.5 py-1 text-[8px] tracking-normal",
  defaultLayout: {
    visible: false,
    pinned: true,
    offset: { x: -0.22, y: 0.16 },
  },
} as const;

export const characterProfileHudMetadata = {
  id: characterProfileHudId,
  pluginId: charactersPluginId,
  title: "Character",
  openTitle: "Open character profile",
  visibleTitle: "Character profile visible",
  showInHudControls: false,
  panelClassName: "px-1.5 py-1 text-[8px] tracking-normal",
  defaultLayout: {
    visible: false,
    pinned: true,
    offset: { x: -0.18, y: 0.1 },
  },
} as const;

export const characterListHudMetadata = {
  id: characterListHudId,
  pluginId: charactersPluginId,
  title: "Characters",
  openTitle: "Open character list",
  visibleTitle: "Character list visible",
  showInHudControls: false,
  panelClassName: "px-1.5 py-1 text-[8px] tracking-normal",
  defaultLayout: {
    visible: false,
    pinned: true,
    offset: { x: -0.34, y: 0.04 },
  },
} as const;

export const characterCreateHudMetadata = {
  id: characterCreateHudId,
  pluginId: charactersPluginId,
  title: "Generate Character",
  openTitle: "Open character generator",
  visibleTitle: "Character generator visible",
  showInHudControls: false,
  panelClassName: "flex h-[min(34vh,260px)] w-[390px] max-w-[82vw] flex-col px-1.5 py-1 text-[8px] tracking-normal",
  contentClassName: "min-h-0 flex-1 overflow-y-auto overflow-x-hidden",
  offsetBounds: {
    minX: -0.55,
    maxX: 0.55,
    minY: -0.46,
    maxY: 0.02,
  },
  defaultLayout: {
    visible: false,
    pinned: true,
    offset: { x: 0.12, y: -0.14 },
  },
} as const;

export const characterHudMetadata = [
  characterActionsHudMetadata,
  characterProfileHudMetadata,
  characterListHudMetadata,
  characterCreateHudMetadata,
] as const;
