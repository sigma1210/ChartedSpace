"use client";

import { useCallback, type PointerEvent as ReactPointerEvent } from "react";
import type {
  TacticalEditorMapSize,
  TacticalEditorSnapMode,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorCamera";
import type { RaisedAreaDraft } from "@/plugins/characterCombat/editor/lib/tacticalEditorInteractionState";
import {
  tacticalEditorLocalMapPoint,
  tacticalEditorMapPointer,
  tacticalEditorMapVertex,
  type TacticalEditorClientPointer,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorPointerCoordinates";
import { isAreaTool } from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

type MapPoint = { x: number; y: number };

type UseTacticalEditorMapCoordinatesOptions = {
  map: TacticalEditorMapSize;
  raisedAreaDraft: RaisedAreaDraft | null;
  placementKind: string | null;
  snapMode: TacticalEditorSnapMode;
  localMapPoint?: (event: TacticalEditorClientPointer) => MapPoint | null;
};

export const useTacticalEditorMapCoordinates = ({
  map,
  raisedAreaDraft,
  placementKind,
  snapMode,
  localMapPoint = tacticalEditorLocalMapPoint,
}: UseTacticalEditorMapCoordinatesOptions) => {
  const mapPoint = useCallback((event: ReactPointerEvent<SVGElement>) => {
    const local = localMapPoint(event);
    return local ? tacticalEditorMapPointer(local) : null;
  }, [localMapPoint]);

  const mapVertex = useCallback((event: ReactPointerEvent<SVGElement>) => {
    const local = localMapPoint(event);
    if (!local) return null;
    return tacticalEditorMapVertex(local, {
      raisedAreaDraft,
      areaToolActive: isAreaTool(placementKind),
      snapMode,
      map,
    });
  }, [localMapPoint, map, placementKind, raisedAreaDraft, snapMode]);

  return { mapPoint, mapVertex };
};
