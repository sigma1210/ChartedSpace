"use client";

import { useCallback } from "react";
import type { EditorMapPoint } from "@/plugins/characterCombat/editor/lib/tacticalEditorInteractionState";

type TacticalEditorTerrainPlacementRouterOptions = {
  activeDrawingTool: string | null;
  placeElevationTransition: (origin: EditorMapPoint) => boolean;
  placeFire: (origin: EditorMapPoint) => boolean;
  placeNaturalTerrain: (origin: EditorMapPoint) => boolean;
  placeOrdinaryTerrain: (origin: EditorMapPoint) => void;
};

export const useTacticalEditorTerrainPlacementRouter = ({
  activeDrawingTool,
  placeElevationTransition,
  placeFire,
  placeNaturalTerrain,
  placeOrdinaryTerrain,
}: TacticalEditorTerrainPlacementRouterOptions) => useCallback((origin: EditorMapPoint) => {
  if (!activeDrawingTool) return;
  if (placeElevationTransition(origin)) return;
  if (placeFire(origin)) return;
  if (placeNaturalTerrain(origin)) return;
  placeOrdinaryTerrain(origin);
}, [
  activeDrawingTool,
  placeElevationTransition,
  placeFire,
  placeNaturalTerrain,
  placeOrdinaryTerrain,
]);
