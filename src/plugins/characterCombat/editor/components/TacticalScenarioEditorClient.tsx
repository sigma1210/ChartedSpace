"use client";

import type { ComponentType } from "react";
import { Provider } from "react-redux";
import { PluginHudLayer } from "@/components/hud/PluginHudLayer";
import { TacticalNavigationHud } from "@/plugins/characterCombat/TacticalNavigationHud";
import type { TacticalScenarioDefinitionFile } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { TacticalConsoleVictoryDefinitionFile } from "@/plugins/characterCombat/tacticalConsoleVictory";
import { tacticalNaturalTerrainFootprintCells } from "@/plugins/characterCombat/tacticalNaturalTerrain";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectTacticalEditorHiddenLayerKeys,
  selectTacticalEditorLockedLayerKeys,
  selectTacticalEditorTemplates,
} from "@/plugins/characterCombat/editor/redux/selectors";
import {
  editorHiddenLayerToggled,
  editorLayerUnlocked,
  editorLockedLayerToggled,
} from "@/plugins/characterCombat/editor/redux/tacticalEditorSlice";
import { TacticalEditorViewportProvider } from "@/plugins/characterCombat/editor/components/TacticalEditorViewport";
import {
  tacticalEditorLayerKey,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorLayers";
import {
  useTacticalEditorInteractionState,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorInteractionState";
import { useTacticalEditorKeyboard } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorKeyboard";
import { useTacticalEditorFileCommands } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorFileCommands";
import { useTacticalEditorResourceIndexes } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorResourceIndexes";
import { useTacticalEditorSessionLifecycle } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorSessionLifecycle";
import { useTacticalEditorTracingTemplate } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorTracingTemplate";
import { useTacticalEditorEnemies } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorEnemies";
import { useTacticalEditorElevationTransitions } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorElevationTransitions";
import { useTacticalEditorFire } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorFire";
import { useTacticalEditorNaturalTerrain } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorNaturalTerrain";
import { useTacticalEditorTerrainPlacements } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorTerrainPlacements";
import { useTacticalEditorAreas } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorAreas";
import { useTacticalEditorAreaDrawing } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorAreaDrawing";
import { useTacticalEditorAreaCurveControls } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorAreaCurveControls";
import { useTacticalEditorWallDrawing } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorWallDrawing";
import { useTacticalEditorWallEditing } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorWallEditing";
import { useTacticalEditorWallPortals } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorWallPortals";
import { useTacticalEditorCirclePrimitives } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorCirclePrimitives";
import { useTacticalEditorInteractionOperations } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorInteractionOperations";
import { useTacticalEditorInteractionPlacement } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorInteractionPlacement";
import { useTacticalEditorSelectionDeletion } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorSelectionDeletion";
import { useTacticalEditorLayerSelection } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorLayerSelection";
import { useTacticalEditorToolActivation } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorToolActivation";
import { useTacticalEditorSelectionState } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorSelectionState";
import { useTacticalEditorHudLayoutState } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorHudLayoutState";
import { useTacticalEditorToolState } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorToolState";
import { useTacticalEditorDocumentState } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorDocumentState";
import { useTacticalEditorFileState } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorFileState";
import { useTacticalEditorScenarioProperties } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorScenarioProperties";
import { useTacticalEditorValidation } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorValidation";
import { useTacticalEditorPlaytest } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorPlaytest";
import { useTacticalEditorLayerPresentation } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorLayerPresentation";
import TacticalEditorDraftPreview from "@/plugins/characterCombat/editor/components/TacticalEditorDraftPreview";
import TacticalEditorAreaPropertiesHud from "@/plugins/characterCombat/editor/components/TacticalEditorAreaPropertiesHud";
import TacticalEditorWallPropertiesHud from "@/plugins/characterCombat/editor/components/TacticalEditorWallPropertiesHud";
import TacticalEditorEnemyHud from "@/plugins/characterCombat/editor/components/TacticalEditorEnemyHud";
import TacticalEditorEnemyPaletteHud from "@/plugins/characterCombat/editor/components/TacticalEditorEnemyPaletteHud";
import TacticalEditorInteractionHud from "@/plugins/characterCombat/editor/components/TacticalEditorInteractionHud";
import TacticalEditorDocumentControls from "@/plugins/characterCombat/editor/components/TacticalEditorDocumentControls";
import TacticalEditorLayersHud from "@/plugins/characterCombat/editor/components/TacticalEditorLayersHud";
import TacticalEditorDrawingPrecisionControl from "@/plugins/characterCombat/editor/components/TacticalEditorDrawingPrecisionControl";
import { useTacticalEditorDraftCommands } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorDraftCommands";
import { useTacticalEditorTerrainPlacementRouter } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorTerrainPlacementRouter";
import { useTacticalEditorPreviewSelection } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorPreviewSelection";
import { useTacticalEditorPreviewDragGuards } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorPreviewDragGuards";
import { useTacticalEditorPreviewDragCompletion } from "@/plugins/characterCombat/editor/hooks/useTacticalEditorPreviewDragCompletion";
import TacticalEditorLegacyCircleHud from "@/plugins/characterCombat/editor/components/TacticalEditorLegacyCircleHud";
import TacticalEditorObjectPropertiesHud from "@/plugins/characterCombat/editor/components/TacticalEditorObjectPropertiesHud";
import TacticalEditorToolsHud from "@/plugins/characterCombat/editor/components/TacticalEditorToolsHud";
import TacticalEditorTracingTemplateHud from "@/plugins/characterCombat/editor/components/TacticalEditorTracingTemplateHud";
import {
  CIRCLE_TOOL_ID,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

export interface TacticalEditorPlaytestProps {
  draftPlaytest?: {
    definition: TacticalScenarioDefinitionFile;
    consoleVictory: TacticalConsoleVictoryDefinitionFile;
    onExit: () => void;
  };
}

const TacticalScenarioEditorClient = ({ PlaytestComponent }: {
  PlaytestComponent: ComponentType<TacticalEditorPlaytestProps>;
}) => {
  const dispatch = useAppDispatch();
  const {
    primaryTool,
    placementKind,
    enemyKind,
    circleTerrainType,
    openToolGroup,
    setPlacementKind,
    setEnemyKind,
    setPrimaryTool,
    setCircleTerrainType,
    toggleToolGroup,
    closeToolGroup,
  } = useTacticalEditorToolState();
  const hiddenLayerKeys = useAppSelector(selectTacticalEditorHiddenLayerKeys);
  const lockedLayerKeys = useAppSelector(selectTacticalEditorLockedLayerKeys);
  const templateWorkflow = useAppSelector(selectTacticalEditorTemplates);
  const availableTemplates = templateWorkflow.assets;
  const templateBusy = templateWorkflow.operation !== "idle";
  const templateMessage = templateWorkflow.message;
  const {
    draft,
    consoleVictory,
    dirty,
    setDraft,
    setConsoleVictory,
    removePlacementConsoleOperations,
  } = useTacticalEditorDocumentState();
  const {
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
  } = useTacticalEditorSelectionState(draft);
  const {
    currentScenario,
    availableScenarios,
    scenarioListBusy,
    fileBusy,
    fileMessage,
    openHeaderMenu,
    openScenarioDialog,
    scenarioPropertiesDraft,
    scenarioPropertiesError,
    newScenarioDialogOpen,
    newScenarioName,
    saveAsDialogOpen,
    saveAsName,
    scenarioSearchQuery,
    scenarioToLoad,
    filteredScenarios,
    toggleHeaderMenu,
    closeHeaderMenu,
    openNewScenarioDialog,
    openScenarioFileDialog,
    openSaveAsDialog,
    openScenarioPropertiesDialog,
    closeFileDialog,
    changeScenarioSearch,
    selectScenarioToLoad,
    changeScenarioName,
    changeScenarioProperties,
    rejectScenarioProperties,
    changeFileMessage,
  } = useTacticalEditorFileState();
  const {
    placementHover, setPlacementHover,
    enemyHover, setEnemyHover,
    portalHover, setPortalHover,
    wallDraft, setWallDraft,
    raisedAreaDraft, setRaisedAreaDraft,
    circleDraft, setCircleDraft,
    rampDraft, setRampDraft,
    dragRaisedAreaControl, setDragRaisedAreaControl,
    dragAreaAnchor, setDragAreaAnchor,
    dragAreaCubicControl, setDragAreaCubicControl,
    dragConstrainedArea, setDragConstrainedArea,
    dragCirclePrimitive, setDragCirclePrimitive,
    dragNaturalTerrain, setDragNaturalTerrain,
    dragWallEndpoint, setDragWallEndpoint,
    dragWallMove, setDragWallMove,
    dragWallControl, setDragWallControl,
    dragWallPortal, setDragWallPortal,
    dragTracingTemplate, setDragTracingTemplate,
    tracingTemplateEditing, setTracingTemplateEditing,
    dragPlacement, setDragPlacement,
    dragEnemy, setDragEnemy,
    placementError, setPlacementError,
    clearInteractionState,
  } = useTacticalEditorInteractionState();
  const {
    hudLayoutsReady,
    circlePropertiesLayout,
    enemyPaletteLayout,
    consoleEditorLayout,
    enemyEditorLayout,
    navigationLayout,
    tracingTemplateLayout,
    toolsLayout,
    layersLayout,
    areaPropertiesLayout,
    wallPropertiesLayout,
    objectPropertiesLayout,
    setCirclePropertiesLayout,
    setConsoleEditorLayout,
    setEnemyEditorLayout,
    setAreaPropertiesLayout,
    setWallPropertiesLayout,
    setObjectPropertiesLayout,
    persistCirclePropertiesLayout,
    persistEnemyPaletteLayout,
    persistConsoleEditorLayout,
    persistEnemyEditorLayout,
    persistNavigationLayout,
    persistTracingTemplateLayout,
    persistToolsLayout,
    persistLayersLayout,
    persistAreaPropertiesLayout,
    persistWallPropertiesLayout,
    persistObjectPropertiesLayout,
    toggleHudVisibility,
  } = useTacticalEditorHudLayoutState();
  const {
    selectedEnemy,
    selectedEnemyLocked,
    placeEnemy,
    moveEnemy,
    selectEnemy,
    updateSelectedEnemyName,
    rotateSelectedEnemy,
    deleteSelectedEnemy,
  } = useTacticalEditorEnemies({
    draft,
    setDraft,
    activeEnemyType: enemyKind,
    selectedEnemyId,
    lockedLayerKeys,
    setSelectedPlacementId,
    setSelectedEnemyId,
    setSelectedFire,
    setPlacementError,
    showEnemyEditor: () => setEnemyEditorLayout((current) => ({ ...current, visible: true })),
  });
  const {
    selectedNaturalTerrain,
    placeNaturalTerrain,
    selectNaturalTerrain,
    beginNaturalTerrainDrag,
    updateNaturalTerrainDrag,
    finishNaturalTerrainDrag,
    updateSelectedNaturalTerrainRadius,
    deleteSelectedNaturalTerrain,
  } = useTacticalEditorNaturalTerrain({
    draft,
    setDraft,
    activeDrawingTool: placementKind,
    selectedNaturalTerrainId,
    dragNaturalTerrain,
    setSelectedNaturalTerrainId,
    setSelectedPlacementId,
    setSelectedEnemyId,
    setDragNaturalTerrain,
    setPlacementError,
    showObjectProperties: () => setObjectPropertiesLayout((current) => ({
      ...current,
      visible: true,
    })),
  });
  const {
    placeFire,
    selectFire,
    deleteSelectedFire,
  } = useTacticalEditorFire({
    draft,
    setDraft,
    activeDrawingTool: placementKind,
    selectedFire,
    lockedLayerKeys,
    setSelectedFire,
    setPlacementError,
  });
  const {
    selectedElevationTransition,
    placeElevationTransition,
    beginOrFinishRamp,
    cancelRampDrawing,
    selectElevationTransition,
    deleteSelectedElevationTransition,
  } = useTacticalEditorElevationTransitions({
    draft,
    setDraft,
    activeDrawingTool: placementKind,
    rampDraft,
    selectedElevationTransitionId,
    lockedLayerKeys,
    setRampDraft,
    setPlacementHover,
    setSelectedElevationTransitionId,
    clearOtherSelections: () => {
      setSelectedPlacementId(null);
      setSelectedEnemyId(null);
      setSelectedWallId(null);
      setSelectedRaisedAreaId(null);
      setSelectedPortalId(null);
      setSelectedFire(null);
    },
    setPlacementError,
  });
  useTacticalEditorSessionLifecycle();
  const { refreshScenarioList } = useTacticalEditorResourceIndexes();
  const {
    selectTracingTemplate,
    uploadTracingTemplate,
    toggleTracingTemplateEditing,
    updateTracingTemplateFromHud,
    removeTracingTemplate,
    updateTracingTemplateNumber,
    resetTracingTemplateFit,
    beginTracingTemplateDrag,
    transformTracingTemplate,
    finishTracingTemplateDrag,
    cancelTracingTemplateDrag,
  } = useTacticalEditorTracingTemplate({
    dragTracingTemplate,
    setDragTracingTemplate,
    tracingTemplateEditing,
    setTracingTemplateEditing,
    setPlacementError,
    clearDrawingTool: () => setPlacementKind(null),
    clearEnemyTool: () => setEnemyKind(null),
    clearWallDraft: () => setWallDraft(null),
    clearPlacementHover: () => setPlacementHover(null),
    clearEnemyHover: () => setEnemyHover(null),
  });
  const {
    resolutionError,
    victoryTaskRequired,
    draftBlocked,
    playtestBlocked,
    editorIssues,
  } = useTacticalEditorValidation(draft, consoleVictory, placementError);
  const {
    playtest,
    canBeginPlaytest,
    beginPlaytest,
    exitPlaytest,
  } = useTacticalEditorPlaytest(draft, consoleVictory, playtestBlocked);
  const { updateDimension, applyScenarioProperties } = useTacticalEditorScenarioProperties({
    draft,
    propertiesDraft: scenarioPropertiesDraft,
    setDraft,
    closeFileDialog,
    rejectScenarioProperties,
    setPlacementError,
  });
  const {
    beginWall,
    updateWall,
    finishWall,
    finishWallInteraction,
    cancelWall,
  } = useTacticalEditorWallDrawing({
    draft,
    setDraft,
    activeDrawingTool: placementKind,
    wallDraft,
    setWallDraft,
    setSelectedWallId,
    clearOtherSelections: () => {
      setSelectedPlacementId(null);
      setSelectedEnemyId(null);
      setSelectedFire(null);
    },
    showWallProperties: () => setWallPropertiesLayout((current) => ({ ...current, visible: true })),
    setPlacementError,
  });
  const {
    createRectangleArea,
    createCircleArea,
    closePenArea,
    commitPenNode,
    hoverRaisedArea,
    undoPenAreaNode,
    cancelPenArea,
  } = useTacticalEditorAreaDrawing({
    draft,
    setDraft,
    activeDrawingTool: placementKind,
    areaDraft: raisedAreaDraft,
    setAreaDraft: setRaisedAreaDraft,
    setSelectedAreaId: setSelectedRaisedAreaId,
    setSelectedTerrainRegionId,
    clearDrawingTool: () => setPlacementKind(null),
    clearSelections: () => {
      setSelectedPlacementId(null);
      setSelectedEnemyId(null);
      setSelectedWallId(null);
      setSelectedRaisedAreaId(null);
      setSelectedTerrainRegionId(null);
      setSelectedPrimitiveId(null);
      setSelectedNaturalTerrainId(null);
      setSelectedPortalId(null);
      setSelectedFire(null);
    },
    clearRaisedAreaControlDrag: () => setDragRaisedAreaControl(null),
    showAreaProperties: () => setAreaPropertiesLayout((current) => ({ ...current, visible: true })),
    setPlacementError,
  });
  const {
    selectedPrimitive,
    beginCircle,
    updateCircle,
    finishCircle,
    cancelCircleDrawing,
    selectTerrainPrimitive,
    beginCirclePrimitiveDrag,
    updateCirclePrimitiveDrag,
    finishCirclePrimitiveDrag,
    updateSelectedPrimitive,
    changeLegacyCircleTerrainType,
    deleteSelectedPrimitive,
  } = useTacticalEditorCirclePrimitives({
    draft,
    setDraft,
    activeDrawingTool: placementKind,
    creationTerrainType: circleTerrainType,
    circleDraft,
    dragCirclePrimitive,
    selectedPrimitiveId,
    setCircleDraft,
    setDragCirclePrimitive,
    setSelectedPrimitiveId,
    setCreationTerrainType: setCircleTerrainType,
    clearDrawingTool: () => setPlacementKind(null),
    clearSelections: () => {
      setSelectedPlacementId(null);
      setSelectedEnemyId(null);
      setSelectedWallId(null);
      setSelectedRaisedAreaId(null);
      setSelectedAreaAnchor(null);
      setSelectedTerrainRegionId(null);
      setSelectedPrimitiveId(null);
      setSelectedElevationTransitionId(null);
      setSelectedPortalId(null);
      setSelectedFire(null);
    },
    createCircleArea,
    showCircleProperties: () => setCirclePropertiesLayout((current) => ({ ...current, visible: true })),
    setPlacementError,
  });
  const {
    selectedArea,
    selectedLegacyRaisedArea,
    selectedTerrainRegion,
    insertCompletedAreaAnchor,
    deleteSelectedAreaAnchor,
    beginAreaAnchorDrag,
    moveAreaAnchor,
    cancelAreaAnchorDrag,
    beginAreaCubicControlDrag,
    moveAreaCubicControl,
    cancelAreaCubicControlDrag,
    beginConstrainedAreaDrag,
    updateConstrainedAreaDrag,
    cancelConstrainedAreaDrag,
    updateSelectedArea,
    deleteSelectedArea,
    deleteSelectedLegacyRaisedArea,
    updateSelectedTerrainRegionFilled,
    deleteSelectedTerrainRegion,
  } = useTacticalEditorAreas({
    draft,
    setDraft,
    selectedAreaId: selectedRaisedAreaId,
    selectedTerrainRegionId,
    selectedAreaAnchor,
    dragAreaAnchor,
    dragAreaCubicControl,
    dragConstrainedArea,
    setSelectedAreaId: setSelectedRaisedAreaId,
    setSelectedTerrainRegionId,
    setSelectedAreaAnchor,
    setDragAreaAnchor,
    setDragAreaCubicControl,
    setDragConstrainedArea,
    clearRaisedAreaControlDrag: () => setDragRaisedAreaControl(null),
    setPlacementError,
  });
  const {
    beginRaisedAreaControlDrag,
    reshapeRaisedAreaControl,
    finishRaisedAreaControlDrag,
    cancelRaisedAreaControlDrag,
  } = useTacticalEditorAreaCurveControls({
    draft,
    setDraft,
    areaDraft: raisedAreaDraft,
    setAreaDraft: setRaisedAreaDraft,
    drag: dragRaisedAreaControl,
    setDrag: setDragRaisedAreaControl,
    clearAreaAnchorDrag: () => setDragAreaAnchor(null),
    clearAreaCubicControlDrag: () => setDragAreaCubicControl(null),
    clearConstrainedAreaDrag: () => setDragConstrainedArea(null),
    setPlacementError,
  });
  const {
    selectedWall,
    updateSelectedWall,
    beginWallEndpointDrag,
    resizeWallEndpoint,
    finishWallEndpointDrag,
    cancelWallEndpointDrag,
    beginWallMove,
    moveWall,
    finishWallMove,
    cancelWallMove,
    beginWallControlDrag,
    reshapeWallControl,
    finishWallControlDrag,
    cancelWallControlDrag,
    deleteSelectedWall,
  } = useTacticalEditorWallEditing({
    draft,
    setDraft,
    selectedWallId,
    dragWallEndpoint,
    dragWallMove,
    dragWallControl,
    setSelectedWallId,
    setSelectedPortalId,
    setDragWallEndpoint,
    setDragWallMove,
    setDragWallControl,
    setPlacementError,
  });
  const {
    selectedPortal,
    placeWallPortal,
    beginWallPortalDrag,
    moveWallPortal,
    finishWallPortalDrag,
    cancelWallPortalDrag,
    deleteSelectedPortal,
  } = useTacticalEditorWallPortals({
    draft,
    setDraft,
    activeDrawingTool: placementKind,
    selectedPortalId,
    dragWallPortal,
    setSelectedPlacementId,
    setSelectedEnemyId,
    setSelectedWallId,
    setSelectedAreaId: setSelectedRaisedAreaId,
    setSelectedPrimitiveId,
    setSelectedPortalId,
    setSelectedFire,
    setDragWallPortal,
    setPlacementError,
  });
  const {
    selectedPlacement,
    selectedIsLiquidHydrogen,
    updatePlacements,
    placeOrdinaryTerrain,
    moveTerrain,
    selectTerrainPlacement,
    rotateSelectedPlacement,
    updateSelectedLiquidHydrogen,
    deleteSelectedPlacement,
  } = useTacticalEditorTerrainPlacements({
    draft,
    setDraft,
    activeDrawingTool: placementKind,
    selectedPlacementId,
    consoleOperations: consoleVictory.operations,
    setSelectedPlacementId,
    setSelectedEnemyId,
    setSelectedOperationId,
    removePlacementConsoleOperations,
    showConsoleEditor: () => setConsoleEditorLayout((current) => ({
      ...current,
      visible: true,
    })),
    setPlacementError,
  });
  const placeTerrain = useTacticalEditorTerrainPlacementRouter({
    activeDrawingTool: placementKind,
    placeElevationTransition,
    placeFire,
    placeNaturalTerrain,
    placeOrdinaryTerrain,
  });
  const editableObjectProperties = Boolean(selectedNaturalTerrain || selectedTerrainRegion?.kind === "liquid-hydrogen");
  const {
    selectedHasTerminal,
    selectedIsInteractiveHuman,
    selectedHumanCombatProfile,
    updateSelectedTerminal,
    updateSelectedHumanCombatProfile,
  } = useTacticalEditorInteractionPlacement({
    placements: draft.terrainPlacements,
    selectedPlacement,
    updatePlacements,
  });
  const {
    layerGroups,
    previewDefinition,
    moveEditorLayerObject,
  } = useTacticalEditorLayerPresentation(draft, hiddenLayerKeys, setDraft);
  const {
    selectedConsoleOperations,
    selectedOperation,
    addConsoleOperation,
    updateConsoleOperation,
    deleteSelectedOperation,
    updateConsoleOperationResult,
    toggleConsoleOperationPrerequisite,
    toggleConsoleOperationUnlock,
  } = useTacticalEditorInteractionOperations({
    consoleVictory,
    setConsoleVictory,
    selectedPlacement,
    selectedPlacementSupportsOperations: selectedHasTerminal,
    selectedOperationId,
    setSelectedOperationId,
  });
  const { deleteSelectionForKeyboard } = useTacticalEditorSelectionDeletion({
    primaryTool,
    hasSelectedAreaAnchor: Boolean(selectedAreaAnchor),
    hasSelectedPlacement: Boolean(selectedPlacement),
    hasSelectedEnemy: Boolean(selectedEnemy),
    selectedEnemyLocked,
    hasSelectedNaturalTerrain: Boolean(selectedNaturalTerrain),
    hasSelectedPrimitive: Boolean(selectedPrimitive),
    hasSelectedArea: Boolean(selectedArea),
    hasSelectedLegacyRaisedArea: Boolean(selectedLegacyRaisedArea),
    hasSelectedTerrainRegion: Boolean(selectedTerrainRegion),
    hasSelectedWall: Boolean(selectedWall),
    hasSelectedPortal: Boolean(selectedPortal),
    hasSelectedElevationTransition: Boolean(selectedElevationTransition),
    hasSelectedFire: Boolean(selectedFire),
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
  });
  const {
    clearEditorTransientState,
    clearEditorSelection,
    discardDraftChanges,
  } = useTacticalEditorDraftCommands({
    dirty,
    clearInteractionState,
    clearDrawingTool: () => setPlacementKind(null),
    clearEnemyTool: () => setEnemyKind(null),
    changeFileMessage,
  });
  const {
    loadScenario,
    createNewScenario,
    saveScenarioAs,
    saveScenario,
    deleteScenario,
  } = useTacticalEditorFileCommands({
    draftBlocked,
    refreshScenarioList,
    clearEditorTransientState,
  });
  const {
    activatePrimaryTool,
    activatePrimaryToolFromHud,
    activateDrawingTool,
    activateEnemyTool,
  } = useTacticalEditorToolActivation({
    areaDraftTarget: raisedAreaDraft?.target ?? null,
    setPrimaryTool,
    setDrawingTool: setPlacementKind,
    setEnemyTool: setEnemyKind,
    closeToolGroup,
    clearPlacementHover: () => setPlacementHover(null),
    clearEnemyHover: () => setEnemyHover(null),
    clearPortalHover: () => setPortalHover(null),
    clearWallDraft: () => setWallDraft(null),
    clearCircleDraft: () => setCircleDraft(null),
    clearRampDraft: () => setRampDraft(null),
    clearAreaDraft: () => setRaisedAreaDraft(null),
    clearAreaControlDrag: () => setDragRaisedAreaControl(null),
    clearPlacementError: () => setPlacementError(null),
    showCircleProperties: () => setCirclePropertiesLayout((current) => ({ ...current, visible: true })),
  });
  const { selectEditorLayerObject } = useTacticalEditorLayerSelection({
    lockedLayerKeys,
    clearEditorSelection,
    activateSelectTool: () => setPrimaryTool("select"),
    selectTerrainPlacement,
    selectEnemy,
    selectWall: setSelectedWallId,
    selectArea: setSelectedRaisedAreaId,
    selectTerrainRegion: setSelectedTerrainRegionId,
    selectTerrainPrimitive,
    selectNaturalTerrain,
    selectElevationTransition,
    selectPortal: setSelectedPortalId,
    selectFire,
    showAreaProperties: () => setAreaPropertiesLayout((current) => ({ ...current, visible: true })),
    showWallProperties: () => setWallPropertiesLayout((current) => ({ ...current, visible: true })),
    showObjectProperties: () => setObjectPropertiesLayout((current) => ({ ...current, visible: true })),
  });
  const {
    previewSelectPlacement,
    previewSelectEnemy,
    previewSelectWall,
    previewSelectRaisedArea,
    previewSelectAreaAnchor,
    previewSelectPrimitive,
    previewSelectNaturalTerrain,
    previewSelectElevationTransition,
    previewSelectPortal,
    previewSelectFire,
  } = useTacticalEditorPreviewSelection({
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
    showAreaProperties: () => setAreaPropertiesLayout((current) => ({ ...current, visible: true })),
    showWallProperties: () => setWallPropertiesLayout((current) => ({ ...current, visible: true })),
    showObjectProperties: () => setObjectPropertiesLayout((current) => ({ ...current, visible: true })),
  });
  const {
    previewBeginCirclePrimitiveDrag,
    previewBeginNaturalTerrainDrag,
    previewBeginRaisedAreaControlDrag,
    previewBeginAreaAnchorDrag,
    previewBeginAreaCubicControlDrag,
    previewBeginConstrainedAreaDrag,
    previewBeginWallEndpointDrag,
    previewBeginWallMove,
    previewBeginWallControlDrag,
    previewBeginWallPortalDrag,
    previewBeginPlacementDrag,
    previewBeginEnemyDrag,
  } = useTacticalEditorPreviewDragGuards({
    lockedLayerKeys,
    beginCirclePrimitiveDrag,
    beginNaturalTerrainDrag,
    beginRaisedAreaControlDrag,
    beginAreaAnchorDrag,
    beginAreaCubicControlDrag,
    beginConstrainedAreaDrag,
    beginWallEndpointDrag,
    beginWallMove,
    beginWallControlDrag,
    beginWallPortalDrag,
    beginPlacementDrag: (drag) => setDragPlacement(drag),
    beginEnemyDrag: (drag) => setDragEnemy(drag),
  });
  const previewDragCompletion = useTacticalEditorPreviewDragCompletion({
    clearCircleDraft: () => setCircleDraft(null),
    clearAreaAnchorDrag: () => setDragAreaAnchor(null),
    clearAreaCubicControlDrag: () => setDragAreaCubicControl(null),
    clearConstrainedAreaDrag: () => setDragConstrainedArea(null),
    clearPlacementDrag: () => setDragPlacement(null),
    clearEnemyDrag: () => setDragEnemy(null),
  });
  const canRotateSelection = Boolean(selectedPlacement || (selectedEnemy && !selectedEnemyLocked));
  const rotateSelection = () => {
    if (selectedPlacement) rotateSelectedPlacement();
    else if (selectedEnemy && !selectedEnemyLocked) rotateSelectedEnemy();
  };
  useTacticalEditorKeyboard({
    onDeleteSelection: deleteSelectionForKeyboard,
    areaDraftActive: Boolean(raisedAreaDraft),
    onCloseArea: closePenArea,
    onUndoAreaNode: undoPenAreaNode,
    onCancelArea: cancelPenArea,
    rampDraftActive: Boolean(rampDraft),
    onCancelRamp: cancelRampDrawing,
    circleDraftActive: Boolean(circleDraft),
    onCancelCircle: cancelCircleDrawing,
    onActivatePrimaryTool: activatePrimaryTool,
    canRotateSelection,
    onRotateSelection: rotateSelection,
  });
  if (playtest) return <Provider store={playtest.sandbox}>
    <PlaytestComponent draftPlaytest={{ definition: playtest.definition, consoleVictory: playtest.consoleVictory, onExit: exitPlaytest }} />
  </Provider>;

  return <main className="flex h-screen w-screen flex-col overflow-hidden bg-[#050a12] font-mono text-slate-100">
    <TacticalEditorDocumentControls
      header={{
        currentScenario,
        fileMessage,
        fileDialogOpen: Boolean(openScenarioDialog || scenarioPropertiesDraft || newScenarioDialogOpen || saveAsDialogOpen),
        issues: editorIssues,
        saveBlockedReason: resolutionError,
        dirty,
      }}
      fileMenu={{
        open: openHeaderMenu === "file",
        fileBusy,
        mapValid: draft.map.width > 0 && draft.map.height > 0,
        currentScenarioIsDefault: currentScenario.isDefault,
        dirty,
        draftBlocked,
        draftBlockedReason: resolutionError,
        onToggle: () => toggleHeaderMenu("file"),
        onClose: closeHeaderMenu,
        onNewScenario: openNewScenarioDialog,
        onOpenScenario: () => {
          openScenarioFileDialog();
          void refreshScenarioList().catch((error) => changeFileMessage({ kind: "error", text: error instanceof Error ? error.message : "Could not list scenario files." }));
        },
        onSave: saveScenario,
        onSaveAs: openSaveAsDialog,
        onDelete: deleteScenario,
      }}
      scenarioMenu={{
        open: openHeaderMenu === "scenario",
        draft,
        canBeginPlaytest,
        dirty,
        onToggle: () => toggleHeaderMenu("scenario"),
        onClose: closeHeaderMenu,
        onOpenProperties: openScenarioPropertiesDialog,
        onBeginPlaytest: beginPlaytest,
        onDiscardDraft: discardDraftChanges,
      }}
      viewMenu={{
        open: openHeaderMenu === "view",
        toolbarVisible: toolsLayout.visible,
        onToggle: () => toggleHeaderMenu("view"),
        onClose: closeHeaderMenu,
        onToggleToolbar: () => toggleHudVisibility("tools"),
      }}
      openScenarioDialog={{
        open: openScenarioDialog,
        fileBusy,
        scenarioListBusy,
        fileMessage,
        currentScenarioId: currentScenario.id,
        availableScenarios,
        filteredScenarios,
        searchQuery: scenarioSearchQuery,
        selectedScenarioId: scenarioToLoad,
        onClose: closeFileDialog,
        onSearchChange: changeScenarioSearch,
        onSelectScenario: selectScenarioToLoad,
        onLoadScenario: loadScenario,
      }}
      scenarioPropertiesDialog={{
        draft: scenarioPropertiesDraft,
        error: scenarioPropertiesError,
        onChange: changeScenarioProperties,
        onApply: applyScenarioProperties,
        onClose: closeFileDialog,
      }}
      newScenarioDialog={{
        open: newScenarioDialogOpen,
        name: newScenarioName,
        map: draft.map,
        fileBusy,
        fileMessage,
        onNameChange: changeScenarioName,
        onCreate: createNewScenario,
        onClose: closeFileDialog,
      }}
      saveAsDialog={{
        open: saveAsDialogOpen,
        name: saveAsName,
        fileBusy,
        draftBlocked,
        draftBlockedReason: resolutionError,
        fileMessage,
        onNameChange: changeScenarioName,
        onSave: saveScenarioAs,
        onClose: closeFileDialog,
      }}
    />
    <div className="flex min-h-0 flex-1">
      <section aria-label="Editor canvas" className="relative h-full min-h-0 min-w-0 flex-1 overflow-hidden">
        <TacticalEditorViewportProvider key={`${draft.map.width}:${draft.map.height}`} map={draft.map}>
        <PluginHudLayer className="p-5">
          <div className="absolute left-7 top-7 z-10 border border-cyan-700 bg-slate-950/90 px-3 py-2 text-[9px] uppercase tracking-wider text-cyan-100">Draft preview · {draft.map.width}×{draft.map.height}</div>
          <div className="h-full w-full overflow-hidden border border-cyan-900 bg-black shadow-[0_0_30px_rgba(8,145,178,0.12)]">
          <TacticalEditorDraftPreview
              definition={previewDefinition}
              handToolActive={primaryTool === "hand"}
              nodeEditActive={primaryTool === "node"}
              selectedAreaAnchor={selectedAreaAnchor}
              selectedPlacementId={selectedPlacementId}
              selectedEnemyId={selectedEnemyId}
              selectedWallId={selectedWallId}
              selectedRaisedAreaId={selectedRaisedAreaId}
              selectedPrimitiveId={selectedPrimitiveId}
              selectedNaturalTerrainId={selectedNaturalTerrainId}
              selectedElevationTransitionId={selectedElevationTransitionId}
              selectedPortalId={selectedPortalId}
              selectedFire={selectedFire}
              placementKind={placementKind}
              enemyKind={enemyKind}
              placementHover={placementHover}
              enemyHover={enemyHover}
              portalHover={portalHover}
              wallDraft={wallDraft}
              raisedAreaDraft={raisedAreaDraft}
              circleDraft={circleDraft}
              rampDraft={rampDraft}
              dragRaisedAreaControl={dragRaisedAreaControl}
              dragAreaAnchor={dragAreaAnchor}
              dragAreaCubicControl={dragAreaCubicControl}
              dragConstrainedArea={dragConstrainedArea}
              dragCirclePrimitive={dragCirclePrimitive}
              dragNaturalTerrain={dragNaturalTerrain}
              dragWallEndpoint={dragWallEndpoint}
              dragWallMove={dragWallMove}
              dragWallControl={dragWallControl}
              dragWallPortal={dragWallPortal}
              dragTracingTemplate={dragTracingTemplate}
              tracingTemplateEditing={tracingTemplateEditing}
              dragPlacement={dragPlacement}
              dragEnemy={dragEnemy}
              selectPlacement={previewSelectPlacement}
              selectEnemy={previewSelectEnemy}
              selectWall={previewSelectWall}
              selectRaisedArea={previewSelectRaisedArea}
              selectAreaAnchor={previewSelectAreaAnchor}
              insertAreaAnchor={insertCompletedAreaAnchor}
              selectPrimitive={previewSelectPrimitive}
              selectNaturalTerrain={previewSelectNaturalTerrain}
              selectElevationTransition={previewSelectElevationTransition}
              selectPortal={previewSelectPortal}
              selectFire={previewSelectFire}
              hoverPlacement={setPlacementHover}
              hoverEnemy={setEnemyHover}
              hoverPortal={setPortalHover}
              beginWall={beginWall}
              updateWall={updateWall}
              finishWall={finishWall}
              finishWallInteraction={finishWallInteraction}
              cancelWall={cancelWall}
              beginCircle={beginCircle}
              updateCircle={updateCircle}
              finishCircle={finishCircle}
              cancelCircle={previewDragCompletion.cancelCircle}
              beginCirclePrimitiveDrag={previewBeginCirclePrimitiveDrag}
              updateCirclePrimitiveDrag={updateCirclePrimitiveDrag}
              finishCirclePrimitiveDrag={finishCirclePrimitiveDrag}
              beginNaturalTerrainDrag={previewBeginNaturalTerrainDrag}
              updateNaturalTerrainDrag={updateNaturalTerrainDrag}
              finishNaturalTerrainDrag={finishNaturalTerrainDrag}
              createRectangleArea={createRectangleArea}
              commitPenNode={commitPenNode}
              closePenArea={closePenArea}
              hoverRaisedArea={hoverRaisedArea}
              beginOrFinishRamp={beginOrFinishRamp}
              beginRaisedAreaControlDrag={previewBeginRaisedAreaControlDrag}
              reshapeRaisedAreaControl={reshapeRaisedAreaControl}
              finishRaisedAreaControlDrag={finishRaisedAreaControlDrag}
              cancelRaisedAreaControlDrag={cancelRaisedAreaControlDrag}
              beginAreaAnchorDrag={previewBeginAreaAnchorDrag}
              moveAreaAnchor={moveAreaAnchor}
              finishAreaAnchorDrag={previewDragCompletion.finishAreaAnchorDrag}
              cancelAreaAnchorDrag={cancelAreaAnchorDrag}
              beginAreaCubicControlDrag={previewBeginAreaCubicControlDrag}
              moveAreaCubicControl={moveAreaCubicControl}
              finishAreaCubicControlDrag={previewDragCompletion.finishAreaCubicControlDrag}
              cancelAreaCubicControlDrag={cancelAreaCubicControlDrag}
              beginConstrainedAreaDrag={previewBeginConstrainedAreaDrag}
              updateConstrainedAreaDrag={updateConstrainedAreaDrag}
              finishConstrainedAreaDrag={previewDragCompletion.finishConstrainedAreaDrag}
              cancelConstrainedAreaDrag={cancelConstrainedAreaDrag}
              placeWallPortal={placeWallPortal}
              beginWallEndpointDrag={previewBeginWallEndpointDrag}
              resizeWallEndpoint={resizeWallEndpoint}
              finishWallEndpointDrag={finishWallEndpointDrag}
              cancelWallEndpointDrag={cancelWallEndpointDrag}
              beginWallMove={previewBeginWallMove}
              moveWall={moveWall}
              finishWallMove={finishWallMove}
              cancelWallMove={cancelWallMove}
              beginWallControlDrag={previewBeginWallControlDrag}
              reshapeWallControl={reshapeWallControl}
              finishWallControlDrag={finishWallControlDrag}
              cancelWallControlDrag={cancelWallControlDrag}
              beginWallPortalDrag={previewBeginWallPortalDrag}
              moveWallPortal={moveWallPortal}
              finishWallPortalDrag={finishWallPortalDrag}
              cancelWallPortalDrag={cancelWallPortalDrag}
              beginTracingTemplateDrag={beginTracingTemplateDrag}
              transformTracingTemplate={transformTracingTemplate}
              finishTracingTemplateDrag={finishTracingTemplateDrag}
              cancelTracingTemplateDrag={cancelTracingTemplateDrag}
              beginDrag={previewBeginPlacementDrag}
              beginEnemyDrag={previewBeginEnemyDrag}
              endDrag={previewDragCompletion.endObjectDrag}
              placeTerrain={placeTerrain}
              placeEnemy={placeEnemy}
              moveTerrain={moveTerrain}
              moveEnemy={moveEnemy}
            />
          </div>
          <div className={`contents ${hudLayoutsReady ? "" : "invisible"}`}>
          <TacticalNavigationHud layout={navigationLayout} mode="editor" onLayoutChange={persistNavigationLayout} />
          <TacticalEditorToolsHud
            layout={toolsLayout}
            onLayoutChange={persistToolsLayout}
            primaryTool={primaryTool}
            placementKind={placementKind}
            enemyToolActive={enemyKind !== null}
            openToolGroup={openToolGroup}
            canRotateSelection={canRotateSelection}
            tracingTemplateVisible={tracingTemplateLayout.visible}
            layersVisible={layersLayout.visible}
            enemyPaletteVisible={enemyPaletteLayout.visible}
            drawingPrecisionControl={<TacticalEditorDrawingPrecisionControl />}
            mapWidth={draft.map.width}
            mapHeight={draft.map.height}
            selectedLiquidHydrogenFilled={selectedIsLiquidHydrogen
              ? selectedPlacement?.terrainSettings?.filled ?? true
              : null}
            penDraftSegmentCount={raisedAreaDraft?.segments.length ?? null}
            rampDrawing={rampDraft !== null}
            onActivatePrimaryTool={activatePrimaryToolFromHud}
            onToggleToolGroup={toggleToolGroup}
            onActivateDrawingTool={activateDrawingTool}
            onRotateSelection={rotateSelection}
            onOpenTracingTemplate={() => toggleHudVisibility("tracing-template")}
            onOpenLayers={() => toggleHudVisibility("layers")}
            onOpenEnemyPalette={() => toggleHudVisibility("enemy-palette")}
            onUpdateMapDimension={updateDimension}
            onUpdateLiquidHydrogenFilled={updateSelectedLiquidHydrogen}
            onFinishPenArea={closePenArea}
            onCancelPenArea={cancelPenArea}
            onCancelRamp={cancelRampDrawing}
          />
          {selectedArea && <TacticalEditorAreaPropertiesHud
            layout={areaPropertiesLayout}
            onLayoutChange={persistAreaPropertiesLayout}
            area={selectedArea}
            nodeEditing={primaryTool === "node"}
            onUpdate={updateSelectedArea}
            onDelete={deleteSelectedArea}
          />}
          {selectedWall && <TacticalEditorWallPropertiesHud
            layout={wallPropertiesLayout}
            onLayoutChange={persistWallPropertiesLayout}
            wall={selectedWall}
            onUpdate={updateSelectedWall}
            onDelete={deleteSelectedWall}
          />}
          {editableObjectProperties && <TacticalEditorObjectPropertiesHud
            layout={objectPropertiesLayout}
            onLayoutChange={persistObjectPropertiesLayout}
            naturalTerrain={selectedNaturalTerrain}
            naturalTerrainFootprintCellCount={selectedNaturalTerrain
              ? tacticalNaturalTerrainFootprintCells(
                selectedNaturalTerrain,
                draft.map.width,
                draft.map.height,
              ).length
              : 0}
            terrainRegion={selectedTerrainRegion}
            onUpdateNaturalTerrainRadius={updateSelectedNaturalTerrainRadius}
            onDeleteNaturalTerrain={deleteSelectedNaturalTerrain}
            onUpdateTerrainRegionFilled={updateSelectedTerrainRegionFilled}
            onDeleteTerrainRegion={deleteSelectedTerrainRegion}
          />}
          <TacticalEditorLayersHud
            layout={layersLayout}
            onLayoutChange={persistLayersLayout}
            groups={layerGroups}
            selectedKey={selectedLayerKey}
            hiddenKeys={hiddenLayerKeys}
            lockedKeys={lockedLayerKeys}
            onSelect={selectEditorLayerObject}
            onToggleHidden={(object) => dispatch(editorHiddenLayerToggled(object.key))}
            onToggleLocked={(object) => dispatch(editorLockedLayerToggled(object.key))}
            onMove={moveEditorLayerObject}
          />
          <TacticalEditorTracingTemplateHud
            layout={tracingTemplateLayout}
            onLayoutChange={persistTracingTemplateLayout}
            template={draft.tracingTemplate}
            availableTemplates={availableTemplates}
            busy={templateBusy}
            message={templateMessage}
            editing={tracingTemplateEditing}
            onSelectTemplate={selectTracingTemplate}
            onUploadTemplate={uploadTracingTemplate}
            onToggleEditing={toggleTracingTemplateEditing}
            onResetFit={resetTracingTemplateFit}
            onUpdateTemplate={updateTracingTemplateFromHud}
            onUpdateTemplateNumber={updateTracingTemplateNumber}
            onRemoveTemplate={removeTracingTemplate}
          />
          {(selectedPrimitive || placementKind === CIRCLE_TOOL_ID) && <TacticalEditorLegacyCircleHud
            layout={circlePropertiesLayout}
            onLayoutChange={persistCirclePropertiesLayout}
            circle={selectedPrimitive}
            creationTerrainType={circleTerrainType}
            onChangeTerrainType={changeLegacyCircleTerrainType}
            onUpdateCircle={updateSelectedPrimitive}
            onDeleteCircle={deleteSelectedPrimitive}
          />}
          <TacticalEditorEnemyPaletteHud
            layout={enemyPaletteLayout}
            onLayoutChange={persistEnemyPaletteLayout}
            activeEnemyType={enemyKind}
            onActivateEnemyType={activateEnemyTool}
          />
          {selectedPlacement && selectedHasTerminal && <TacticalEditorInteractionHud
            layout={consoleEditorLayout}
            onLayoutChange={persistConsoleEditorLayout}
            placement={selectedPlacement}
            interactiveHuman={selectedIsInteractiveHuman}
            humanCombatProfile={selectedHumanCombatProfile}
            operations={selectedConsoleOperations}
            allOperations={consoleVictory.operations}
            selectedOperation={selectedOperation}
            selectedOperationId={selectedOperationId}
            victoryTaskRequired={victoryTaskRequired}
            onUpdateTerminal={updateSelectedTerminal}
            onUpdateHumanCombatProfile={updateSelectedHumanCombatProfile}
            onAddOperation={addConsoleOperation}
            onSelectOperation={setSelectedOperationId}
            onUpdateOperation={updateConsoleOperation}
            onChangeOperationResult={updateConsoleOperationResult}
            onTogglePrerequisite={toggleConsoleOperationPrerequisite}
            onToggleUnlockedOperation={toggleConsoleOperationUnlock}
            onDeleteOperation={deleteSelectedOperation}
          />}
          {selectedEnemy && <TacticalEditorEnemyHud
            layout={enemyEditorLayout}
            onLayoutChange={persistEnemyEditorLayout}
            enemy={selectedEnemy}
            locked={selectedEnemyLocked}
            onUnlock={() => dispatch(editorLayerUnlocked(tacticalEditorLayerKey("enemy", selectedEnemy.id)))}
            onRename={updateSelectedEnemyName}
            onRotate={rotateSelectedEnemy}
            onDelete={deleteSelectedEnemy}
          />}
          </div>
        </PluginHudLayer>
        </TacticalEditorViewportProvider>
      </section>
    </div>
  </main>;
};

export default TacticalScenarioEditorClient;
