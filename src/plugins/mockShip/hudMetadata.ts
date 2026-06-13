import {
  mockShipHudId,
  mockShipPluginId,
} from "./metadata";

export const mockShipHudMetadata = {
  id: mockShipHudId,
  pluginId: mockShipPluginId,
  title: "Mock Ship",
  openTitle: "Open mock ship",
  visibleTitle: "Mock ship visible",
  defaultLayout: {
    visible: false,
    pinned: true,
    offset: { x: 0.5, y: 0.22 },
  },
} as const;
