"use client";

import {
  tacticalTerrainPalette,
  type TacticalTerrainPlacement,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";

export type TacticalEditorPlacementControl = {
  placement: TacticalTerrainPlacement;
  size: { width: number; height: number };
};

const placementSize = (placement: TacticalTerrainPlacement) => {
  const definition = tacticalTerrainPalette.find((item) => item.id === placement.terrainDefinitionId);
  if (!definition) return { width: 1, height: 1 };
  return placement.rotation === 90 || placement.rotation === 270
    ? { width: definition.size.height, height: definition.size.width }
    : definition.size;
};

export const useTacticalEditorPlacementControls = (
  placements: TacticalTerrainPlacement[],
): TacticalEditorPlacementControl[] => [...placements]
  .sort((first, second) => {
    const firstSize = placementSize(first);
    const secondSize = placementSize(second);
    return secondSize.width * secondSize.height - firstSize.width * firstSize.height;
  })
  .map((placement) => ({
    placement,
    size: placementSize(placement),
  }));
