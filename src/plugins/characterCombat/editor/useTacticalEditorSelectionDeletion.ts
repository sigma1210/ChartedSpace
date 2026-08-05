type UseTacticalEditorSelectionDeletionOptions = {
  primaryTool: "select" | "node" | "hand";
  hasSelectedAreaAnchor: boolean;
  hasSelectedPlacement: boolean;
  hasSelectedEnemy: boolean;
  selectedEnemyLocked: boolean;
  hasSelectedNaturalTerrain: boolean;
  hasSelectedPrimitive: boolean;
  hasSelectedArea: boolean;
  hasSelectedLegacyRaisedArea: boolean;
  hasSelectedTerrainRegion: boolean;
  hasSelectedWall: boolean;
  hasSelectedPortal: boolean;
  hasSelectedElevationTransition: boolean;
  hasSelectedFire: boolean;
  deleteSelectedAreaAnchor: () => unknown;
  deleteSelectedPlacement: () => boolean;
  deleteSelectedEnemy: () => unknown;
  deleteSelectedNaturalTerrain: () => unknown;
  deleteSelectedPrimitive: () => boolean;
  deleteSelectedArea: () => unknown;
  deleteSelectedLegacyRaisedArea: () => unknown;
  deleteSelectedTerrainRegion: () => unknown;
  deleteSelectedWall: () => boolean;
  deleteSelectedPortal: () => boolean;
  deleteSelectedElevationTransition: () => boolean;
  deleteSelectedFire: () => boolean;
};

export const useTacticalEditorSelectionDeletion = ({
  primaryTool,
  hasSelectedAreaAnchor,
  hasSelectedPlacement,
  hasSelectedEnemy,
  selectedEnemyLocked,
  hasSelectedNaturalTerrain,
  hasSelectedPrimitive,
  hasSelectedArea,
  hasSelectedLegacyRaisedArea,
  hasSelectedTerrainRegion,
  hasSelectedWall,
  hasSelectedPortal,
  hasSelectedElevationTransition,
  hasSelectedFire,
  deleteSelectedAreaAnchor,
  deleteSelectedPlacement,
  deleteSelectedEnemy,
  deleteSelectedNaturalTerrain,
  deleteSelectedPrimitive,
  deleteSelectedArea,
  deleteSelectedLegacyRaisedArea,
  deleteSelectedTerrainRegion,
  deleteSelectedWall,
  deleteSelectedPortal,
  deleteSelectedElevationTransition,
  deleteSelectedFire,
}: UseTacticalEditorSelectionDeletionOptions) => {
  const deleteSelectionForKeyboard = (key: "Delete" | "Backspace") => {
    if (primaryTool === "node" && hasSelectedAreaAnchor) {
      deleteSelectedAreaAnchor();
      return true;
    }
    if (key !== "Delete" && !hasSelectedPlacement) return false;
    if (hasSelectedPlacement) return deleteSelectedPlacement();
    if (hasSelectedEnemy) {
      if (selectedEnemyLocked) return false;
      deleteSelectedEnemy();
    } else if (hasSelectedNaturalTerrain) {
      deleteSelectedNaturalTerrain();
    } else if (hasSelectedPrimitive) {
      return deleteSelectedPrimitive();
    } else if (hasSelectedArea) {
      deleteSelectedArea();
    } else if (hasSelectedLegacyRaisedArea) {
      deleteSelectedLegacyRaisedArea();
    } else if (hasSelectedTerrainRegion) {
      deleteSelectedTerrainRegion();
    } else if (hasSelectedWall) {
      return deleteSelectedWall();
    } else if (hasSelectedPortal) {
      return deleteSelectedPortal();
    } else if (hasSelectedElevationTransition) {
      return deleteSelectedElevationTransition();
    } else if (hasSelectedFire) {
      return deleteSelectedFire();
    } else {
      return false;
    }
    return true;
  };

  return { deleteSelectionForKeyboard };
};
