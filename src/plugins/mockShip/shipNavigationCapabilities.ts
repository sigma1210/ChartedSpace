import type { ShipNavigationCapabilitiesProvider } from "@/plugins/shipNavigationCapabilities";
import { mockShipPluginId } from "./metadata";

export const mockShipNavigationCapabilitiesProvider = {
  id: "mockShip.navigationCapabilities",
  pluginId: mockShipPluginId,
  priority: 100,
  selectCapabilities: (state) => {
    const jumpRating = state.plugins.mockShip.lastMockedJumpRating ?? state.ship.ship?.jumpRating;
    if (!jumpRating) return null;

    return {
      jumpRating,
    };
  },
} satisfies ShipNavigationCapabilitiesProvider;
