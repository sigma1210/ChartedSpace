import type { RootState } from "@/store";

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
