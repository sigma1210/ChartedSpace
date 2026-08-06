"use client";

import { useCallback, type PointerEvent as ReactPointerEvent } from "react";
import type { TacticalEditorDraftPreviewProps } from "@/plugins/characterCombat/editor/lib/tacticalEditorDraftPreviewProps";
import {
  tacticalEditorLocalMapPoint,
  type TacticalEditorClientPointer,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorPointerCoordinates";

type MapPoint = { x: number; y: number };

type ObjectDragStartProps = Pick<TacticalEditorDraftPreviewProps,
  | "selectPlacement"
  | "selectEnemy"
  | "selectWall"
  | "selectRaisedArea"
  | "selectPrimitive"
  | "selectNaturalTerrain"
  | "selectElevationTransition"
  | "selectPortal"
  | "selectFire"
  | "beginNaturalTerrainDrag"
  | "beginWallMove"
  | "beginWallPortalDrag"
>;

type UseTacticalEditorObjectDragStartHandlersOptions = ObjectDragStartProps & {
  mapVertex: (event: ReactPointerEvent<SVGElement>) => MapPoint | null;
  localMapPoint?: (event: TacticalEditorClientPointer) => MapPoint | null;
};

export const useTacticalEditorObjectDragStartHandlers = ({
  mapVertex,
  localMapPoint = tacticalEditorLocalMapPoint,
  selectPlacement,
  selectEnemy,
  selectWall,
  selectRaisedArea,
  selectPrimitive,
  selectNaturalTerrain,
  selectElevationTransition,
  selectPortal,
  selectFire,
  beginNaturalTerrainDrag,
  beginWallMove,
  beginWallPortalDrag,
}: UseTacticalEditorObjectDragStartHandlersOptions) => {
  const handleBeginNaturalTerrainPositionDrag = useCallback((id: string, event: ReactPointerEvent<SVGElement>) => {
    const point = localMapPoint(event);
    selectPlacement(null);
    selectEnemy(null);
    selectWall(null);
    selectRaisedArea(null);
    selectPrimitive(null);
    selectElevationTransition(null);
    selectPortal(null);
    selectFire(null);
    selectNaturalTerrain(id);
    beginNaturalTerrainDrag(id, "position", point ? { x: point.x, y: point.y } : undefined);
  }, [
    beginNaturalTerrainDrag,
    localMapPoint,
    selectElevationTransition,
    selectEnemy,
    selectFire,
    selectNaturalTerrain,
    selectPlacement,
    selectPortal,
    selectPrimitive,
    selectRaisedArea,
    selectWall,
  ]);

  const handleBeginNaturalTerrainRadiusDrag = useCallback((id: string) => {
    beginNaturalTerrainDrag(id, "radius");
  }, [beginNaturalTerrainDrag]);

  const handleBeginWallMove = useCallback((id: string, event: ReactPointerEvent<SVGElement>) => {
    const vertex = mapVertex(event);
    if (!vertex) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    selectPlacement(null);
    selectEnemy(null);
    selectPortal(null);
    selectFire(null);
    selectWall(id);
    beginWallMove(id, vertex);
  }, [beginWallMove, mapVertex, selectEnemy, selectFire, selectPlacement, selectPortal, selectWall]);

  const handleBeginWallPortalDrag = useCallback((id: string) => {
    selectPlacement(null);
    selectEnemy(null);
    selectWall(null);
    selectFire(null);
    selectPortal(id);
    beginWallPortalDrag(id);
  }, [beginWallPortalDrag, selectEnemy, selectFire, selectPlacement, selectPortal, selectWall]);

  return {
    handleBeginNaturalTerrainPositionDrag,
    handleBeginNaturalTerrainRadiusDrag,
    handleBeginWallMove,
    handleBeginWallPortalDrag,
  };
};
