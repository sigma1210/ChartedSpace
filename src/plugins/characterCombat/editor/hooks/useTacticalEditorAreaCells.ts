"use client";

import { useMemo } from "react";
import { tacticalDrawnRaisedAreaCells } from "@/plugins/characterCombat/tacticalDrawnRaisedAreas";
import type {
  TacticalDrawnArea,
  TacticalDrawnRaisedArea,
  TacticalDrawnTerrainRegion,
  TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { GridPoint } from "@/plugins/characterCombat/types";

const indexAreaCells = <Area extends TacticalDrawnRaisedArea>(
  areas: readonly Area[],
  mapWidth: number,
  mapHeight: number,
): ReadonlyMap<Area, GridPoint[]> => new Map(areas.map((area) => {
  try {
    return [area, tacticalDrawnRaisedAreaCells(area, mapWidth, mapHeight)];
  } catch {
    return [area, []];
  }
}));

export const useTacticalEditorAreaCells = (definition: TacticalScenarioDefinitionFile) => {
  const { width, height } = definition.map;
  const drawnAreaCells = useMemo<ReadonlyMap<TacticalDrawnArea, GridPoint[]>>(
    () => indexAreaCells(definition.drawnAreas ?? [], width, height),
    [definition.drawnAreas, height, width],
  );
  const terrainRegionCells = useMemo<ReadonlyMap<TacticalDrawnTerrainRegion, GridPoint[]>>(
    () => indexAreaCells(definition.drawnTerrainRegions ?? [], width, height),
    [definition.drawnTerrainRegions, height, width],
  );
  return { drawnAreaCells, terrainRegionCells };
};
