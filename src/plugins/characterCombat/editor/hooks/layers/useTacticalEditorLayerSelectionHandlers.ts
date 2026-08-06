"use client";

import { useCallback } from "react";
import type { TacticalEditorDraftPreviewProps } from "@/plugins/characterCombat/editor/lib/tacticalEditorDraftPreviewProps";

type LayerSelectionProps = Pick<TacticalEditorDraftPreviewProps,
  | "selectPlacement"
  | "selectEnemy"
  | "selectWall"
  | "selectRaisedArea"
  | "selectPrimitive"
  | "selectElevationTransition"
  | "selectPortal"
  | "selectFire"
>;

export const useTacticalEditorLayerSelectionHandlers = ({
  selectPlacement,
  selectEnemy,
  selectWall,
  selectRaisedArea,
  selectPrimitive,
  selectElevationTransition,
  selectPortal,
  selectFire,
}: LayerSelectionProps) => {
  const handleSelectElevationTransition = useCallback((id: string) => {
    selectPlacement(null);
    selectEnemy(null);
    selectWall(null);
    selectRaisedArea(null);
    selectPortal(null);
    selectFire(null);
    selectElevationTransition(id);
  }, [selectElevationTransition, selectEnemy, selectFire, selectPlacement, selectPortal, selectRaisedArea, selectWall]);

  const handleSelectPrimitive = useCallback((id: string) => {
    selectPlacement(null);
    selectEnemy(null);
    selectWall(null);
    selectRaisedArea(null);
    selectElevationTransition(null);
    selectPortal(null);
    selectFire(null);
    selectPrimitive(id);
  }, [selectElevationTransition, selectEnemy, selectFire, selectPlacement, selectPortal, selectPrimitive, selectRaisedArea, selectWall]);

  const handleSelectArea = useCallback((id: string) => {
    selectPlacement(null);
    selectEnemy(null);
    selectWall(null);
    selectPortal(null);
    selectFire(null);
    selectRaisedArea(id);
  }, [selectEnemy, selectFire, selectPlacement, selectPortal, selectRaisedArea, selectWall]);

  const handleSelectTerrainRegion = useCallback((id: string) => {
    selectPlacement(null);
    selectEnemy(null);
    selectWall(null);
    selectRaisedArea(null);
    selectElevationTransition(null);
    selectPortal(null);
    selectFire(null);
    selectRaisedArea(id);
  }, [selectElevationTransition, selectEnemy, selectFire, selectPlacement, selectPortal, selectRaisedArea, selectWall]);

  return {
    handleSelectElevationTransition,
    handleSelectPrimitive,
    handleSelectArea,
    handleSelectTerrainRegion,
  };
};
