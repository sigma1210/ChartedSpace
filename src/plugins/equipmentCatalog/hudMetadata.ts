import {
  equipmentCatalogHudId,
  equipmentCatalogPluginId,
} from "./metadata";

export const equipmentCatalogHudMetadata = {
  id: equipmentCatalogHudId,
  pluginId: equipmentCatalogPluginId,
  title: "Catalog",
  openTitle: "Open equipment catalog",
  visibleTitle: "Equipment catalog visible",
  showInHudControls: true,
  panelClassName: "px-1.5 py-1 text-[8px] tracking-normal",
  defaultLayout: {
    visible: false,
    pinned: true,
    offset: { x: 0.18, y: -0.08 },
  },
} as const;
