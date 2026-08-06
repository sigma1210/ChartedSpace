"use client";

import { useCallback, type PointerEvent as ReactPointerEvent } from "react";
import type {
  TacticalEnemyPlacement,
  TacticalTerrainPlacement,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { GridPoint } from "@/plugins/characterCombat/types";
import type { TacticalEditorDraftPreviewProps } from "@/plugins/characterCombat/editor/lib/tacticalEditorDraftPreviewProps";
import type { EditorMapPoint } from "@/plugins/characterCombat/editor/lib/tacticalEditorInteractionState";

type MarkerInteractionProps = Pick<TacticalEditorDraftPreviewProps,
  | "selectPlacement"
  | "selectEnemy"
  | "selectFire"
  | "beginDrag"
  | "beginEnemyDrag"
>;

type UseTacticalEditorMarkerInteractionHandlersOptions = MarkerInteractionProps & {
  mapPoint: (event: ReactPointerEvent<SVGElement>) => EditorMapPoint | null;
};

export const useTacticalEditorMarkerInteractionHandlers = ({
  mapPoint,
  selectPlacement,
  selectEnemy,
  selectFire,
  beginDrag,
  beginEnemyDrag,
}: UseTacticalEditorMarkerInteractionHandlersOptions) => {
  const handleBeginPlacementDrag = useCallback((placement: TacticalTerrainPlacement, event: ReactPointerEvent<SVGRectElement>) => {
    const point = mapPoint(event);
    if (!point) return;
    selectFire(null);
    selectPlacement(placement.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    beginDrag({
      id: placement.id,
      offset: {
        x: point.x - placement.origin.x,
        y: point.y - placement.origin.y,
      },
    });
  }, [beginDrag, mapPoint, selectFire, selectPlacement]);

  const handleSelectFire = useCallback((cell: GridPoint) => {
    selectPlacement(null);
    selectEnemy(null);
    selectFire(cell);
  }, [selectEnemy, selectFire, selectPlacement]);

  const handleBeginEnemyDrag = useCallback((enemy: TacticalEnemyPlacement, event: ReactPointerEvent<SVGGElement>) => {
    selectPlacement(null);
    selectFire(null);
    selectEnemy(enemy.id);
    const point = mapPoint(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    beginEnemyDrag({
      id: enemy.id,
      offset: {
        x: point.x - enemy.position.x,
        y: point.y - enemy.position.y,
      },
    });
  }, [beginEnemyDrag, mapPoint, selectEnemy, selectFire, selectPlacement]);

  return {
    handleBeginPlacementDrag,
    handleSelectFire,
    handleBeginEnemyDrag,
  };
};
