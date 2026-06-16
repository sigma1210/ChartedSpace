import type { ShipNavigationCapabilitiesProvider } from "@/plugins/shipNavigationCapabilities";
import { shipPluginId } from "./metadata";

export const shipNavigationCapabilitiesProvider = {
  id: "ship.navigationCapabilities",
  pluginId: shipPluginId,
  priority: 100,
  selectCapabilities: (state) => {
    const jumpRating =
      state.plugins.shipPlugin.developmentJumpRatingOverride ??
      state.plugins.shipPlugin.ship?.jumpRating;
    if (!jumpRating) return null;

    return {
      jumpRating,
    };
  },
} satisfies ShipNavigationCapabilitiesProvider;
