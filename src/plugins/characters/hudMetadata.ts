import {
  characterActionsHudId,
  characterListHudId,
  characterProfileHudId,
  characterProfessionalBoardHudId,
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

export const characterProfessionalBoardHudMetadata = {
  id: characterProfessionalBoardHudId,
  pluginId: charactersPluginId,
  title: "Professional Board",
  openTitle: "Open professional board",
  visibleTitle: "Professional board visible",
  showInHudControls: false,
  panelClassName: "px-1.5 py-1 text-[8px] tracking-normal",
  defaultLayout: {
    visible: false,
    pinned: true,
    offset: { x: 0.18, y: 0.04 },
  },
} as const;

export const characterHudMetadata = [
  characterActionsHudMetadata,
  characterProfileHudMetadata,
  characterListHudMetadata,
  characterProfessionalBoardHudMetadata,
] as const;
