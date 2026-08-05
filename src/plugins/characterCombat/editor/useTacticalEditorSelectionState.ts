import type { TacticalScenarioDefinitionFile } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectTacticalEditorAreaAnchor,
  selectTacticalEditorLayerKey,
  selectTacticalEditorOperationId,
  selectTacticalEditorSelection,
} from "@/plugins/characterCombat/editor/state/selectors";
import {
  editorAreaAnchorSelected,
  editorOperationSelected,
  editorSelectionChanged,
  editorSelectionKindCleared,
  type TacticalEditorSelection,
  type TacticalEditorSelectionKind,
} from "@/plugins/characterCombat/editor/state/tacticalEditorSlice";

export const useTacticalEditorSelectionState = (draft: TacticalScenarioDefinitionFile) => {
  const dispatch = useAppDispatch();
  const selection = useAppSelector(selectTacticalEditorSelection);
  const selectedAreaAnchor = useAppSelector(selectTacticalEditorAreaAnchor);
  const selectedOperationId = useAppSelector(selectTacticalEditorOperationId);
  const selectedLayerKey = useAppSelector(selectTacticalEditorLayerKey);

  const selectedPlacementId = selection?.kind === "terrain-placement" ? selection.id : null;
  const selectedEnemyId = selection?.kind === "enemy" ? selection.id : null;
  const selectedWallId = selection?.kind === "wall" ? selection.id : null;
  const selectedRaisedAreaId = selection?.kind === "area"
    || selection?.kind === "legacy-raised-area"
    || selection?.kind === "legacy-terrain-region"
    ? selection.id
    : null;
  const selectedTerrainRegionId = selection?.kind === "legacy-terrain-region" ? selection.id : null;
  const selectedPrimitiveId = selection?.kind === "legacy-circle" ? selection.id : null;
  const selectedNaturalTerrainId = selection?.kind === "natural-terrain" ? selection.id : null;
  const selectedElevationTransitionId = selection?.kind === "elevation-transition" ? selection.id : null;
  const selectedPortalId = selection?.kind === "portal" ? selection.id : null;
  const selectedFire = selection?.kind === "fire" ? selection.position : null;

  const selectObject = (next: TacticalEditorSelection) => dispatch(editorSelectionChanged(next));
  const clearObjectKind = (kind: TacticalEditorSelectionKind) => {
    dispatch(editorSelectionKindCleared(kind));
  };
  const setSelectedPlacementId = (id: string | null) => id
    ? selectObject({ kind: "terrain-placement", id })
    : clearObjectKind("terrain-placement");
  const setSelectedOperationId = (id: string | null) => dispatch(editorOperationSelected(id));
  const setSelectedEnemyId = (id: string | null) => id
    ? selectObject({ kind: "enemy", id })
    : clearObjectKind("enemy");
  const setSelectedWallId = (id: string | null) => id
    ? selectObject({ kind: "wall", id })
    : clearObjectKind("wall");
  const setSelectedRaisedAreaId = (id: string | null) => {
    if (!id) {
      clearObjectKind("area");
      clearObjectKind("legacy-raised-area");
      clearObjectKind("legacy-terrain-region");
      return;
    }
    const kind = (draft.drawnTerrainRegions ?? []).some((region) => region.id === id)
      ? "legacy-terrain-region"
      : (draft.drawnRaisedAreas ?? []).some((area) => area.id === id)
        ? "legacy-raised-area"
        : "area";
    selectObject({ kind, id });
  };
  const setSelectedAreaAnchor = (
    anchor: { areaId: string; anchorIndex: number } | null,
  ) => dispatch(editorAreaAnchorSelected(anchor));
  const setSelectedTerrainRegionId = (id: string | null) => id
    ? selectObject({ kind: "legacy-terrain-region", id })
    : clearObjectKind("legacy-terrain-region");
  const setSelectedPrimitiveId = (id: string | null) => id
    ? selectObject({ kind: "legacy-circle", id })
    : clearObjectKind("legacy-circle");
  const setSelectedNaturalTerrainId = (id: string | null) => id
    ? selectObject({ kind: "natural-terrain", id })
    : clearObjectKind("natural-terrain");
  const setSelectedElevationTransitionId = (id: string | null) => id
    ? selectObject({ kind: "elevation-transition", id })
    : clearObjectKind("elevation-transition");
  const setSelectedPortalId = (id: string | null) => id
    ? selectObject({ kind: "portal", id })
    : clearObjectKind("portal");
  const setSelectedFire = (position: { x: number; y: number } | null) => position
    ? selectObject({ kind: "fire", position })
    : clearObjectKind("fire");

  return {
    selectedAreaAnchor,
    selectedOperationId,
    selectedLayerKey,
    selectedPlacementId,
    selectedEnemyId,
    selectedWallId,
    selectedRaisedAreaId,
    selectedTerrainRegionId,
    selectedPrimitiveId,
    selectedNaturalTerrainId,
    selectedElevationTransitionId,
    selectedPortalId,
    selectedFire,
    setSelectedPlacementId,
    setSelectedOperationId,
    setSelectedEnemyId,
    setSelectedWallId,
    setSelectedRaisedAreaId,
    setSelectedAreaAnchor,
    setSelectedTerrainRegionId,
    setSelectedPrimitiveId,
    setSelectedNaturalTerrainId,
    setSelectedElevationTransitionId,
    setSelectedPortalId,
    setSelectedFire,
  };
};
