"use client";

import type { TacticalScenarioDefinitionFile } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { tacticalEditorLayerKey } from "@/plugins/characterCombat/editor/tacticalEditorLayers";

type AreaAnchor = { areaId: string; anchorIndex: number };

type TacticalEditorPreviewSelectionOptions = {
  draft: TacticalScenarioDefinitionFile;
  lockedLayerKeys: ReadonlySet<string>;
  selectedAreaAnchor: AreaAnchor | null;
  selectTerrainPlacement: (id: string | null) => void;
  selectEnemy: (id: string | null) => void;
  setSelectedWallId: (id: string | null) => void;
  setSelectedRaisedAreaId: (id: string | null) => void;
  setSelectedAreaAnchor: (anchor: AreaAnchor | null) => void;
  setSelectedTerrainRegionId: (id: string | null) => void;
  setSelectedPrimitiveId: (id: string | null) => void;
  setSelectedNaturalTerrainId: (id: string | null) => void;
  setSelectedElevationTransitionId: (id: string | null) => void;
  setSelectedPortalId: (id: string | null) => void;
  selectTerrainPrimitive: (id: string | null) => void;
  selectNaturalTerrain: (id: string | null) => void;
  selectElevationTransition: (id: string | null) => void;
  selectFire: (point: { x: number; y: number } | null) => void;
  showAreaProperties: () => void;
  showObjectProperties: () => void;
};

export const useTacticalEditorPreviewSelection = ({
  draft,
  lockedLayerKeys,
  selectedAreaAnchor,
  selectTerrainPlacement,
  selectEnemy,
  setSelectedWallId,
  setSelectedRaisedAreaId,
  setSelectedAreaAnchor,
  setSelectedTerrainRegionId,
  setSelectedPrimitiveId,
  setSelectedNaturalTerrainId,
  setSelectedElevationTransitionId,
  setSelectedPortalId,
  selectTerrainPrimitive,
  selectNaturalTerrain,
  selectElevationTransition,
  selectFire,
  showAreaProperties,
  showObjectProperties,
}: TacticalEditorPreviewSelectionOptions) => {
  const previewSelectPlacement = (id: string | null) => {
    if (id && lockedLayerKeys.has(tacticalEditorLayerKey("terrain-placement", id))) return;
    selectTerrainPlacement(id);
  };
  const previewSelectEnemy = (id: string | null) => selectEnemy(id);
  const previewSelectWall = (id: string | null) => {
    if (id && lockedLayerKeys.has(tacticalEditorLayerKey("wall", id))) return;
    setSelectedWallId(id);
    if (!id) return;
    setSelectedRaisedAreaId(null);
    setSelectedPrimitiveId(null);
    setSelectedNaturalTerrainId(null);
    setSelectedElevationTransitionId(null);
    setSelectedPortalId(null);
  };
  const previewSelectRaisedArea = (id: string | null) => {
    if (!id || selectedAreaAnchor?.areaId !== id) setSelectedAreaAnchor(null);
    const kind = id && (draft.drawnAreas ?? []).some((area) => area.id === id)
      ? "area"
      : id && (draft.drawnTerrainRegions ?? []).some((region) => region.id === id)
        ? "terrain-region"
        : "raised-area";
    if (id && lockedLayerKeys.has(tacticalEditorLayerKey(kind, id))) return;
    setSelectedRaisedAreaId(id);
    setSelectedTerrainRegionId(id && kind === "terrain-region" ? id : null);
    if (id && kind === "area") showAreaProperties();
    if (id && kind === "terrain-region") showObjectProperties();
    if (!id) return;
    setSelectedWallId(null);
    setSelectedPrimitiveId(null);
    setSelectedNaturalTerrainId(null);
    setSelectedElevationTransitionId(null);
    setSelectedPortalId(null);
  };
  const previewSelectPrimitive = (id: string | null) => {
    if (id && lockedLayerKeys.has(tacticalEditorLayerKey("primitive", id))) return;
    selectTerrainPrimitive(id);
  };
  const previewSelectNaturalTerrain = (id: string | null) => {
    if (id && lockedLayerKeys.has(tacticalEditorLayerKey("natural-terrain", id))) return;
    selectNaturalTerrain(id);
  };
  const previewSelectPortal = (id: string | null) => {
    if (id && lockedLayerKeys.has(tacticalEditorLayerKey("portal", id))) return;
    setSelectedPortalId(id);
  };

  return {
    previewSelectPlacement,
    previewSelectEnemy,
    previewSelectWall,
    previewSelectRaisedArea,
    previewSelectAreaAnchor: setSelectedAreaAnchor,
    previewSelectPrimitive,
    previewSelectNaturalTerrain,
    previewSelectElevationTransition: selectElevationTransition,
    previewSelectPortal,
    previewSelectFire: selectFire,
  };
};
