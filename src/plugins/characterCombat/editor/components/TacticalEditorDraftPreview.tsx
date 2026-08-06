"use client";

import { useTacticalEditorAreaCells } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorAreaCells";
import { useTacticalEditorToolPreviews } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorToolPreviews";
import { useTacticalEditorElevationPreviews } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorElevationPreviews";
import { useTacticalEditorAreaDraftPreview } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorAreaDraftPreview";
import { useTacticalEditorCanvasNavigation } from "@/plugins/characterCombat/editor/hooks/canvas/useTacticalEditorCanvasNavigation";
import { useTacticalEditorPlacementControls } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorPlacementControls";
import { useTacticalEditorResolvedTerrain } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorResolvedTerrain";
import { useTacticalEditorDrawingDraftState } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorDrawingDraftState";
import { useTacticalEditorCanvasPointerDown } from "@/plugins/characterCombat/editor/hooks/canvas/useTacticalEditorCanvasPointerDown";
import { useTacticalEditorCanvasPointerMove } from "@/plugins/characterCombat/editor/hooks/canvas/useTacticalEditorCanvasPointerMove";
import { useTacticalEditorCanvasPointerUp } from "@/plugins/characterCombat/editor/hooks/canvas/useTacticalEditorCanvasPointerUp";
import { useTacticalEditorCanvasPointerCancel } from "@/plugins/characterCombat/editor/hooks/canvas/useTacticalEditorCanvasPointerCancel";
import { useTacticalEditorCanvasAuxiliaryEvents } from "@/plugins/characterCombat/editor/hooks/canvas/useTacticalEditorCanvasAuxiliaryEvents";
import { useTacticalEditorLayerSelectionHandlers } from "@/plugins/characterCombat/editor/hooks/layers/useTacticalEditorLayerSelectionHandlers";
import { useTacticalEditorObjectDragStartHandlers } from "@/plugins/characterCombat/editor/hooks/layers/useTacticalEditorObjectDragStartHandlers";
import { useTacticalEditorMarkerInteractionHandlers } from "@/plugins/characterCombat/editor/hooks/layers/useTacticalEditorMarkerInteractionHandlers";
import { useTacticalEditorLayerPointerHandlers } from "@/plugins/characterCombat/editor/hooks/layers/useTacticalEditorLayerPointerHandlers";
import { useTacticalEditorAreaControlHandlers } from "@/plugins/characterCombat/editor/hooks/layers/useTacticalEditorAreaControlHandlers";
import { useTacticalEditorMapCoordinates } from "@/plugins/characterCombat/editor/hooks/canvas/useTacticalEditorMapCoordinates";
import { useTacticalEditorViewport } from "@/plugins/characterCombat/editor/components/TacticalEditorViewport";
import TacticalEditorTerrainCellsLayer from "@/plugins/characterCombat/editor/components/TacticalEditorTerrainCellsLayer";
import TacticalEditorElevationLayer from "@/plugins/characterCombat/editor/components/TacticalEditorElevationLayer";
import TacticalEditorTracingTemplateLayer from "@/plugins/characterCombat/editor/components/TacticalEditorTracingTemplateLayer";
import TacticalEditorLegacyCircleLayer from "@/plugins/characterCombat/editor/components/TacticalEditorLegacyCircleLayer";
import TacticalEditorNaturalTerrainLayer from "@/plugins/characterCombat/editor/components/TacticalEditorNaturalTerrainLayer";
import TacticalEditorWallsLayer from "@/plugins/characterCombat/editor/components/TacticalEditorWallsLayer";
import TacticalEditorWallPortalsLayer from "@/plugins/characterCombat/editor/components/TacticalEditorWallPortalsLayer";
import TacticalEditorObjectsLayer from "@/plugins/characterCombat/editor/components/TacticalEditorObjectsLayer";
import TacticalEditorPlacementPreviewLayer from "@/plugins/characterCombat/editor/components/TacticalEditorPlacementPreviewLayer";
import {
  TacticalEditorBoundaryDraftPreview,
  TacticalEditorCircleDraftPreview,
  TacticalEditorRectangleDraftPreview,
} from "@/plugins/characterCombat/editor/components/TacticalEditorDrawingPreviewLayer";
import TacticalEditorAreaDraftLayer from "@/plugins/characterCombat/editor/components/TacticalEditorAreaDraftLayer";
import TacticalEditorRaisedAreasLayer from "@/plugins/characterCombat/editor/components/TacticalEditorRaisedAreasLayer";
import TacticalEditorTerrainRegionsLayer from "@/plugins/characterCombat/editor/components/TacticalEditorTerrainRegionsLayer";
import TacticalEditorDrawnAreasLayer from "@/plugins/characterCombat/editor/components/TacticalEditorDrawnAreasLayer";
import TacticalEditorScenarioMarkersLayer from "@/plugins/characterCombat/editor/components/TacticalEditorScenarioMarkersLayer";
import type { TacticalEditorDraftPreviewProps } from "@/plugins/characterCombat/editor/lib/tacticalEditorDraftPreviewProps";

