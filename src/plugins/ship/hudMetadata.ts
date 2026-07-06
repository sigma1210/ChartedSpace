import {
  shipActionsHudId,
  shipCrewAssignmentHudId,
  shipCrewListHudId,
  shipHudId,
  shipPluginId,
} from "./metadata";

export const shipActionsHudMetadata = {
  id: shipActionsHudId,
  pluginId: shipPluginId,
  title: "Ships",
  openTitle: "Open ship tools",
  visibleTitle: "Ship tools visible",
  showInHudControls: true,
  panelClassName: "px-1.5 py-1 text-[8px] tracking-normal",
  defaultLayout: {
    visible: false,
    pinned: true,
    offset: { x: 0.5, y: 0.22 },
  },
} as const;

export const shipHudMetadata = {
  id: shipHudId,
  pluginId: shipPluginId,
  title: "Ship Systems",
  openTitle: "Open ship systems",
  visibleTitle: "Ship systems visible",
  showInHudControls: false,
  panelClassName: "px-1.5 py-1 text-[8px] tracking-normal",
  defaultLayout: {
    visible: false,
    pinned: true,
    offset: { x: 0.44, y: 0.14 },
  },
} as const;

export const shipCrewAssignmentHudMetadata = {
  id: shipCrewAssignmentHudId,
  pluginId: shipPluginId,
  title: "Ship Crew Assignment",
  openTitle: "Open ship crew assignment",
  visibleTitle: "Ship crew assignment visible",
  showInHudControls: false,
  panelClassName: "px-1.5 py-1 text-[8px] tracking-normal",
  defaultLayout: {
    visible: false,
    pinned: true,
    offset: { x: 0.28, y: 0.06 },
  },
} as const;

export const shipCrewListHudMetadata = {
  id: shipCrewListHudId,
  pluginId: shipPluginId,
  title: "Ship Crew",
  openTitle: "Open ship crew list",
  visibleTitle: "Ship crew list visible",
  showInHudControls: false,
  panelClassName: "px-1.5 py-1 text-[8px] tracking-normal",
  defaultLayout: {
    visible: false,
    pinned: true,
    offset: { x: 0.28, y: 0.06 },
  },
} as const;

export const shipHudMetadataList = [
  shipActionsHudMetadata,
  shipHudMetadata,
  shipCrewAssignmentHudMetadata,
  shipCrewListHudMetadata,
] as const;
