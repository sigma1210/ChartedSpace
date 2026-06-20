import type { RootState } from "@/store";
import { shipPluginId } from "./metadata";

export const shipNavigationCapabilityId = "ship.navigation" as const;

export interface ShipNavigationCapabilities {
  jumpRating: number;
}

export interface ShipNavigationCapabilitiesProvider {
  id: string;
  pluginId: string;
  priority: number;
  selectCapabilities: (state: RootState) => ShipNavigationCapabilities | null;
}

const clampJumpRating = (jumpRating: number | null | undefined) =>
  Math.min(6, Math.max(1, Math.trunc(jumpRating ?? 1)));

export const resolveShipNavigationCapabilities = (
  providers: readonly ShipNavigationCapabilitiesProvider[],
  state: RootState,
): ShipNavigationCapabilities => {
  const orderedProviders = [...providers].sort((left, right) => right.priority - left.priority);

  for (const provider of orderedProviders) {
    const capabilities = provider.selectCapabilities(state);
    if (!capabilities) continue;
    return {
      jumpRating: clampJumpRating(capabilities.jumpRating),
    };
  }

  return {
    jumpRating: clampJumpRating(state.plugins.shipPlugin.ship?.jumpRating),
  };
};

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