const DraftPreview = ({ definition, handToolActive, nodeEditActive, selectedAreaAnchor, selectedPlacementId, selectedEnemyId, selectedWallId, selectedRaisedAreaId, selectedPrimitiveId, selectedNaturalTerrainId, selectedElevationTransitionId, selectedPortalId, selectedFire, placementKind, enemyKind, placementHover, enemyHover, portalHover, wallDraft, raisedAreaDraft, circleDraft, rampDraft, dragRaisedAreaControl, dragAreaAnchor, dragAreaCubicControl, dragConstrainedArea, dragCirclePrimitive, dragNaturalTerrain, dragWallEndpoint, dragWallMove, dragWallControl, dragWallPortal, dragTracingTemplate, tracingTemplateEditing, dragPlacement, dragEnemy, selectPlacement, selectEnemy, selectWall, selectRaisedArea, selectAreaAnchor, insertAreaAnchor, selectPrimitive, selectNaturalTerrain, selectElevationTransition, selectPortal, selectFire, hoverPlacement, hoverEnemy, hoverPortal, beginWall, updateWall, finishWall, finishWallInteraction, cancelWall, beginCircle, updateCircle, finishCircle, cancelCircle, beginCirclePrimitiveDrag, updateCirclePrimitiveDrag, finishCirclePrimitiveDrag, beginNaturalTerrainDrag, updateNaturalTerrainDrag, finishNaturalTerrainDrag, createRectangleArea, commitPenNode, closePenArea, hoverRaisedArea, beginOrFinishRamp, beginRaisedAreaControlDrag, reshapeRaisedAreaControl, finishRaisedAreaControlDrag, cancelRaisedAreaControlDrag, beginAreaAnchorDrag, moveAreaAnchor, finishAreaAnchorDrag, cancelAreaAnchorDrag, beginAreaCubicControlDrag, moveAreaCubicControl, finishAreaCubicControlDrag, cancelAreaCubicControlDrag, beginConstrainedAreaDrag, updateConstrainedAreaDrag, finishConstrainedAreaDrag, cancelConstrainedAreaDrag, placeWallPortal, beginWallEndpointDrag, resizeWallEndpoint, finishWallEndpointDrag, cancelWallEndpointDrag, beginWallMove, moveWall, finishWallMove, cancelWallMove, beginWallControlDrag, reshapeWallControl, finishWallControlDrag, cancelWallControlDrag, beginWallPortalDrag, moveWallPortal, finishWallPortalDrag, cancelWallPortalDrag, beginTracingTemplateDrag, transformTracingTemplate, finishTracingTemplateDrag, cancelTracingTemplateDrag, beginDrag, beginEnemyDrag, endDrag, placeTerrain, placeEnemy, moveTerrain, moveEnemy }: TacticalEditorDraftPreviewProps) => {
  const editorViewport = useTacticalEditorViewport();
  const {
    rectangleDraft,
    rectanglePreview,
    penNodeDrag,
    beginRectangle,
    moveRectangle,
    finishRectangle,
    beginPenNode,
    movePenNode,
    finishPenNode,
    cancelPenNode,
    cancelDrawingDrafts,
  } = useTacticalEditorDrawingDraftState(definition.map);
  const {
    previewRef,
    panDrag,
    setPanDrag,
    spacePressed,
  } = useTacticalEditorCanvasNavigation({
    panByPixels: editorViewport?.panByPixels,
    zoomAt: editorViewport?.zoomAt,
  });
  const resolved = useTacticalEditorResolvedTerrain(definition);
  const { drawnAreaCells, terrainRegionCells } = useTacticalEditorAreaCells(definition);
  const { placementPreview, portalPreview } = useTacticalEditorToolPreviews({
    definition,
    placementKind,
    placementHover,
    portalHover,
  });
  const {
    elevationTransitionKind,
    elevationEdgeCandidates,
    elevationEdgePreview,
    ladderMountPreview,
    rampPreview,
  } = useTacticalEditorElevationPreviews({
    definition,
    placementKind,
    placementHover,
    rampDraft,
  });
  const raisedAreaPreview = useTacticalEditorAreaDraftPreview({
    draft: raisedAreaDraft,
    penNodeDrag,
    map: definition.map,
  });
  const placementControls = useTacticalEditorPlacementControls(definition.terrainPlacements);

  const { mapPoint, mapVertex } = useTacticalEditorMapCoordinates({
    map: definition.map,
    raisedAreaDraft,
    placementKind,
    snapMode: editorViewport?.snapMode ?? "grid",
  });
  const handlePointerDown = useTacticalEditorCanvasPointerDown({
    handToolActive,
    placementKind,
    enemyKind,
    wallDraft,
    spacePressed,
    camera: editorViewport?.camera,
    setPanDrag,
    mapPoint,
    mapVertex,
    placeWallPortal,
    beginRectangle,
    beginPenNode,
    beginCircle,
    beginWall,
    finishWall,
    beginOrFinishRamp,
    placeEnemy,
    placeTerrain,
    selectPlacement,
    selectEnemy,
    selectWall,
    selectRaisedArea,
    selectPrimitive,
    selectNaturalTerrain,
    selectElevationTransition,
    selectPortal,
    selectFire,
  });
  const handlePointerMove = useTacticalEditorCanvasPointerMove({
    map: definition.map,
    panDrag,
    setCamera: editorViewport?.setCamera,
    rectangleDraft,
    penNodeDrag,
    placementKind,
    enemyKind,
    wallDraft,
    circleDraft,
    dragTracingTemplate,
    dragConstrainedArea,
    dragRaisedAreaControl,
    dragAreaAnchor,
    dragAreaCubicControl,
    dragCirclePrimitive,
    dragNaturalTerrain,
    dragWallControl,
    dragWallPortal,
    dragWallMove,
    dragWallEndpoint,
    dragEnemy,
    dragPlacement,
    mapPoint,
    mapVertex,
    moveRectangle,
    movePenNode,
    transformTracingTemplate,
    updateConstrainedAreaDrag,
    reshapeRaisedAreaControl,
    moveAreaAnchor,
    moveAreaCubicControl,
    updateCirclePrimitiveDrag,
    updateNaturalTerrainDrag,
    reshapeWallControl,
    moveWallPortal,
    moveWall,
    resizeWallEndpoint,
    updateWall,
    updateCircle,
    hoverRaisedArea,
    hoverPortal,
    moveEnemy,
    moveTerrain,
    hoverEnemy,
    hoverPlacement,
  });
  const handlePointerUp = useTacticalEditorCanvasPointerUp({
    panDrag,
    setPanDrag,
    rectangleDraft,
    penNodeDrag,
    wallDraft,
    circleDraft,
    dragTracingTemplate,
    dragConstrainedArea,
    dragRaisedAreaControl,
    dragAreaAnchor,
    dragAreaCubicControl,
    dragCirclePrimitive,
    dragNaturalTerrain,
    dragWallControl,
    dragWallPortal,
    dragWallMove,
    dragWallEndpoint,
    mapVertex,
    finishRectangle,
    finishPenNode,
    transformTracingTemplate,
    finishTracingTemplateDrag,
    updateConstrainedAreaDrag,
    finishConstrainedAreaDrag,
    reshapeRaisedAreaControl,
    finishRaisedAreaControlDrag,
    moveAreaAnchor,
    finishAreaAnchorDrag,
    moveAreaCubicControl,
    finishAreaCubicControlDrag,
    updateCirclePrimitiveDrag,
    finishCirclePrimitiveDrag,
    updateNaturalTerrainDrag,
    finishNaturalTerrainDrag,
    reshapeWallControl,
    finishWallControlDrag,
    moveWallPortal,
    finishWallPortalDrag,
    moveWall,
    finishWallMove,
    resizeWallEndpoint,
    finishWallEndpointDrag,
    finishWallInteraction,
    cancelWall,
    createRectangleArea,
    commitPenNode,
    finishCircle,
    cancelCircle,
    endDrag,
  });
  const handlePointerCancel = useTacticalEditorCanvasPointerCancel({
    setPanDrag,
    cancelDrawingDrafts,
    cancelTracingTemplateDrag,
    cancelConstrainedAreaDrag,
    cancelRaisedAreaControlDrag,
    cancelAreaAnchorDrag,
    cancelAreaCubicControlDrag,
    finishCirclePrimitiveDrag,
    finishNaturalTerrainDrag,
    cancelCircle,
    cancelWallControlDrag,
    cancelWallPortalDrag,
    cancelWallMove,
    cancelWallEndpointDrag,
    cancelWall,
    endDrag,
  });
  const { handlePointerLeave, handleDoubleClick } = useTacticalEditorCanvasAuxiliaryEvents({
    placementKind,
    raisedAreaDraft,
    hoverPlacement,
    hoverEnemy,
    hoverPortal,
    closePenArea,
    cancelPenNode,
  });
  const {
    handleSelectElevationTransition,
    handleSelectPrimitive,
    handleSelectArea,
    handleSelectTerrainRegion,
  } = useTacticalEditorLayerSelectionHandlers({
    selectPlacement,
    selectEnemy,
    selectWall,
    selectRaisedArea,
    selectPrimitive,
    selectElevationTransition,
    selectPortal,
    selectFire,
  });
  const {
    handleBeginNaturalTerrainPositionDrag,
    handleBeginNaturalTerrainRadiusDrag,
    handleBeginWallMove,
    handleBeginWallPortalDrag,
  } = useTacticalEditorObjectDragStartHandlers({
    mapVertex,
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
  });
  const {
    handleBeginPlacementDrag,
    handleSelectFire,
    handleBeginEnemyDrag,
  } = useTacticalEditorMarkerInteractionHandlers({
    mapPoint,
    selectPlacement,
    selectEnemy,
    selectFire,
    beginDrag,
    beginEnemyDrag,
  });
  const {
    handleBeginTracingTemplateDrag,
    handleInsertAreaAnchor,
  } = useTacticalEditorLayerPointerHandlers({
    beginTracingTemplateDrag,
    insertAreaAnchor,
  });
  const {
    handleBeginDrawnAreaControlDrag,
    handleBeginRaisedAreaControlDrag,
    handleBeginTerrainRegionControlDrag,
    handleBeginDraftControlDrag,
  } = useTacticalEditorAreaControlHandlers({ beginRaisedAreaControlDrag });
  if (!editorViewport) throw new Error("The tactical editor preview requires an editor viewport provider.");
  if (!resolved.terrain) return <div className="flex h-full items-center justify-center p-8 font-mono text-sm text-red-200">{resolved.error}</div>;
  const { terrain } = resolved;
  return <svg
    ref={previewRef}
    viewBox={`${editorViewport.viewBox.x} ${editorViewport.viewBox.y} ${editorViewport.viewBox.width} ${editorViewport.viewBox.height}`}
    preserveAspectRatio="xMidYMid meet"
    className={`h-full w-full touch-none bg-[#050a12] ${panDrag || spacePressed || handToolActive ? "cursor-grab" : placementKind || enemyKind ? "cursor-crosshair" : ""}`}
    aria-label="Scenario draft map preview"
    data-zoom-percent={editorViewport.zoomPercent}
    onPointerDown={handlePointerDown}
    onPointerMove={handlePointerMove}
    onPointerLeave={handlePointerLeave}
    onPointerUp={handlePointerUp}
    onDoubleClick={handleDoubleClick}
    onPointerCancel={handlePointerCancel}>
    <defs>
      <pattern id="draft-grid" width="1" height="1" patternUnits="userSpaceOnUse">
        <path d="M 1 0 L 0 0 0 1" fill="none" stroke="#29434d" strokeWidth="0.04" />
      </pattern>
    </defs>
    <TacticalEditorTracingTemplateLayer
      template={definition.tracingTemplate}
      editing={tracingTemplateEditing}
      interactionDisabled={Boolean(placementKind || enemyKind)}
      onBeginDrag={handleBeginTracingTemplateDrag}
    />
    <rect x="0" y="0" width={definition.map.width} height={definition.map.height} fill="url(#draft-grid)" />
    <TacticalEditorRectangleDraftPreview preview={rectanglePreview} />
    <TacticalEditorTerrainCellsLayer terrain={terrain} />
    <TacticalEditorElevationLayer
      terrain={terrain}
      selectedElevationTransitionId={selectedElevationTransitionId}
      interactionDisabled={Boolean(placementKind || enemyKind)}
      elevationTransitionKind={elevationTransitionKind}
      elevationEdgeCandidates={elevationEdgeCandidates}
      elevationEdgePreview={elevationEdgePreview}
      ladderMountPreview={ladderMountPreview}
      rampPreview={rampPreview}
      onSelectTransition={handleSelectElevationTransition}
    />
    <TacticalEditorCircleDraftPreview draft={circleDraft} />
    <TacticalEditorLegacyCircleLayer
      primitives={definition.drawnTerrainPrimitives ?? []}
      selectedPrimitiveId={selectedPrimitiveId}
      interactionDisabled={Boolean(placementKind || enemyKind)}
      onSelectPrimitive={handleSelectPrimitive}
      onBeginDrag={beginCirclePrimitiveDrag}
    />
    <TacticalEditorDrawnAreasLayer
      areas={definition.drawnAreas ?? []}
      cellsByArea={drawnAreaCells}
      selectedAreaId={selectedRaisedAreaId}
      selectedAreaAnchor={selectedAreaAnchor}
      nodeEditActive={nodeEditActive}
      interactionDisabled={Boolean(placementKind || enemyKind)}
      onSelect={handleSelectArea}
      onInsertAnchor={handleInsertAreaAnchor}
      onBeginQuadraticControlDrag={handleBeginDrawnAreaControlDrag}
      onBeginCubicControlDrag={beginAreaCubicControlDrag}
      onSelectAnchor={selectAreaAnchor}
      onBeginAnchorDrag={beginAreaAnchorDrag}
      onBeginConstrainedDrag={beginConstrainedAreaDrag}
    />
    <TacticalEditorRaisedAreasLayer
      areas={definition.drawnRaisedAreas ?? []}
      levels={terrain.drawnRaisedAreaLevels}
      selectedAreaId={selectedRaisedAreaId}
      interactionDisabled={Boolean(placementKind || enemyKind)}
      onSelect={handleSelectArea}
      onBeginControlDrag={handleBeginRaisedAreaControlDrag}
    />
    <TacticalEditorTerrainRegionsLayer
      regions={definition.drawnTerrainRegions ?? []}
      cellsByRegion={terrainRegionCells}
      selectedRegionId={selectedRaisedAreaId}
      interactionDisabled={Boolean(placementKind || enemyKind)}
      onSelect={handleSelectTerrainRegion}
      onBeginControlDrag={handleBeginTerrainRegionControlDrag}
    />
    <TacticalEditorNaturalTerrainLayer
      placements={definition.naturalTerrainPlacements ?? []}
      map={definition.map}
      selectedNaturalTerrainId={selectedNaturalTerrainId}
      interactionDisabled={Boolean(placementKind || enemyKind)}
      onBeginPositionDrag={handleBeginNaturalTerrainPositionDrag}
      onBeginRadiusDrag={handleBeginNaturalTerrainRadiusDrag}
    />
    <TacticalEditorWallsLayer
      resolvedWalls={terrain.walls}
      drawnWalls={definition.drawnWalls ?? []}
      circlePrimitives={definition.drawnTerrainPrimitives ?? []}
      selectedWallId={selectedWallId}
      interactionDisabled={Boolean(placementKind || enemyKind)}
      onBeginMove={handleBeginWallMove}
      onBeginControlDrag={beginWallControlDrag}
      onBeginEndpointDrag={beginWallEndpointDrag}
    />
    <TacticalEditorWallPortalsLayer
      doors={terrain.doors}
      drawnWalls={definition.drawnWalls ?? []}
      drawnAreas={definition.drawnAreas ?? []}
      circlePrimitives={definition.drawnTerrainPrimitives ?? []}
      selectedPortalId={selectedPortalId}
      interactionDisabled={Boolean(placementKind || enemyKind)}
      onBeginPortalDrag={handleBeginWallPortalDrag}
    />
    <TacticalEditorObjectsLayer objects={terrain.terrainObjects} />
    <TacticalEditorPlacementPreviewLayer preview={placementPreview} />
    <TacticalEditorBoundaryDraftPreview portal={portalPreview} wall={wallDraft} />
    <TacticalEditorAreaDraftLayer
      draft={raisedAreaDraft}
      preview={raisedAreaPreview}
      penNodeDrag={penNodeDrag}
      onBeginControlDrag={handleBeginDraftControlDrag}
    />
    <TacticalEditorScenarioMarkersLayer
      placementControls={placementControls}
      fireCells={definition.fireCells}
      enemies={definition.enemyPlacements ?? []}
      enemyHover={enemyHover}
      enemyPreviewActive={Boolean(enemyKind)}
      selectedPlacementId={selectedPlacementId}
      selectedEnemyId={selectedEnemyId}
      selectedFire={selectedFire}
      interactionDisabled={Boolean(placementKind || enemyKind)}
      onBeginPlacementDrag={handleBeginPlacementDrag}
      onSelectFire={handleSelectFire}
      onBeginEnemyDrag={handleBeginEnemyDrag}
    />
  </svg>;
};

export default DraftPreview;
