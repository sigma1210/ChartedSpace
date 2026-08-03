"use client";

import Image from "next/image";
import { Hand, LandPlot, Layers3, MousePointer2, RotateCw, Settings2, Spline } from "lucide-react";
import { useCallback, useMemo, useState, type ComponentType } from "react";
import { Provider } from "react-redux";
import { FloatingPluginHud } from "@/components/hud/FloatingPluginHud";
import { PluginHudLayer } from "@/components/hud/PluginHudLayer";
import { TacticalNavigationHud } from "@/plugins/characterCombat/TacticalNavigationHud";
import { cloneTacticalScenarioDefinition, resolveTacticalScenarioTerrain, tacticalClosedAreaGeometrySegments, tacticalPlacementSupportsConsoleOperations, type TacticalClosedAreaGeometry, type TacticalDrawnCirclePrimitive, type TacticalDrawnWall, type TacticalEnemyPlacement, type TacticalEnemyType, type TacticalNaturalTerrainPlacement, type TacticalRaisedAreaOutlineSegment, type TacticalScenarioDefinitionFile, type TacticalScenarioTracingTemplate, type TacticalTerrainPlacement, type TacticalTerrainPrimitiveType } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { tacticalElevationEdgeCandidates, tacticalNearestElevationEdgeCandidate, tacticalRampPlacementCandidate } from "@/plugins/characterCombat/tacticalElevationTransitions";
import { cloneTacticalConsoleVictoryDefinition, TRAVELLER_TASK_DIFFICULTIES, validateTacticalConsoleVictoryDefinition, type TacticalConsoleOperation, type TacticalConsoleVictoryDefinitionFile, type TravellerTaskDifficulty } from "@/plugins/characterCombat/tacticalConsoleVictory";
import { randomTacticalEnemyAvatarPath, tacticalEnemyPalette } from "@/plugins/characterCombat/tacticalEnemyDefinitions";
import type { TacticalTerminalKind } from "@/plugins/characterCombat/tacticalTerrain";
import { defaultTacticalInteractiveHumanCombatProfile, tacticalHumanArmorOptions, tacticalHumanWeaponOptions, validateTacticalInteractiveHumanCombatProfile, type TacticalInteractiveHumanCombatProfile, type TacticalHumanArmorId, type TacticalHumanWeaponId } from "@/plugins/characterCombat/tacticalInteractiveHuman";
import { buildDefaultTacticalScenario } from "@/plugins/characterCombat/defaultTacticalScenario";
import { tacticalWallPortalRepositionCandidate } from "@/plugins/characterCombat/tacticalWallPortals";
import { tacticalCirclePortalRepositionCandidate } from "@/plugins/characterCombat/tacticalTerrainPrimitives";
import { tacticalNaturalTerrainFootprintCells } from "@/plugins/characterCombat/tacticalNaturalTerrain";
import { tacticalAreaBoundaryPortalRepositionCandidate } from "@/plugins/characterCombat/tacticalAreaBoundaryPortals";
import { createAppStore, store, type AppStore } from "@/store";
import { useAppDispatch, useAppSelector, useAppStore } from "@/store/hooks";
import {
  selectTacticalEditorAreaAnchor,
  selectTacticalEditorCircleTerrainType,
  selectTacticalEditorDocument,
  selectTacticalEditorDocumentDirty,
  selectTacticalEditorEnemyKind,
  selectTacticalEditorFileState,
  selectTacticalEditorHiddenLayerKeys,
  selectTacticalEditorHudLayouts,
  selectTacticalEditorHudLayoutsReady,
  selectTacticalEditorLayerKey,
  selectTacticalEditorLockedLayerKeys,
  selectTacticalEditorOpenToolGroup,
  selectTacticalEditorOperationId,
  selectTacticalEditorPlacementKind,
  selectTacticalEditorPrimaryTool,
  selectTacticalEditorSelection,
  selectTacticalEditorTemplates,
} from "@/plugins/characterCombat/editor/state/selectors";
import {
  editorAreaAnchorSelected,
  editorCircleTerrainTypeChanged,
  editorConsoleVictoryChanged,
  editorDocumentDiscarded,
  editorDraftChanged,
  editorDrawingToolActivated,
  editorDrawingToolCleared,
  editorEnemyToolActivated,
  editorEnemyToolCleared,
  editorFileDialogClosed,
  editorFileMessageChanged,
  editorHeaderMenuClosed,
  editorHeaderMenuToggled,
  editorHudLayoutChanged,
  editorHiddenLayerToggled,
  editorLayerUnlocked,
  editorLockedLayerToggled,
  editorNewScenarioDialogOpened,
  editorOpenScenarioDialogOpened,
  editorOpenScenarioSearchChanged,
  editorOpenScenarioSelected,
  editorOperationSelected,
  editorPrimaryToolActivated,
  editorSaveAsDialogOpened,
  editorScenarioNameChanged,
  editorScenarioPropertiesChanged,
  editorScenarioPropertiesDialogOpened,
  editorScenarioPropertiesRejected,
  editorSelectionChanged,
  editorSelectionCleared,
  editorSelectionKindCleared,
  editorTemplateOperationFailed,
  editorTemplateOperationStarted,
  editorTemplateOperationSucceeded,
  editorTemplateUploadSucceeded,
  editorToolGroupClosed,
  editorToolGroupToggled,
  type TacticalEditorSelection,
  type TacticalEditorSelectionKind,
} from "@/plugins/characterCombat/editor/state/tacticalEditorSlice";
import { TacticalEditorViewportProvider, useTacticalEditorViewport } from "@/plugins/characterCombat/editor/TacticalEditorViewport";
import { TacticalEditorLayersPanel } from "@/plugins/characterCombat/editor/TacticalEditorLayersPanel";
import {
  moveTacticalEditorLayerObject,
  tacticalEditorLayerGroups,
  tacticalEditorLayerKey,
  tacticalEditorVisibleDefinition,
  type TacticalEditorLayerObject,
} from "@/plugins/characterCombat/editor/tacticalEditorLayers";
import {
  tacticalEditorHudIds,
  type TacticalEditorHudId,
  type TacticalEditorHudLayout,
} from "@/plugins/characterCombat/editor/state/hudLayouts";
import {
  useTacticalEditorInteractionState,
  type AreaCubicControlDrag,
  type CirclePrimitiveDrag,
  type ConstrainedAreaDrag,
  type EditorMapPoint,
  type NaturalTerrainDrag,
  type RaisedAreaControlDrag,
  type RaisedAreaDraft,
  type TracingTemplateCorner,
  type WallEndpoint,
} from "@/plugins/characterCombat/editor/tacticalEditorInteractionState";
import { uploadTacticalTemplate } from "@/plugins/characterCombat/editor/tacticalEditorApi";
import { useTacticalEditorKeyboard } from "@/plugins/characterCombat/editor/useTacticalEditorKeyboard";
import { useTacticalEditorFileCommands } from "@/plugins/characterCombat/editor/useTacticalEditorFileCommands";
import { useTacticalEditorResourceIndexes } from "@/plugins/characterCombat/editor/useTacticalEditorResourceIndexes";
import { useTacticalEditorSessionLifecycle } from "@/plugins/characterCombat/editor/useTacticalEditorSessionLifecycle";
import TacticalEditorDraftPreview from "@/plugins/characterCombat/editor/TacticalEditorDraftPreview";
import {
  removeConsolePlacementOperations,
  removeDrawnRaisedAreaCandidate,
  removeDrawnTerrainPrimitiveCandidate,
  tacticalElevationTransitionPlacementCandidate,
} from "@/plugins/characterCombat/editor/tacticalEditorDocument";
import {
  CIRCLE_AREA_TOOL_ID,
  CIRCLE_TOOL_ID,
  CURVED_WALL_TOOL_ID,
  EDITOR_DRAWING_TOOL_GROUPS,
  FIRE_TOOL_ID,
  INTERACTION_SKILLS,
  PEN_AREA_TOOL_ID,
  RECTANGLE_AREA_TOOL_ID,
  areaTargetForTool,
  cellKey,
  defaultNaturalTerrainRadius,
  elevationTransitionKindForTool,
  facingName,
  fitTacticalTracingTemplate,
  gridPoint,
  loadImageDimensions,
  mergeAreaSegmentsAcrossAnchor,
  naturalTerrainKindForTool,
  naturalTerrainLabel,
  penAreaSegment,
  placementCandidates,
  resizeTacticalTracingTemplate,
  sameGridPoint,
  splitAreaSegment,
  tacticalEditorMarkerInteractionEnabled,
  tacticalEditorPortalPlacementCandidate,
  tracingTemplateCenter,
  wallPortalKindForTool,
} from "@/plugins/characterCombat/editor/tacticalEditorSupport";

export {
  fitTacticalTracingTemplate,
  resizeTacticalTracingTemplate,
  tacticalEditorMarkerInteractionEnabled,
};

type TacticalEditorHudLayoutUpdate = TacticalEditorHudLayout
  | ((current: TacticalEditorHudLayout) => TacticalEditorHudLayout);
type TacticalEditorDraftUpdate = TacticalScenarioDefinitionFile
  | ((current: TacticalScenarioDefinitionFile) => TacticalScenarioDefinitionFile);
type TacticalEditorConsoleVictoryUpdate = TacticalConsoleVictoryDefinitionFile
  | ((current: TacticalConsoleVictoryDefinitionFile) => TacticalConsoleVictoryDefinitionFile);

const cloneEditorAreaSegments = (segments: TacticalRaisedAreaOutlineSegment[]) => segments.map((segment) => ({
  ...segment,
  from: { ...segment.from },
  to: { ...segment.to },
  ...(segment.kind === "quadratic" ? { control: { ...segment.control } } : {}),
  ...(segment.kind === "cubic" ? { control1: { ...segment.control1 }, control2: { ...segment.control2 } } : {}),
}));
const TacticalDrawingPrecisionControl = () => {
  const editorViewport = useTacticalEditorViewport();
  if (!editorViewport) throw new Error("Drawing precision requires an editor viewport provider.");
  return <label className="block font-bold text-cyan-200">Precision
    <select
      aria-label="Drawing precision"
      value={editorViewport.snapMode}
      onChange={(event) => editorViewport.setSnapMode(event.target.value as typeof editorViewport.snapMode)}
      className="mt-1 h-8 w-full border border-cyan-700 bg-slate-950 px-2 text-[9px] normal-case tracking-normal text-cyan-50"
    >
      <option value="grid">Grid · 1 square</option>
      <option value="half-grid">Half grid · 0.5</option>
      <option value="quarter-grid">Quarter grid · 0.25</option>
      <option value="freeform">Freeform</option>
    </select>
  </label>;
};


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
  const editorStore = useAppStore();
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [playtest, setPlaytest] = useState<{ definition: TacticalScenarioDefinitionFile; consoleVictory: TacticalConsoleVictoryDefinitionFile; sandbox: AppStore } | null>(null);
  const editorSelection = useAppSelector(selectTacticalEditorSelection);
  const selectedAreaAnchor = useAppSelector(selectTacticalEditorAreaAnchor);
  const selectedOperationId = useAppSelector(selectTacticalEditorOperationId);
  const selectedLayerKey = useAppSelector(selectTacticalEditorLayerKey);
  const primaryTool = useAppSelector(selectTacticalEditorPrimaryTool);
  const placementKind = useAppSelector(selectTacticalEditorPlacementKind);
  const enemyKind = useAppSelector(selectTacticalEditorEnemyKind);
  const circleTerrainType = useAppSelector(selectTacticalEditorCircleTerrainType);
  const openToolGroup = useAppSelector(selectTacticalEditorOpenToolGroup);
  const hiddenLayerKeys = useAppSelector(selectTacticalEditorHiddenLayerKeys);
  const lockedLayerKeys = useAppSelector(selectTacticalEditorLockedLayerKeys);
  const hudLayouts = useAppSelector(selectTacticalEditorHudLayouts);
  const hudLayoutsReady = useAppSelector(selectTacticalEditorHudLayoutsReady);
  const editorDocument = useAppSelector(selectTacticalEditorDocument);
  const dirty = useAppSelector(selectTacticalEditorDocumentDirty);
  const templateWorkflow = useAppSelector(selectTacticalEditorTemplates);
  const availableTemplates = templateWorkflow.assets;
  const templateBusy = templateWorkflow.operation !== "idle";
  const templateMessage = templateWorkflow.message;
  const { draft, consoleVictory } = editorDocument;
  const setDraft = useCallback((update: TacticalEditorDraftUpdate) => {
    const current = editorStore.getState().tacticalEditor.document.draft;
    dispatch(editorDraftChanged(typeof update === "function" ? update(current) : update));
  }, [dispatch, editorStore]);
  const setConsoleVictory = useCallback((update: TacticalEditorConsoleVictoryUpdate) => {
    const current = editorStore.getState().tacticalEditor.document.consoleVictory;
    dispatch(editorConsoleVictoryChanged(typeof update === "function" ? update(current) : update));
  }, [dispatch, editorStore]);
  const fileWorkflow = useAppSelector(selectTacticalEditorFileState);
  const currentScenario = fileWorkflow.currentScenario;
  const availableScenarios = fileWorkflow.scenarioIndex.items;
  const scenarioListBusy = fileWorkflow.scenarioIndex.status === "loading";
  const fileBusy = fileWorkflow.operation !== "idle";
  const fileMessage = fileWorkflow.message;
  const openHeaderMenu = fileWorkflow.openHeaderMenu;
  const fileDialog = fileWorkflow.dialog;
  const openScenarioDialog = fileDialog.kind === "open";
  const scenarioPropertiesDraft = fileDialog.kind === "properties" ? fileDialog.draft : null;
  const scenarioPropertiesError = fileDialog.kind === "properties" ? fileDialog.error : null;
  const newScenarioDialogOpen = fileDialog.kind === "new";
  const newScenarioName = fileDialog.kind === "new" ? fileDialog.name : "";
  const saveAsDialogOpen = fileDialog.kind === "save-as";
  const saveAsName = fileDialog.kind === "save-as" ? fileDialog.name : "";
  const scenarioSearchQuery = fileDialog.kind === "open" ? fileDialog.searchQuery : "";
  const scenarioToLoad = fileDialog.kind === "open" ? fileDialog.selectedScenarioId : "";
  const selectedPlacementId = editorSelection?.kind === "terrain-placement" ? editorSelection.id : null;
  const selectedEnemyId = editorSelection?.kind === "enemy" ? editorSelection.id : null;
  const selectedWallId = editorSelection?.kind === "wall" ? editorSelection.id : null;
  const selectedRaisedAreaId = editorSelection?.kind === "area"
    || editorSelection?.kind === "legacy-raised-area"
    || editorSelection?.kind === "legacy-terrain-region"
    ? editorSelection.id
    : null;
  const selectedTerrainRegionId = editorSelection?.kind === "legacy-terrain-region" ? editorSelection.id : null;
  const selectedPrimitiveId = editorSelection?.kind === "legacy-circle" ? editorSelection.id : null;
  const selectedNaturalTerrainId = editorSelection?.kind === "natural-terrain" ? editorSelection.id : null;
  const selectedElevationTransitionId = editorSelection?.kind === "elevation-transition" ? editorSelection.id : null;
  const selectedPortalId = editorSelection?.kind === "portal" ? editorSelection.id : null;
  const selectedFire = editorSelection?.kind === "fire" ? editorSelection.position : null;
  const selectObject = (selection: TacticalEditorSelection) => dispatch(editorSelectionChanged(selection));
  const clearObjectKind = (kind: TacticalEditorSelectionKind) => dispatch(editorSelectionKindCleared(kind));
  const setSelectedPlacementId = (id: string | null) => id
    ? selectObject({ kind: "terrain-placement", id })
    : clearObjectKind("terrain-placement");
  const setSelectedOperationId = (id: string | null) => dispatch(editorOperationSelected(id));
  const setSelectedEnemyId = (id: string | null) => id ? selectObject({ kind: "enemy", id }) : clearObjectKind("enemy");
  const setSelectedWallId = (id: string | null) => id ? selectObject({ kind: "wall", id }) : clearObjectKind("wall");
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
  const setSelectedAreaAnchor = (anchor: { areaId: string; anchorIndex: number } | null) => dispatch(editorAreaAnchorSelected(anchor));
  const setSelectedTerrainRegionId = (id: string | null) => id
    ? selectObject({ kind: "legacy-terrain-region", id })
    : clearObjectKind("legacy-terrain-region");
  const setSelectedPrimitiveId = (id: string | null) => id ? selectObject({ kind: "legacy-circle", id }) : clearObjectKind("legacy-circle");
  const setSelectedNaturalTerrainId = (id: string | null) => id ? selectObject({ kind: "natural-terrain", id }) : clearObjectKind("natural-terrain");
  const setSelectedElevationTransitionId = (id: string | null) => id
    ? selectObject({ kind: "elevation-transition", id })
    : clearObjectKind("elevation-transition");
  const setSelectedPortalId = (id: string | null) => id ? selectObject({ kind: "portal", id }) : clearObjectKind("portal");
  const setSelectedFire = (position: { x: number; y: number } | null) => position
    ? selectObject({ kind: "fire", position })
    : clearObjectKind("fire");
  const setPlacementKind = (tool: string | null) => dispatch(tool
    ? editorDrawingToolActivated(tool)
    : editorDrawingToolCleared());
  const setCircleTerrainType = (terrainType: TacticalTerrainPrimitiveType) => dispatch(editorCircleTerrainTypeChanged(terrainType));
  const setEnemyKind = (kind: TacticalEnemyType | null) => dispatch(kind
    ? editorEnemyToolActivated(kind)
    : editorEnemyToolCleared());
  const setPrimaryTool = (tool: "select" | "node" | "hand") => dispatch(editorPrimaryToolActivated(tool));
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
  const changeHudLayout = useCallback((id: TacticalEditorHudId, layout: TacticalEditorHudLayout) => {
    dispatch(editorHudLayoutChanged({ id, layout }));
  }, [dispatch]);
  const persistHudLayout = useMemo(() => Object.fromEntries(tacticalEditorHudIds.map((id) => [
    id,
    (layout: TacticalEditorHudLayout) => changeHudLayout(id, layout),
  ])) as Record<TacticalEditorHudId, (layout: TacticalEditorHudLayout) => void>, [changeHudLayout]);
  const setHudLayout = (id: TacticalEditorHudId, update: TacticalEditorHudLayoutUpdate) => {
    const current = hudLayouts[id];
    changeHudLayout(id, typeof update === "function" ? update(current) : update);
  };
  const circlePropertiesLayout = hudLayouts["circle-properties"];
  const enemyPaletteLayout = hudLayouts["enemy-palette"];
  const consoleEditorLayout = hudLayouts["console-editor"];
  const enemyEditorLayout = hudLayouts["enemy-editor"];
  const navigationLayout = hudLayouts.navigation;
  const tracingTemplateLayout = hudLayouts["tracing-template"];
  const toolsLayout = hudLayouts.tools;
  const layersLayout = hudLayouts.layers;
  const areaPropertiesLayout = hudLayouts["area-properties"];
  const objectPropertiesLayout = hudLayouts["object-properties"];
  const setCirclePropertiesLayout = (update: TacticalEditorHudLayoutUpdate) => setHudLayout("circle-properties", update);
  const setEnemyPaletteLayout = (update: TacticalEditorHudLayoutUpdate) => setHudLayout("enemy-palette", update);
  const setConsoleEditorLayout = (update: TacticalEditorHudLayoutUpdate) => setHudLayout("console-editor", update);
  const setEnemyEditorLayout = (update: TacticalEditorHudLayoutUpdate) => setHudLayout("enemy-editor", update);
  const setNavigationLayout = (update: TacticalEditorHudLayoutUpdate) => setHudLayout("navigation", update);
  const setTracingTemplateLayout = (update: TacticalEditorHudLayoutUpdate) => setHudLayout("tracing-template", update);
  const setToolsLayout = (update: TacticalEditorHudLayoutUpdate) => setHudLayout("tools", update);
  const setLayersLayout = (update: TacticalEditorHudLayoutUpdate) => setHudLayout("layers", update);
  const setAreaPropertiesLayout = (update: TacticalEditorHudLayoutUpdate) => setHudLayout("area-properties", update);
  const setObjectPropertiesLayout = (update: TacticalEditorHudLayoutUpdate) => setHudLayout("object-properties", update);
  const persistCirclePropertiesLayout = persistHudLayout["circle-properties"];
  const persistEnemyPaletteLayout = persistHudLayout["enemy-palette"];
  const persistConsoleEditorLayout = persistHudLayout["console-editor"];
  const persistEnemyEditorLayout = persistHudLayout["enemy-editor"];
  const persistNavigationLayout = persistHudLayout.navigation;
  const persistTracingTemplateLayout = persistHudLayout["tracing-template"];
  const persistToolsLayout = persistHudLayout.tools;
  const persistLayersLayout = persistHudLayout.layers;
  const persistAreaPropertiesLayout = persistHudLayout["area-properties"];
  const persistObjectPropertiesLayout = persistHudLayout["object-properties"];
  useTacticalEditorSessionLifecycle();
  const { refreshScenarioList } = useTacticalEditorResourceIndexes();
  const applyTracingTemplateImage = async (imagePath: string) => {
    const naturalSize = await loadImageDimensions(imagePath);
    setDraft((current) => ({
      ...current,
      tracingTemplate: fitTacticalTracingTemplate(imagePath, naturalSize, current.map),
    }));
  };
  const selectTracingTemplate = async (imagePath: string) => {
    if (!imagePath || templateBusy) return;
    dispatch(editorTemplateOperationStarted("applying"));
    try {
      await applyTracingTemplateImage(imagePath);
      dispatch(editorTemplateOperationSucceeded("Tracing template fitted to the map."));
    } catch (error) {
      dispatch(editorTemplateOperationFailed(error instanceof Error ? error.message : "Could not load the tracing template."));
    }
  };
  const uploadTracingTemplate = async (file: File) => {
    if (templateBusy) return;
    dispatch(editorTemplateOperationStarted("uploading"));
    try {
      const template = await uploadTacticalTemplate(file);
      await applyTracingTemplateImage(template.imagePath);
      dispatch(editorTemplateUploadSucceeded({
        asset: template,
        message: `${template.label} uploaded and fitted to the map.`,
      }));
    } catch (error) {
      dispatch(editorTemplateOperationFailed(error instanceof Error ? error.message : "Could not upload the tracing template."));
    }
  };
  const updateTracingTemplate = (update: Partial<TacticalScenarioTracingTemplate>) => {
    setDraft((current) => current.tracingTemplate
      ? { ...current, tracingTemplate: { ...current.tracingTemplate, ...update } }
      : current);
  };
  const updateTracingTemplateNumber = (field: "x" | "y" | "width" | "height" | "rotation", value: number) => {
    if (!Number.isFinite(value) || ((field === "width" || field === "height") && value <= 0)) return;
    setDraft((current) => {
      const template = current.tracingTemplate;
      if (!template) return current;
      let tracingTemplate = { ...template, [field]: value };
      if (template.lockAspectRatio && field === "width") tracingTemplate = { ...tracingTemplate, height: template.height * value / template.width };
      if (template.lockAspectRatio && field === "height") tracingTemplate = { ...tracingTemplate, width: template.width * value / template.height };
      return { ...current, tracingTemplate };
    });
  };
  const resetTracingTemplateFit = async () => {
    if (!draft.tracingTemplate || templateBusy) return;
    dispatch(editorTemplateOperationStarted("applying"));
    try {
      await applyTracingTemplateImage(draft.tracingTemplate.imagePath);
      dispatch(editorTemplateOperationSucceeded("Tracing template reset and fitted to the map."));
    } catch (error) {
      dispatch(editorTemplateOperationFailed(error instanceof Error ? error.message : "Could not reset the tracing template."));
    }
  };
  const beginTracingTemplateDrag = (kind: "move" | "rotate" | TracingTemplateCorner, point: { x: number; y: number }) => {
    const template = draft.tracingTemplate;
    if (!template) return;
    if (kind === "move") {
      setDragTracingTemplate({ kind, start: point, original: { ...template } });
    } else if (kind === "rotate") {
      const center = tracingTemplateCenter(template);
      setDragTracingTemplate({
        kind,
        center,
        startAngle: Math.atan2(point.y - center.y, point.x - center.x),
        original: { ...template },
      });
    } else {
      setDragTracingTemplate({ kind: "resize", corner: kind, original: { ...template } });
    }
    setPlacementError(null);
  };
  const transformTracingTemplate = (point: { x: number; y: number }) => {
    if (!dragTracingTemplate) return;
    let tracingTemplate: TacticalScenarioTracingTemplate;
    if (dragTracingTemplate.kind === "move") {
      tracingTemplate = {
        ...dragTracingTemplate.original,
        x: dragTracingTemplate.original.x + point.x - dragTracingTemplate.start.x,
        y: dragTracingTemplate.original.y + point.y - dragTracingTemplate.start.y,
      };
    } else if (dragTracingTemplate.kind === "resize") {
      tracingTemplate = resizeTacticalTracingTemplate(dragTracingTemplate.original, dragTracingTemplate.corner, point);
    } else {
      const angle = Math.atan2(point.y - dragTracingTemplate.center.y, point.x - dragTracingTemplate.center.x);
      const rotation = dragTracingTemplate.original.rotation + (angle - dragTracingTemplate.startAngle) * 180 / Math.PI;
      tracingTemplate = {
        ...dragTracingTemplate.original,
        rotation: ((rotation + 180) % 360 + 360) % 360 - 180,
      };
    }
    setDraft((current) => current.tracingTemplate ? { ...current, tracingTemplate } : current);
  };
  const cancelTracingTemplateDrag = () => {
    if (!dragTracingTemplate) return;
    setDraft((current) => current.tracingTemplate
      ? { ...current, tracingTemplate: { ...dragTracingTemplate.original } }
      : current);
    setDragTracingTemplate(null);
  };
  const resolutionError = useMemo(() => {
    try {
      const terrain = resolveTacticalScenarioTerrain(draft);
      terrain.terrainObjects.filter((object) => object.kind === "terminal" && object.visualKind === "human").forEach((human) => validateTacticalInteractiveHumanCombatProfile(human.kind === "terminal" ? human.combatProfile ?? defaultTacticalInteractiveHumanCombatProfile : defaultTacticalInteractiveHumanCombatProfile));
      if (terrain.deploymentCells.length < 2) throw new Error("Define a crew deployment edge or designate a drawn area for crew deployment before saving or playtesting.");
      const enemyIds = new Set<string>();
      const enemyCells = new Set<string>();
      (draft.enemyPlacements ?? []).forEach((enemy) => {
        const position = cellKey(enemy.position);
        if (!enemy.name.trim()) throw new Error(`Enemy ${enemy.id} requires a name.`);
        if (enemyIds.has(enemy.id)) throw new Error(`Duplicate enemy ID: ${enemy.id}.`);
        if (enemy.position.x < 0 || enemy.position.y < 0 || enemy.position.x >= draft.map.width || enemy.position.y >= draft.map.height) throw new Error(`Enemy ${enemy.name} is outside the map at ${position}.`);
        if (enemyCells.has(position)) throw new Error(`Two enemies occupy ${position}.`);
        if (terrain.objects.some((object) => cellKey(object.position) === position) || terrain.closeMachineryCells.some((cell) => cellKey(cell) === position)) throw new Error(`Enemy ${enemy.name} cannot occupy blocked terrain at ${position}.`);
        if (terrain.deploymentCells.some((cell) => cellKey(cell) === position)) throw new Error(`Enemy ${enemy.name} cannot occupy the crew deployment zone at ${position}.`);
        enemyIds.add(enemy.id);
        enemyCells.add(position);
      });
      if (consoleVictory.operations.length > 0) validateTacticalConsoleVictoryDefinition(consoleVictory, draft.terrainPlacements.filter(tacticalPlacementSupportsConsoleOperations).map((placement) => placement.id), draft.terrainPlacements.filter((placement) => placement.terrainDefinitionId === "interactive-human").map((placement) => placement.id));
      if (consoleVictory.operations.length > 0) buildDefaultTacticalScenario(undefined, draft, consoleVictory);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "The draft could not be resolved.";
    }
  }, [consoleVictory, draft]);
  const victoryTaskRequired = consoleVictory.operations.length === 0;
  const draftBlocked = Boolean(resolutionError);
  const playtestBlocked = draftBlocked || victoryTaskRequired;
  const editorIssues = [
    ...(placementError ? [{ severity: "warning" as const, message: placementError }] : []),
    ...(victoryTaskRequired ? [{ severity: "warning" as const, message: "This scenario has no victory task. It can be saved, but add a console or interactive human and a victory task before playtesting." }] : []),
    ...(resolutionError ? [{ severity: "error" as const, message: resolutionError }] : []),
  ];
  const updateDimension = (field: "width" | "height", value: string) => {
    const parsed = Number.parseInt(value, 10);
    setDraft((current) => ({ ...current, map: { ...current.map, [field]: Number.isFinite(parsed) ? parsed : 0 } }));
  };
  const applyScenarioProperties = () => {
    if (!scenarioPropertiesDraft) return;
    const candidate = { ...draft, ...scenarioPropertiesDraft };
    try {
      const terrain = resolveTacticalScenarioTerrain(candidate);
      if (terrain.deploymentCells.length < 2) throw new Error("Define a crew deployment edge or designate a drawn area for crew deployment before saving or playtesting.");
      const deploymentCells = new Set(terrain.deploymentCells.map(cellKey));
      const enemy = (candidate.enemyPlacements ?? []).find((item) => deploymentCells.has(cellKey(item.position)));
      if (enemy) throw new Error(`Enemy ${enemy.name} cannot occupy the crew deployment zone at ${cellKey(enemy.position)}.`);
      setDraft(candidate);
      dispatch(editorFileDialogClosed());
      setPlacementError(null);
    } catch (error) {
      dispatch(editorScenarioPropertiesRejected(error instanceof Error ? error.message : "Those scenario properties are not valid."));
    }
  };
  const updatePlacements = (placements: TacticalTerrainPlacement[]) => {
    const candidate = { ...draft, terrainPlacements: placements };
    try {
      const terrain = resolveTacticalScenarioTerrain(candidate);
      const deploymentCells = new Set(terrain.deploymentCells.map(cellKey));
      const enemy = (candidate.enemyPlacements ?? []).find((item) => deploymentCells.has(cellKey(item.position)));
      if (enemy) throw new Error(`Enemy ${enemy.name} cannot occupy the crew deployment zone at ${cellKey(enemy.position)}.`);
      setDraft(candidate);
      setPlacementError(null);
      return true;
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That terrain placement is not valid.");
      return false;
    }
  };
  const moveTerrain = (id: string, origin: { x: number; y: number }) => {
    const placement = draft.terrainPlacements.find((item) => item.id === id);
    if (!placement || (placement.origin.x === origin.x && placement.origin.y === origin.y)) return;
    updatePlacements(draft.terrainPlacements.map((item) => item.id === id ? { ...item, origin } : item));
  };
  const beginWall = (from: { x: number; y: number }) => {
    setWallDraft({ from: gridPoint(from), to: gridPoint(from), curved: placementKind === CURVED_WALL_TOOL_ID, awaitingEnd: false });
    setSelectedPlacementId(null);
    setSelectedEnemyId(null);
    setSelectedWallId(null);
    setSelectedFire(null);
    setPlacementError(null);
  };
  const updateWall = (to: { x: number; y: number }) => {
    setWallDraft((current) => current ? { ...current, to: gridPoint(to) } : null);
  };
  const finishWall = (to: { x: number; y: number }) => {
    if (!wallDraft) return;
    const from = gridPoint(wallDraft.from);
    const snappedTo = gridPoint(to);
    setWallDraft(null);
    if (from.x === snappedTo.x && from.y === snappedTo.y) {
      setPlacementError("A wall must have different start and end points.");
      return;
    }
    let suffix = 1;
    let id = `drawn-wall-${suffix}`;
    while ((draft.drawnWalls ?? []).some((wall) => wall.id === id)) {
      suffix += 1;
      id = `drawn-wall-${suffix}`;
    }
    const wall: TacticalDrawnWall = {
      id,
      from,
      to: snappedTo,
      ...(wallDraft.curved ? { control: { x: (from.x + snappedTo.x) / 2, y: (from.y + snappedTo.y) / 2 } } : {}),
    };
    const candidate = { ...draft, drawnWalls: [...(draft.drawnWalls ?? []), wall] };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setSelectedWallId(id);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That wall is not valid.");
    }
  };
  const finishWallInteraction = (to: { x: number; y: number }) => {
    if (!wallDraft) return;
    const snappedTo = gridPoint(to);
    if (sameGridPoint(wallDraft.from, snappedTo)) {
      setWallDraft({ ...wallDraft, to: snappedTo, awaitingEnd: true });
      setPlacementError(null);
      return;
    }
    finishWall(snappedTo);
  };
  const circleRadiusTo = (
    center: { x: number; y: number },
    point: { x: number; y: number },
  ) => Number(Math.hypot(point.x - center.x, point.y - center.y).toFixed(4));
  const beginCircle = (center: { x: number; y: number }) => {
    setCircleDraft({ center: gridPoint(center), radius: 0 });
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
    setPlacementError(null);
  };
  const updateCircle = (point: { x: number; y: number }) => {
    setCircleDraft((current) => current
      ? { ...current, radius: circleRadiusTo(current.center, point) }
      : null);
  };
  const finishCircle = (point: { x: number; y: number }) => {
    if (!circleDraft) return;
    const radius = circleRadiusTo(circleDraft.center, point);
    setCircleDraft(null);
    if (radius <= 0) {
      setPlacementError("A circle must have a positive radius.");
      return;
    }
    const usedIds = new Set([
      ...draft.terrainPlacements.map((placement) => placement.id),
      ...(draft.drawnWalls ?? []).map((wall) => wall.id),
      ...(draft.drawnAreas ?? []).map((area) => area.id),
      ...(draft.drawnRaisedAreas ?? []).map((area) => area.id),
      ...(draft.drawnTerrainRegions ?? []).map((region) => region.id),
      ...(draft.drawnTerrainPrimitives ?? []).map((primitive) => primitive.id),
      ...(draft.naturalTerrainPlacements ?? []).map((placement) => placement.id),
    ]);
    let suffix = 1;
    const unifiedArea = placementKind === CIRCLE_AREA_TOOL_ID;
    const idPrefix = unifiedArea ? "circle-area" : "terrain-circle";
    let id = `${idPrefix}-${suffix}`;
    while (usedIds.has(id)) {
      suffix += 1;
      id = `${idPrefix}-${suffix}`;
    }
    if (unifiedArea) {
      const geometry: TacticalClosedAreaGeometry = {
        kind: "circle",
        center: gridPoint(circleDraft.center),
        radius,
      };
      const candidate: TacticalScenarioDefinitionFile = {
        ...draft,
        drawnAreas: [...(draft.drawnAreas ?? []), {
          id,
          geometry,
          segments: tacticalClosedAreaGeometrySegments(geometry),
          surface: "none",
          elevation: 0,
          boundary: "none",
        }],
      };
      try {
        resolveTacticalScenarioTerrain(candidate);
        setDraft(candidate);
        setSelectedRaisedAreaId(id);
        setSelectedTerrainRegionId(null);
        setAreaPropertiesLayout((current) => ({ ...current, visible: true }));
        setPlacementKind(null);
        setPlacementError(null);
      } catch (error) {
        setPlacementError(error instanceof Error ? error.message : "That circle area is not valid.");
      }
      return;
    }
    const primitive: TacticalDrawnCirclePrimitive = {
      id,
      shape: "circle",
      center: gridPoint(circleDraft.center),
      radius,
      terrainType: circleTerrainType,
    };
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      drawnTerrainPrimitives: [...(draft.drawnTerrainPrimitives ?? []), primitive],
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setSelectedPrimitiveId(id);
      setPlacementKind(null);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That circle is not valid.");
    }
  };
  const beginCirclePrimitiveDrag = (
    id: string,
    kind: CirclePrimitiveDrag["kind"],
  ) => {
    setDragCirclePrimitive({ id, kind });
    setPlacementError(null);
  };
  const updateCirclePrimitiveDrag = (point: { x: number; y: number }) => {
    if (!dragCirclePrimitive) return;
    const primitive = (draft.drawnTerrainPrimitives ?? [])
      .find((candidate) => candidate.id === dragCirclePrimitive.id);
    if (!primitive) return;
    const updated: TacticalDrawnCirclePrimitive = dragCirclePrimitive.kind === "center"
      ? { ...primitive, center: gridPoint(point) }
      : { ...primitive, radius: circleRadiusTo(primitive.center, point) };
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      drawnTerrainPrimitives: (draft.drawnTerrainPrimitives ?? [])
        .map((item) => item.id === primitive.id ? updated : item),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That circle position is not valid.");
    }
  };
  const beginNaturalTerrainDrag = (
    id: string,
    kind: NaturalTerrainDrag["kind"],
    point?: { x: number; y: number },
  ) => {
    const placement = (draft.naturalTerrainPlacements ?? [])
      .find((candidate) => candidate.id === id);
    const center = placement ? {
      x: placement.position.x + 0.5,
      y: placement.position.y + 0.5,
    } : null;
    setDragNaturalTerrain({
      id,
      kind,
      ...(kind === "position" && point && center
        ? { offset: { x: point.x - center.x, y: point.y - center.y } }
        : {}),
    });
    setPlacementError(null);
  };
  const updateNaturalTerrainDrag = (point: { x: number; y: number }) => {
    if (!dragNaturalTerrain) return;
    const placement = (draft.naturalTerrainPlacements ?? [])
      .find((candidate) => candidate.id === dragNaturalTerrain.id);
    if (!placement) return;
    const center = {
      x: placement.position.x + 0.5,
      y: placement.position.y + 0.5,
    };
    const updated: TacticalNaturalTerrainPlacement = dragNaturalTerrain.kind === "position"
      ? {
        ...placement,
        position: {
          x: Math.floor(point.x - (dragNaturalTerrain.offset?.x ?? 0)),
          y: Math.floor(point.y - (dragNaturalTerrain.offset?.y ?? 0)),
        },
      }
      : { ...placement, radius: Math.max(0.25, Math.hypot(point.x - center.x, point.y - center.y)) };
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      naturalTerrainPlacements: (draft.naturalTerrainPlacements ?? [])
        .map((item) => item.id === placement.id ? updated : item),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      if (updated.kind === "tree" && (candidate.enemyPlacements ?? [])
        .some((enemy) => cellKey(enemy.position) === cellKey(updated.position))) {
        throw new Error(`Tree ${updated.id} cannot overlap an enemy.`);
      }
      setDraft(candidate);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That natural terrain position is not valid.");
    }
  };
  const createRectangleArea = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const left = Math.min(from.x, to.x);
    const right = Math.max(from.x, to.x);
    const top = Math.min(from.y, to.y);
    const bottom = Math.max(from.y, to.y);
    if (right - left < 0.25 || bottom - top < 0.25) {
      setPlacementError("Drag a rectangle with both width and height.");
      return;
    }
    const usedIds = new Set([
      ...draft.terrainPlacements.map((placement) => placement.id),
      ...(draft.drawnWalls ?? []).map((wall) => wall.id),
      ...(draft.drawnRaisedAreas ?? []).map((area) => area.id),
      ...(draft.drawnTerrainRegions ?? []).map((region) => region.id),
      ...(draft.drawnAreas ?? []).map((area) => area.id),
      ...(draft.drawnTerrainPrimitives ?? []).map((primitive) => primitive.id),
    ]);
    let suffix = 1;
    let id = `rectangle-area-${suffix}`;
    while (usedIds.has(id)) {
      suffix += 1;
      id = `rectangle-area-${suffix}`;
    }
    const geometry: TacticalClosedAreaGeometry = {
      kind: "rectangle",
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    };
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      drawnAreas: [...(draft.drawnAreas ?? []), {
        id,
        geometry,
        segments: tacticalClosedAreaGeometrySegments(geometry),
        surface: "none",
        elevation: 0,
        boundary: "none",
      }],
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setSelectedRaisedAreaId(id);
      setSelectedTerrainRegionId(null);
      setAreaPropertiesLayout((current) => ({ ...current, visible: true }));
      setPlacementKind(null);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That rectangle is not valid.");
    }
  };
  const finishPenArea = (segments: TacticalRaisedAreaOutlineSegment[]) => {
    if (segments.length < 3) {
      setPlacementError("A Pen area needs at least three boundary segments.");
      return;
    }
    const usedIds = new Set([
      ...draft.terrainPlacements.map((placement) => placement.id),
      ...(draft.drawnWalls ?? []).map((wall) => wall.id),
      ...(draft.drawnRaisedAreas ?? []).map((area) => area.id),
      ...(draft.drawnTerrainRegions ?? []).map((region) => region.id),
      ...(draft.drawnAreas ?? []).map((area) => area.id),
      ...(draft.drawnTerrainPrimitives ?? []).map((primitive) => primitive.id),
    ]);
    let suffix = 1;
    const idPrefix = "drawn-area";
    let id = `${idPrefix}-${suffix}`;
    while (usedIds.has(id)) {
      suffix += 1;
      id = `${idPrefix}-${suffix}`;
    }
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      drawnAreas: [...(draft.drawnAreas ?? []), {
        id,
        segments,
        surface: "none",
        elevation: 0,
        boundary: "none",
      }],
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setRaisedAreaDraft(null);
      setDragRaisedAreaControl(null);
      setSelectedRaisedAreaId(id);
      setSelectedTerrainRegionId(null);
      setAreaPropertiesLayout((current) => ({ ...current, visible: true }));
      setPlacementKind(null);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That Pen outline is not valid.");
    }
  };
  const closePenArea = () => {
    if (!raisedAreaDraft || sameGridPoint(raisedAreaDraft.current, raisedAreaDraft.start)) return;
    finishPenArea([
      ...raisedAreaDraft.segments,
      penAreaSegment(raisedAreaDraft.current, raisedAreaDraft.start, raisedAreaDraft.outgoingControl, null),
    ]);
  };
  const commitPenNode = (anchor: { x: number; y: number }, handle: { x: number; y: number }) => {
    if (placementKind !== PEN_AREA_TOOL_ID) return;
    const dragged = Math.hypot(handle.x - anchor.x, handle.y - anchor.y) >= 0.1;
    const outgoingControl = dragged ? gridPoint(handle) : null;
    const incomingControl = dragged ? {
      x: anchor.x * 2 - handle.x,
      y: anchor.y * 2 - handle.y,
    } : null;
    if (!raisedAreaDraft) {
      const snapped = gridPoint(anchor);
      setDragRaisedAreaControl(null);
      setRaisedAreaDraft({ target: "area", start: snapped, current: snapped, hover: snapped, segments: [], outgoingControl });
      setSelectedPlacementId(null);
      setSelectedEnemyId(null);
      setSelectedWallId(null);
      setSelectedRaisedAreaId(null);
      setSelectedTerrainRegionId(null);
      setSelectedPrimitiveId(null);
      setSelectedNaturalTerrainId(null);
      setSelectedPortalId(null);
      setSelectedFire(null);
      setPlacementError(null);
      return;
    }
    if (sameGridPoint(anchor, raisedAreaDraft.current)) return;
    const segment = penAreaSegment(raisedAreaDraft.current, anchor, raisedAreaDraft.outgoingControl, incomingControl);
    const segments = [...raisedAreaDraft.segments, segment];
    if (sameGridPoint(anchor, raisedAreaDraft.start)) {
      finishPenArea(segments);
      return;
    }
    setRaisedAreaDraft({
      ...raisedAreaDraft,
      current: gridPoint(anchor),
      hover: gridPoint(anchor),
      segments,
      outgoingControl,
    });
    setPlacementError(null);
  };
  const hoverRaisedArea = (point: { x: number; y: number }) => {
    setRaisedAreaDraft((current) => current ? { ...current, hover: gridPoint(point) } : null);
  };
  const applyCompletedAreaSegments = (areaId: string, segments: TacticalRaisedAreaOutlineSegment[], fallbackMessage: string) => {
    if ((draft.drawnAreas ?? []).find((area) => area.id === areaId)?.geometry) return;
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      drawnAreas: (draft.drawnAreas ?? []).map((area) => area.id === areaId
        ? { ...area, segments }
        : area),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : fallbackMessage);
    }
  };
  const insertCompletedAreaAnchor = (areaId: string, segmentIndex: number, point: { x: number; y: number }) => {
    const area = (draft.drawnAreas ?? []).find((candidate) => candidate.id === areaId);
    const segment = area?.segments[segmentIndex];
    if (!area || area.geometry || !segment) return;
    const split = splitAreaSegment(segment, point);
    const segments = [
      ...area.segments.slice(0, segmentIndex),
      ...split,
      ...area.segments.slice(segmentIndex + 1),
    ];
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      drawnAreas: (draft.drawnAreas ?? []).map((item) => item.id === areaId ? { ...item, segments } : item),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setSelectedAreaAnchor({ areaId, anchorIndex: segmentIndex + 1 });
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That new area point is not valid.");
    }
  };
  const deleteSelectedAreaAnchor = () => {
    if (!selectedAreaAnchor) return false;
    const area = (draft.drawnAreas ?? []).find((candidate) => candidate.id === selectedAreaAnchor.areaId);
    if (!area || area.geometry) return false;
    if (area.segments.length <= 3) {
      setPlacementError("A closed area needs at least three points.");
      return true;
    }
    const anchorIndex = selectedAreaAnchor.anchorIndex;
    const previousIndex = (anchorIndex - 1 + area.segments.length) % area.segments.length;
    const merged = mergeAreaSegmentsAcrossAnchor(area.segments[previousIndex]!, area.segments[anchorIndex]!);
    const segments = anchorIndex === 0
      ? [...area.segments.slice(1, -1), merged]
      : [
        ...area.segments.slice(0, previousIndex),
        merged,
        ...area.segments.slice(anchorIndex + 1),
      ];
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      drawnAreas: (draft.drawnAreas ?? []).map((item) => item.id === area.id ? { ...item, segments } : item),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setSelectedAreaAnchor(null);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That area point cannot be deleted.");
    }
    return true;
  };
  const beginAreaAnchorDrag = (id: string, anchorIndex: number) => {
    const area = (draft.drawnAreas ?? []).find((candidate) => candidate.id === id);
    if (!area || area.geometry || anchorIndex < 0 || anchorIndex >= area.segments.length) return;
    setDragAreaAnchor({ id, anchorIndex, originalSegments: cloneEditorAreaSegments(area.segments) });
    setPlacementError(null);
  };
  const moveAreaAnchor = (point: { x: number; y: number }) => {
    if (!dragAreaAnchor) return;
    const { id, anchorIndex, originalSegments } = dragAreaAnchor;
    const anchor = originalSegments[anchorIndex]?.from;
    if (!anchor) return;
    const moved = {
      x: Math.max(0, Math.min(draft.map.width, point.x)),
      y: Math.max(0, Math.min(draft.map.height, point.y)),
    };
    const delta = { x: moved.x - anchor.x, y: moved.y - anchor.y };
    const previousIndex = (anchorIndex - 1 + originalSegments.length) % originalSegments.length;
    const segments = originalSegments.map((segment, index): TacticalRaisedAreaOutlineSegment => {
      const from = index === anchorIndex ? moved : { ...segment.from };
      const to = index === previousIndex ? moved : { ...segment.to };
      if (segment.kind === "cubic") return {
        ...segment,
        from,
        to,
        control1: index === anchorIndex
          ? { x: segment.control1.x + delta.x, y: segment.control1.y + delta.y }
          : { ...segment.control1 },
        control2: index === previousIndex
          ? { x: segment.control2.x + delta.x, y: segment.control2.y + delta.y }
          : { ...segment.control2 },
      };
      if (segment.kind === "quadratic") return { ...segment, from, to, control: { ...segment.control } };
      return { ...segment, from, to };
    });
    applyCompletedAreaSegments(id, segments, "That area point position is not valid.");
  };
  const cancelAreaAnchorDrag = () => {
    if (!dragAreaAnchor) return;
    setDraft((current) => ({
      ...current,
      drawnAreas: (current.drawnAreas ?? []).map((area) => area.id === dragAreaAnchor.id
        ? { ...area, segments: cloneEditorAreaSegments(dragAreaAnchor.originalSegments) }
        : area),
    }));
    setDragAreaAnchor(null);
    setPlacementError(null);
  };
  const beginAreaCubicControlDrag = (id: string, segmentIndex: number, control: AreaCubicControlDrag["control"]) => {
    const area = (draft.drawnAreas ?? []).find((candidate) => candidate.id === id);
    const segment = area?.segments[segmentIndex];
    if (area?.geometry) return;
    if (segment?.kind !== "cubic") return;
    setDragAreaCubicControl({ id, segmentIndex, control, original: { ...segment[control] } });
    setPlacementError(null);
  };
  const moveAreaCubicControl = (point: { x: number; y: number }) => {
    if (!dragAreaCubicControl) return;
    const control = {
      x: Math.max(0, Math.min(draft.map.width, point.x)),
      y: Math.max(0, Math.min(draft.map.height, point.y)),
    };
    const segments = cloneEditorAreaSegments(
      (draft.drawnAreas ?? []).find((area) => area.id === dragAreaCubicControl.id)?.segments ?? [],
    ).map((segment, index): TacticalRaisedAreaOutlineSegment => index === dragAreaCubicControl.segmentIndex && segment.kind === "cubic"
      ? { ...segment, [dragAreaCubicControl.control]: control }
      : segment);
    applyCompletedAreaSegments(dragAreaCubicControl.id, segments, "That area curve position is not valid.");
  };
  const cancelAreaCubicControlDrag = () => {
    if (!dragAreaCubicControl) return;
    const { id, segmentIndex, control, original } = dragAreaCubicControl;
    setDraft((current) => ({
      ...current,
      drawnAreas: (current.drawnAreas ?? []).map((area) => area.id === id
        ? {
          ...area,
          segments: area.segments.map((segment, index) => index === segmentIndex && segment.kind === "cubic"
            ? { ...segment, [control]: { ...original } }
            : segment),
        }
        : area),
    }));
    setDragAreaCubicControl(null);
    setPlacementError(null);
  };
  const beginConstrainedAreaDrag = (
    id: string,
    kind: ConstrainedAreaDrag["kind"],
    point: { x: number; y: number },
  ) => {
    const geometry = (draft.drawnAreas ?? []).find((area) => area.id === id)?.geometry;
    if (!geometry) return;
    const original = geometry.kind === "circle"
      ? { ...geometry, center: { ...geometry.center } }
      : { ...geometry };
    setDragConstrainedArea({ id, kind, start: { ...point }, original });
    setPlacementError(null);
  };
  const applyConstrainedAreaGeometry = (id: string, geometry: TacticalClosedAreaGeometry, fallbackMessage: string) => {
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      drawnAreas: (draft.drawnAreas ?? []).map((area) => area.id === id
        ? { ...area, geometry, segments: tacticalClosedAreaGeometrySegments(geometry) }
        : area),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : fallbackMessage);
    }
  };
  const updateConstrainedAreaDrag = (point: { x: number; y: number }) => {
    if (!dragConstrainedArea) return;
    const bounded = {
      x: Math.max(0, Math.min(draft.map.width, point.x)),
      y: Math.max(0, Math.min(draft.map.height, point.y)),
    };
    const { id, kind, start, original } = dragConstrainedArea;
    if (original.kind === "circle") {
      const geometry: TacticalClosedAreaGeometry = kind === "circle-center"
        ? {
          ...original,
          center: {
            x: original.center.x + bounded.x - start.x,
            y: original.center.y + bounded.y - start.y,
          },
        }
        : { ...original, radius: Math.hypot(bounded.x - original.center.x, bounded.y - original.center.y) };
      applyConstrainedAreaGeometry(id, geometry, "That circle position is not valid.");
      return;
    }
    if (kind === "rectangle-center") {
      applyConstrainedAreaGeometry(id, {
        ...original,
        x: original.x + bounded.x - start.x,
        y: original.y + bounded.y - start.y,
      }, "That rectangle position is not valid.");
      return;
    }
    const opposite = kind === "rectangle-top-left"
      ? { x: original.x + original.width, y: original.y + original.height }
      : kind === "rectangle-top-right"
        ? { x: original.x, y: original.y + original.height }
        : kind === "rectangle-bottom-right"
          ? { x: original.x, y: original.y }
          : { x: original.x + original.width, y: original.y };
    const geometry: TacticalClosedAreaGeometry = {
      kind: "rectangle",
      x: Math.min(bounded.x, opposite.x),
      y: Math.min(bounded.y, opposite.y),
      width: Math.abs(bounded.x - opposite.x),
      height: Math.abs(bounded.y - opposite.y),
    };
    if (geometry.width < 0.25 || geometry.height < 0.25) {
      setPlacementError("A rectangle must have positive width and height.");
      return;
    }
    applyConstrainedAreaGeometry(id, geometry, "That rectangle size is not valid.");
  };
  const cancelConstrainedAreaDrag = () => {
    if (!dragConstrainedArea) return;
    const { id, original } = dragConstrainedArea;
    setDraft((current) => ({
      ...current,
      drawnAreas: (current.drawnAreas ?? []).map((area) => area.id === id
        ? { ...area, geometry: original, segments: tacticalClosedAreaGeometrySegments(original) }
        : area),
    }));
    setDragConstrainedArea(null);
    setPlacementError(null);
  };
  const beginRaisedAreaControlDrag = (owner: RaisedAreaControlDrag["owner"], segmentIndex: number) => {
    if (owner.kind === "area" && (draft.drawnAreas ?? []).find((area) => area.id === owner.id)?.geometry) return;
    const segment = owner.kind === "area"
      ? (draft.drawnAreas ?? []).find((area) => area.id === owner.id)?.segments[segmentIndex]
      : owner.kind === "raised"
      ? (draft.drawnRaisedAreas ?? []).find((area) => area.id === owner.id)?.segments[segmentIndex]
      : owner.kind === "terrain-region"
        ? (draft.drawnTerrainRegions ?? []).find((region) => region.id === owner.id)?.segments[segmentIndex]
        : raisedAreaDraft?.segments[segmentIndex];
    if (segment?.kind !== "quadratic") return;
    setDragRaisedAreaControl({ owner, segmentIndex, original: { ...segment.control } });
    setPlacementError(null);
  };
  const reshapeRaisedAreaControl = (point: { x: number; y: number }) => {
    if (!dragRaisedAreaControl) return;
    const control = {
      x: Math.max(0, Math.min(draft.map.width, point.x)),
      y: Math.max(0, Math.min(draft.map.height, point.y)),
    };
    if (dragRaisedAreaControl.owner.kind === "area") {
      const ownerId = dragRaisedAreaControl.owner.id;
      const segmentIndex = dragRaisedAreaControl.segmentIndex;
      const candidate: TacticalScenarioDefinitionFile = {
        ...draft,
        drawnAreas: (draft.drawnAreas ?? []).map((area) => area.id === ownerId
          ? { ...area, segments: area.segments.map((segment, index) => index === segmentIndex && segment.kind === "quadratic" ? { ...segment, control } : segment) }
          : area),
      };
      try {
        resolveTacticalScenarioTerrain(candidate);
        setDraft(candidate);
        setPlacementError(null);
      } catch (error) {
        setPlacementError(error instanceof Error ? error.message : "That area curve position is not valid.");
      }
    } else if (dragRaisedAreaControl.owner.kind === "raised") {
      const ownerId = dragRaisedAreaControl.owner.id;
      const segmentIndex = dragRaisedAreaControl.segmentIndex;
      const candidate: TacticalScenarioDefinitionFile = {
        ...draft,
        drawnRaisedAreas: (draft.drawnRaisedAreas ?? []).map((area) => area.id === ownerId
          ? {
            ...area,
            segments: area.segments.map((segment, index) => index === segmentIndex && segment.kind === "quadratic"
              ? { ...segment, control }
              : segment),
          }
          : area),
      };
      try {
        resolveTacticalScenarioTerrain(candidate);
        setDraft(candidate);
        setPlacementError(null);
      } catch (error) {
        setPlacementError(error instanceof Error ? error.message : "That raised-area curve position is not valid.");
      }
    } else if (dragRaisedAreaControl.owner.kind === "terrain-region") {
      const ownerId = dragRaisedAreaControl.owner.id;
      const segmentIndex = dragRaisedAreaControl.segmentIndex;
      const candidate: TacticalScenarioDefinitionFile = {
        ...draft,
        drawnTerrainRegions: (draft.drawnTerrainRegions ?? []).map((region) => region.id === ownerId
          ? {
            ...region,
            segments: region.segments.map((segment, index) => index === segmentIndex && segment.kind === "quadratic"
              ? { ...segment, control }
              : segment),
          }
          : region),
      };
      try {
        resolveTacticalScenarioTerrain(candidate);
        setDraft(candidate);
        setPlacementError(null);
      } catch (error) {
        setPlacementError(error instanceof Error ? error.message : "That terrain-region curve position is not valid.");
      }
    } else {
      setRaisedAreaDraft((current) => current ? {
        ...current,
        segments: current.segments.map((segment, index) => index === dragRaisedAreaControl.segmentIndex && segment.kind === "quadratic"
          ? { ...segment, control }
          : segment),
      } : null);
    }
  };
  const cancelRaisedAreaControlDrag = () => {
    if (!dragRaisedAreaControl) return;
    if (dragRaisedAreaControl.owner.kind === "area") {
      const ownerId = dragRaisedAreaControl.owner.id;
      const segmentIndex = dragRaisedAreaControl.segmentIndex;
      const original = dragRaisedAreaControl.original;
      setDraft((current) => ({
        ...current,
        drawnAreas: (current.drawnAreas ?? []).map((area) => area.id === ownerId
          ? { ...area, segments: area.segments.map((segment, index) => index === segmentIndex && segment.kind === "quadratic" ? { ...segment, control: { ...original } } : segment) }
          : area),
      }));
    } else if (dragRaisedAreaControl.owner.kind === "raised") {
      const ownerId = dragRaisedAreaControl.owner.id;
      const segmentIndex = dragRaisedAreaControl.segmentIndex;
      const original = dragRaisedAreaControl.original;
      setDraft((current) => ({
        ...current,
        drawnRaisedAreas: (current.drawnRaisedAreas ?? []).map((area) => area.id === ownerId
          ? {
            ...area,
            segments: area.segments.map((segment, index) => index === segmentIndex && segment.kind === "quadratic"
              ? { ...segment, control: { ...original } }
              : segment),
          }
          : area),
      }));
    } else if (dragRaisedAreaControl.owner.kind === "terrain-region") {
      const ownerId = dragRaisedAreaControl.owner.id;
      const segmentIndex = dragRaisedAreaControl.segmentIndex;
      const original = dragRaisedAreaControl.original;
      setDraft((current) => ({
        ...current,
        drawnTerrainRegions: (current.drawnTerrainRegions ?? []).map((region) => region.id === ownerId
          ? {
            ...region,
            segments: region.segments.map((segment, index) => index === segmentIndex && segment.kind === "quadratic"
              ? { ...segment, control: { ...original } }
              : segment),
          }
          : region),
      }));
    } else {
      setRaisedAreaDraft((current) => current ? {
        ...current,
        segments: current.segments.map((segment, index) => index === dragRaisedAreaControl.segmentIndex && segment.kind === "quadratic"
          ? { ...segment, control: { ...dragRaisedAreaControl.original } }
          : segment),
      } : null);
    }
    setDragRaisedAreaControl(null);
    setDragAreaAnchor(null);
    setDragAreaCubicControl(null);
    setDragConstrainedArea(null);
    setPlacementError(null);
  };
  const placeWallPortal = (point: { x: number; y: number }) => {
    const kind = wallPortalKindForTool(placementKind);
    if (!kind) return;
    const placement = tacticalEditorPortalPlacementCandidate(draft, point, kind);
    if (!placement) {
      setPlacementError("Move closer to a drawn wall to place the portal.");
      return;
    }
    if (!placement.available) {
      setPlacementError("That wall has no open one-square portal position near this point.");
      return;
    }
    const prefix = kind === "iris-valve" ? "wall-iris-valve" : "wall-door";
    const existingIds = new Set([
      ...(draft.drawnWalls ?? []).flatMap((wall) => (wall.portals ?? []).map((portal) => portal.id)),
      ...(draft.drawnAreas ?? []).flatMap((area) => (area.portals ?? []).map((portal) => portal.id)),
      ...(draft.drawnTerrainPrimitives ?? []).flatMap((primitive) => (primitive.portals ?? []).map((portal) => portal.id)),
    ]);
    let suffix = 1;
    let id = `${prefix}-${suffix}`;
    while (existingIds.has(id)) {
      suffix += 1;
      id = `${prefix}-${suffix}`;
    }
    const circleOwner = (draft.drawnTerrainPrimitives ?? [])
      .some((primitive) => primitive.id === placement.wallId);
    const areaOwner = (draft.drawnAreas ?? [])
      .some((area) => area.id === placement.wallId);
    const candidate: TacticalScenarioDefinitionFile = circleOwner
      ? {
        ...draft,
        drawnTerrainPrimitives: (draft.drawnTerrainPrimitives ?? [])
          .map((primitive) => primitive.id === placement.wallId
            ? { ...primitive, portals: [...(primitive.portals ?? []), { id, kind, position: placement.position }] }
            : primitive),
      }
      : areaOwner
        ? {
          ...draft,
          drawnAreas: (draft.drawnAreas ?? []).map((area) => area.id === placement.wallId
            ? { ...area, portals: [...(area.portals ?? []), { id, kind, position: placement.position }] }
            : area),
        }
      : {
        ...draft,
        drawnWalls: (draft.drawnWalls ?? []).map((wall) => wall.id === placement.wallId
          ? { ...wall, portals: [...(wall.portals ?? []), { id, kind, position: placement.position }] }
          : wall),
      };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setSelectedPlacementId(null);
      setSelectedEnemyId(null);
      setSelectedWallId(null);
      setSelectedPrimitiveId(null);
      setSelectedPortalId(id);
      setSelectedFire(null);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That portal position is not valid.");
    }
  };
  const beginWallEndpointDrag = (id: string, endpoint: WallEndpoint) => {
    const wall = (draft.drawnWalls ?? []).find((candidate) => candidate.id === id);
    if (!wall) return;
    setSelectedWallId(id);
    setDragWallEndpoint({
      id,
      endpoint,
      original: {
        from: { ...wall.from },
        to: { ...wall.to },
        ...(wall.control ? { control: { ...wall.control } } : {}),
      },
    });
    setPlacementError(null);
  };
  const resizeWallEndpoint = (point: { x: number; y: number }) => {
    if (!dragWallEndpoint) return;
    const wall = (draft.drawnWalls ?? []).find((candidate) => candidate.id === dragWallEndpoint.id);
    if (!wall || (wall[dragWallEndpoint.endpoint].x === point.x && wall[dragWallEndpoint.endpoint].y === point.y)) return;
    const candidate = {
      ...draft,
      drawnWalls: (draft.drawnWalls ?? []).map((candidateWall) => candidateWall.id === wall.id
        ? { ...candidateWall, [dragWallEndpoint.endpoint]: gridPoint(point) }
        : candidateWall),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That wall endpoint is not valid.");
    }
  };
  const cancelWallEndpointDrag = () => {
    if (!dragWallEndpoint) return;
    setDraft((current) => ({
      ...current,
      drawnWalls: (current.drawnWalls ?? []).map((wall) => wall.id === dragWallEndpoint.id
        ? {
          ...wall,
          from: { ...dragWallEndpoint.original.from },
          to: { ...dragWallEndpoint.original.to },
          ...(dragWallEndpoint.original.control ? { control: { ...dragWallEndpoint.original.control } } : {}),
        }
        : wall),
    }));
    setDragWallEndpoint(null);
    setPlacementError(null);
  };
  const beginWallMove = (id: string, start: { x: number; y: number }) => {
    const wall = (draft.drawnWalls ?? []).find((candidate) => candidate.id === id);
    if (!wall) return;
    setSelectedWallId(id);
    setSelectedPortalId(null);
    setDragWallMove({
      id,
      start: gridPoint(start),
      original: {
        from: { ...wall.from },
        to: { ...wall.to },
        ...(wall.control ? { control: { ...wall.control } } : {}),
      },
    });
    setPlacementError(null);
  };
  const moveWall = (point: { x: number; y: number }) => {
    if (!dragWallMove) return;
    const delta = {
      x: point.x - dragWallMove.start.x,
      y: point.y - dragWallMove.start.y,
    };
    const from = {
      x: dragWallMove.original.from.x + delta.x,
      y: dragWallMove.original.from.y + delta.y,
    };
    const to = {
      x: dragWallMove.original.to.x + delta.x,
      y: dragWallMove.original.to.y + delta.y,
    };
    const control = dragWallMove.original.control ? {
      x: dragWallMove.original.control.x + delta.x,
      y: dragWallMove.original.control.y + delta.y,
    } : undefined;
    const currentWall = (draft.drawnWalls ?? []).find((wall) => wall.id === dragWallMove.id);
    if (!currentWall || (
      currentWall.from.x === from.x
      && currentWall.from.y === from.y
      && currentWall.to.x === to.x
      && currentWall.to.y === to.y
    )) return;
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      drawnWalls: (draft.drawnWalls ?? []).map((wall) => wall.id === dragWallMove.id
        ? { ...wall, from, to, ...(control ? { control } : {}) }
        : wall),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That wall position is not valid.");
    }
  };
  const cancelWallMove = () => {
    if (!dragWallMove) return;
    setDraft((current) => ({
      ...current,
      drawnWalls: (current.drawnWalls ?? []).map((wall) => wall.id === dragWallMove.id
        ? {
          ...wall,
          from: { ...dragWallMove.original.from },
          to: { ...dragWallMove.original.to },
          ...(dragWallMove.original.control ? { control: { ...dragWallMove.original.control } } : {}),
        }
        : wall),
    }));
    setDragWallMove(null);
    setPlacementError(null);
  };
  const beginWallControlDrag = (id: string) => {
    const wall = (draft.drawnWalls ?? []).find((candidate) => candidate.id === id);
    if (!wall?.control) return;
    setSelectedWallId(id);
    setDragWallControl({ id, original: { ...wall.control } });
    setPlacementError(null);
  };
  const reshapeWallControl = (point: { x: number; y: number }) => {
    if (!dragWallControl) return;
    const wall = (draft.drawnWalls ?? []).find((candidate) => candidate.id === dragWallControl.id);
    if (!wall?.control || (wall.control.x === point.x && wall.control.y === point.y)) return;
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      drawnWalls: (draft.drawnWalls ?? []).map((candidateWall) => candidateWall.id === dragWallControl.id
        ? { ...candidateWall, control: { x: point.x, y: point.y } }
        : candidateWall),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That curve position is not valid.");
    }
  };
  const cancelWallControlDrag = () => {
    if (!dragWallControl) return;
    setDraft((current) => ({
      ...current,
      drawnWalls: (current.drawnWalls ?? []).map((wall) => wall.id === dragWallControl.id
        ? { ...wall, control: { ...dragWallControl.original } }
        : wall),
    }));
    setDragWallControl(null);
    setPlacementError(null);
  };
  const beginWallPortalDrag = (portalId: string) => {
    const wall = (draft.drawnWalls ?? []).find((candidate) => (candidate.portals ?? []).some((portal) => portal.id === portalId));
    const circle = (draft.drawnTerrainPrimitives ?? []).find((candidate) =>
      (candidate.portals ?? []).some((portal) => portal.id === portalId));
    const area = (draft.drawnAreas ?? []).find((candidate) =>
      (candidate.portals ?? []).some((portal) => portal.id === portalId));
    const owner = wall ?? circle ?? area;
    const portal = owner?.portals?.find((candidate) => candidate.id === portalId);
    if (!owner || !portal) return;
    setSelectedWallId(null);
    setSelectedRaisedAreaId(null);
    setSelectedPrimitiveId(null);
    setSelectedPortalId(portalId);
    setDragWallPortal({
      ownerKind: wall ? "wall" : circle ? "circle" : "area",
      ownerId: owner.id,
      portalId,
      originalPosition: portal.position,
    });
    setPlacementError(null);
  };
  const moveWallPortal = (point: { x: number; y: number }) => {
    if (!dragWallPortal) return;
    const placement = dragWallPortal.ownerKind === "wall"
      ? tacticalWallPortalRepositionCandidate(
        draft.drawnWalls ?? [],
        dragWallPortal.ownerId,
        dragWallPortal.portalId,
        point,
      )
      : dragWallPortal.ownerKind === "circle"
        ? tacticalCirclePortalRepositionCandidate(
          draft.drawnTerrainPrimitives ?? [],
          dragWallPortal.ownerId,
          dragWallPortal.portalId,
          point,
        )
        : tacticalAreaBoundaryPortalRepositionCandidate(
          draft.drawnAreas ?? [],
          dragWallPortal.ownerId,
          dragWallPortal.portalId,
          point,
        );
    if (!placement || !placement.available) {
      setPlacementError("Keep the portal on an open one-square position on its wall.");
      return;
    }
    const owner = dragWallPortal.ownerKind === "wall"
      ? (draft.drawnWalls ?? []).find((candidate) => candidate.id === dragWallPortal.ownerId)
      : dragWallPortal.ownerKind === "circle"
        ? (draft.drawnTerrainPrimitives ?? []).find((candidate) => candidate.id === dragWallPortal.ownerId)
        : (draft.drawnAreas ?? []).find((candidate) => candidate.id === dragWallPortal.ownerId);
    const portal = owner?.portals?.find((candidate) => candidate.id === dragWallPortal.portalId);
    if (!portal || Math.abs(portal.position - placement.position) < 1e-9) {
      setPlacementError(null);
      return;
    }
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      ...(dragWallPortal.ownerKind === "wall"
        ? {
          drawnWalls: (draft.drawnWalls ?? []).map((candidateWall) => candidateWall.id === dragWallPortal.ownerId
            ? {
              ...candidateWall,
              portals: (candidateWall.portals ?? []).map((candidatePortal) => candidatePortal.id === dragWallPortal.portalId
                ? { ...candidatePortal, position: placement.position }
                : candidatePortal),
            }
            : candidateWall),
        }
        : dragWallPortal.ownerKind === "circle" ? {
          drawnTerrainPrimitives: (draft.drawnTerrainPrimitives ?? []).map((circle) => circle.id === dragWallPortal.ownerId
            ? {
              ...circle,
              portals: (circle.portals ?? []).map((candidatePortal) => candidatePortal.id === dragWallPortal.portalId
                ? { ...candidatePortal, position: placement.position }
                : candidatePortal),
            }
            : circle),
        } : {
          drawnAreas: (draft.drawnAreas ?? []).map((area) => area.id === dragWallPortal.ownerId
            ? {
              ...area,
              portals: (area.portals ?? []).map((candidatePortal) => candidatePortal.id === dragWallPortal.portalId
                ? { ...candidatePortal, position: placement.position }
                : candidatePortal),
            }
            : area),
        }),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That portal position is not valid.");
    }
  };
  const cancelWallPortalDrag = () => {
    if (!dragWallPortal) return;
    setDraft((current) => ({
      ...current,
      ...(dragWallPortal.ownerKind === "wall"
        ? {
          drawnWalls: (current.drawnWalls ?? []).map((wall) => wall.id === dragWallPortal.ownerId
            ? {
              ...wall,
              portals: (wall.portals ?? []).map((portal) => portal.id === dragWallPortal.portalId
                ? { ...portal, position: dragWallPortal.originalPosition }
                : portal),
            }
            : wall),
        }
        : dragWallPortal.ownerKind === "circle" ? {
          drawnTerrainPrimitives: (current.drawnTerrainPrimitives ?? []).map((circle) => circle.id === dragWallPortal.ownerId
            ? {
              ...circle,
              portals: (circle.portals ?? []).map((portal) => portal.id === dragWallPortal.portalId
                ? { ...portal, position: dragWallPortal.originalPosition }
                : portal),
            }
            : circle),
        } : {
          drawnAreas: (current.drawnAreas ?? []).map((area) => area.id === dragWallPortal.ownerId
            ? {
              ...area,
              portals: (area.portals ?? []).map((portal) => portal.id === dragWallPortal.portalId
                ? { ...portal, position: dragWallPortal.originalPosition }
                : portal),
            }
            : area),
        }),
    }));
    setDragWallPortal(null);
    setPlacementError(null);
  };
  const beginOrFinishRamp = (point: EditorMapPoint) => {
    if (!rampDraft) {
      const candidates = tacticalElevationEdgeCandidates(draft);
      const edge = tacticalNearestElevationEdgeCandidate(candidates, point);
      if (!edge) {
        setPlacementError(candidates.length === 0
          ? "No unused adjacent-level edge is available for a ramp."
          : "Move closer to a highlighted edge to begin the ramp.");
        return;
      }
      setRampDraft({ edge });
      setPlacementHover(point);
      setSelectedPlacementId(null);
      setSelectedEnemyId(null);
      setSelectedWallId(null);
      setSelectedRaisedAreaId(null);
      setSelectedElevationTransitionId(null);
      setSelectedPortalId(null);
      setSelectedFire(null);
      setPlacementError(`Extend the ramp at least 2 squares outward, then click again.`);
      return;
    }
    try {
      const candidate = tacticalRampPlacementCandidate(draft, rampDraft.edge, point);
      setDraft(candidate.definition);
      setRampDraft(null);
      setSelectedElevationTransitionId(candidate.transition.id);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That ramp is not valid.");
    }
  };
  const placeTerrain = (origin: EditorMapPoint) => {
    if (!placementKind) return;
    const transitionKind = elevationTransitionKindForTool(placementKind);
    if (transitionKind) {
      if (transitionKind === "ramp") return;
      try {
        const candidate = tacticalElevationTransitionPlacementCandidate(draft, transitionKind, origin);
        setDraft(candidate.definition);
        setSelectedElevationTransitionId(candidate.transition.id);
        setSelectedPlacementId(null);
        setSelectedEnemyId(null);
        setSelectedWallId(null);
        setSelectedRaisedAreaId(null);
        setSelectedPortalId(null);
        setSelectedFire(null);
        setPlacementError(null);
      } catch (error) {
        setPlacementError(error instanceof Error ? error.message : "That elevation transition is not valid.");
      }
      return;
    }
    if (placementKind === FIRE_TOOL_ID) {
      const inBounds = origin.x >= 0 && origin.y >= 0 && origin.x < draft.map.width && origin.y < draft.map.height;
      if (!inBounds) {
        setPlacementError("Fire must be placed inside the map.");
        return;
      }
      if (draft.fireCells.some((cell) => cellKey(cell) === cellKey(origin))) {
        setPlacementError(`A fire already exists at ${cellKey(origin)}.`);
        return;
      }
      setDraft({ ...draft, fireCells: [...draft.fireCells, gridPoint(origin)] });
      setPlacementError(null);
      return;
    }
    const naturalKind = naturalTerrainKindForTool(placementKind);
    if (naturalKind) {
      const usedIds = new Set([
        ...draft.terrainPlacements.map((placement) => placement.id),
        ...(draft.drawnWalls ?? []).map((wall) => wall.id),
        ...(draft.drawnRaisedAreas ?? []).map((area) => area.id),
        ...(draft.drawnTerrainRegions ?? []).map((region) => region.id),
        ...(draft.drawnTerrainPrimitives ?? []).map((primitive) => primitive.id),
        ...(draft.naturalTerrainPlacements ?? []).map((placement) => placement.id),
      ]);
      let suffix = 1;
      let id = `${naturalKind}-${suffix}`;
      while (usedIds.has(id)) {
        suffix += 1;
        id = `${naturalKind}-${suffix}`;
      }
      const placement: TacticalNaturalTerrainPlacement = {
        id,
        kind: naturalKind,
        position: gridPoint(origin),
        radius: defaultNaturalTerrainRadius(naturalKind),
      };
      const candidate: TacticalScenarioDefinitionFile = {
        ...draft,
        naturalTerrainPlacements: [...(draft.naturalTerrainPlacements ?? []), placement],
      };
      try {
        resolveTacticalScenarioTerrain(candidate);
        if (naturalKind === "tree" && (candidate.enemyPlacements ?? [])
          .some((enemy) => cellKey(enemy.position) === cellKey(placement.position))) {
          throw new Error(`Tree ${id} cannot overlap an enemy.`);
        }
        setDraft(candidate);
        setSelectedNaturalTerrainId(id);
        setObjectPropertiesLayout((current) => ({ ...current, visible: true }));
        setSelectedPlacementId(null);
        setSelectedEnemyId(null);
        setPlacementError(null);
      } catch (error) {
        setPlacementError(error instanceof Error ? error.message : "That natural terrain placement is not valid.");
      }
      return;
    }
    let suffix = 1;
    let id = `${placementKind}-${suffix}`;
    while (draft.terrainPlacements.some((placement) => placement.id === id)) {
      suffix += 1;
      id = `${placementKind}-${suffix}`;
    }
    let lastError = "That terrain placement is not valid.";
    for (const placementCandidate of placementCandidates(placementKind, origin)) {
      const placement: TacticalTerrainPlacement = { id, terrainDefinitionId: placementKind, origin: placementCandidate.origin, rotation: placementCandidate.rotation };
      const candidate = { ...draft, terrainPlacements: [...draft.terrainPlacements, placement] };
      try {
        const terrain = resolveTacticalScenarioTerrain(candidate);
        const deploymentCells = new Set(terrain.deploymentCells.map(cellKey));
        const enemy = (candidate.enemyPlacements ?? []).find((item) => deploymentCells.has(cellKey(item.position)));
        if (enemy) throw new Error(`Enemy ${enemy.name} cannot occupy the crew deployment zone at ${cellKey(enemy.position)}.`);
        setDraft(candidate);
        setPlacementError(null);
        setSelectedPlacementId(id);
        setSelectedEnemyId(null);
        if (tacticalPlacementSupportsConsoleOperations(placement)) setConsoleEditorLayout((current) => ({ ...current, visible: true }));
        return;
      } catch (error) {
        lastError = error instanceof Error ? error.message : lastError;
      }
    }
    setPlacementError(lastError);
  };
  const enemyPositionError = (position: { x: number; y: number }, ignoredEnemyId?: string) => {
    const positionKey = cellKey(position);
    if (position.x < 0 || position.y < 0 || position.x >= draft.map.width || position.y >= draft.map.height) return "Enemies must be placed inside the map.";
    if ((draft.enemyPlacements ?? []).some((enemy) => enemy.id !== ignoredEnemyId && cellKey(enemy.position) === positionKey)) return `Another enemy already occupies ${positionKey}.`;
    const terrain = resolveTacticalScenarioTerrain(draft);
    if (terrain.objects.some((object) => cellKey(object.position) === positionKey)
      || terrain.closeMachineryCells.some((cell) => cellKey(cell) === positionKey)
      || terrain.treeTrunkCells.some((cell) => cellKey(cell) === positionKey)) return `An enemy cannot occupy blocked terrain at ${positionKey}.`;
    if (terrain.deploymentCells.some((cell) => cellKey(cell) === positionKey)) return `An enemy cannot occupy the crew deployment zone at ${positionKey}.`;
    return null;
  };
  const placeEnemy = (position: { x: number; y: number }) => {
    if (!enemyKind) return;
    const error = enemyPositionError(position);
    if (error) { setPlacementError(error); return; }
    let suffix = 1;
    let id = `${enemyKind}-${suffix}`;
    while ((draft.enemyPlacements ?? []).some((enemy) => enemy.id === id)) { suffix += 1; id = `${enemyKind}-${suffix}`; }
    const label = tacticalEnemyPalette.find((enemy) => enemy.id === enemyKind)?.label ?? "Enemy";
    const enemy: TacticalEnemyPlacement = { id, type: enemyKind, name: `${label} ${suffix}`, position: gridPoint(position), facing: "north", avatarPath: randomTacticalEnemyAvatarPath() };
    setDraft({ ...draft, enemyPlacements: [...(draft.enemyPlacements ?? []), enemy] });
    setSelectedPlacementId(null);
    setSelectedEnemyId(id);
    setSelectedFire(null);
    setPlacementError(null);
    setEnemyEditorLayout((current) => ({ ...current, visible: true }));
  };
  const moveEnemy = (id: string, position: { x: number; y: number }) => {
    const enemy = (draft.enemyPlacements ?? []).find((item) => item.id === id);
    if (!enemy || cellKey(enemy.position) === cellKey(position)) return;
    const error = enemyPositionError(position, id);
    if (error) { setPlacementError(error); return; }
    setDraft({ ...draft, enemyPlacements: (draft.enemyPlacements ?? []).map((item) => item.id === id ? { ...item, position: gridPoint(position) } : item) });
    setPlacementError(null);
  };
  const selectedPlacement = draft.terrainPlacements.find((placement) => placement.id === selectedPlacementId) ?? null;
  const selectedEnemy = (draft.enemyPlacements ?? []).find((enemy) => enemy.id === selectedEnemyId) ?? null;
  const selectedEnemyLocked = Boolean(selectedEnemyId && lockedLayerKeys.has(tacticalEditorLayerKey("enemy", selectedEnemyId)));
  const selectedWall = (draft.drawnWalls ?? []).find((wall) => wall.id === selectedWallId) ?? null;
  const selectedArea = (draft.drawnAreas ?? []).find((area) => area.id === selectedRaisedAreaId) ?? null;
  const selectedRaisedArea = (draft.drawnRaisedAreas ?? []).find((area) => area.id === selectedRaisedAreaId) ?? null;
  const selectedTerrainRegion = (draft.drawnTerrainRegions ?? []).find((region) => region.id === (selectedTerrainRegionId ?? selectedRaisedAreaId)) ?? null;
  const selectedPrimitive = (draft.drawnTerrainPrimitives ?? [])
    .find((primitive) => primitive.id === selectedPrimitiveId) ?? null;
  const selectedNaturalTerrain = (draft.naturalTerrainPlacements ?? [])
    .find((placement) => placement.id === selectedNaturalTerrainId) ?? null;
  const editableObjectProperties = Boolean(selectedNaturalTerrain || selectedTerrainRegion?.kind === "liquid-hydrogen");
  const selectedElevationTransition = (draft.elevationTransitions ?? []).find((transition) => transition.id === selectedElevationTransitionId) ?? null;
  const selectedPortalWall = (draft.drawnWalls ?? []).find((wall) => (wall.portals ?? []).some((portal) => portal.id === selectedPortalId)) ?? null;
  const selectedPortalCircle = (draft.drawnTerrainPrimitives ?? []).find((primitive) =>
    (primitive.portals ?? []).some((portal) => portal.id === selectedPortalId)) ?? null;
  const selectedPortalArea = (draft.drawnAreas ?? []).find((area) =>
    (area.portals ?? []).some((portal) => portal.id === selectedPortalId)) ?? null;
  const selectedPortalOwner = selectedPortalWall ?? selectedPortalCircle ?? selectedPortalArea;
  const selectedPortal = selectedPortalOwner?.portals?.find((portal) => portal.id === selectedPortalId) ?? null;
  const selectedHasTerminal = Boolean(selectedPlacement && tacticalPlacementSupportsConsoleOperations(selectedPlacement));
  const selectedIsInteractiveHuman = selectedPlacement?.terrainDefinitionId === "interactive-human";
  const layerGroups = useMemo(() => tacticalEditorLayerGroups(draft), [draft]);
  const previewDefinition = useMemo(
    () => tacticalEditorVisibleDefinition(draft, hiddenLayerKeys),
    [draft, hiddenLayerKeys],
  );
  const selectTerrainPlacement = (id: string | null) => {
    if (id) selectObject({ kind: "terrain-placement", id });
    else clearObjectKind("terrain-placement");
    setSelectedOperationId(id ? consoleVictory.operations.find((operation) => operation.consolePlacementId === id)?.id ?? null : null);
    if (!id) return;
    const placement = draft.terrainPlacements.find((item) => item.id === id);
    if (placement && tacticalPlacementSupportsConsoleOperations(placement)) {
      setConsoleEditorLayout((current) => ({ ...current, visible: true }));
    }
  };
  const selectEnemy = (id: string | null) => {
    if (id) selectObject({ kind: "enemy", id });
    else clearObjectKind("enemy");
    if (!id) return;
    setEnemyEditorLayout((current) => ({ ...current, visible: true }));
  };
  const selectTerrainPrimitive = (id: string | null) => {
    if (id) selectObject({ kind: "legacy-circle", id });
    else clearObjectKind("legacy-circle");
    if (!id) return;
    const primitive = (draft.drawnTerrainPrimitives ?? [])
      .find((candidate) => candidate.id === id);
    if (primitive) {
      setCircleTerrainType(primitive.terrainType);
      setCirclePropertiesLayout((current) => ({ ...current, visible: true }));
    }
  };
  const selectNaturalTerrain = (id: string | null) => {
    if (id) selectObject({ kind: "natural-terrain", id });
    else clearObjectKind("natural-terrain");
    if (!id) return;
    setObjectPropertiesLayout((current) => ({ ...current, visible: true }));
  };
  const selectedConsoleOperations = selectedPlacement ? consoleVictory.operations.filter((operation) => operation.consolePlacementId === selectedPlacement.id) : [];
  const selectedOperation = consoleVictory.operations.find((operation) => operation.id === selectedOperationId) ?? null;
  const updateConsoleOperation = (id: string, update: (operation: TacticalConsoleOperation) => TacticalConsoleOperation) => setConsoleVictory((current) => ({ ...current, operations: current.operations.map((operation) => operation.id === id ? update(operation) : operation) }));
  const addConsoleOperation = () => {
    if (!selectedPlacement || !selectedHasTerminal) return;
    let suffix = selectedConsoleOperations.length + 1;
    let id = `${selectedPlacement.id}-operation-${suffix}`;
    while (consoleVictory.operations.some((operation) => operation.id === id)) { suffix += 1; id = `${selectedPlacement.id}-operation-${suffix}`; }
    const victoryExists = consoleVictory.operations.some((operation) => operation.result.type === "victory");
    const operation: TacticalConsoleOperation = {
      id,
      consolePlacementId: selectedPlacement.id,
      label: `${selectedIsInteractiveHuman ? "Interact with" : "Operate"} ${selectedPlacement.objectSettings?.terminal?.label ?? (selectedIsInteractiveHuman ? "Interactive Human" : "Console")}`,
      prerequisites: { mode: "all", operationIds: [] },
      checks: [{ id: `${id}-check-1`, skill: selectedIsInteractiveHuman ? "Persuade" : "Security", difficulty: "average", apCost: 6 }],
      criticalSuccessNextCheckModifier: 2,
      criticalFailureNextCheckModifier: -2,
      result: victoryExists ? { type: "unlock", operationIds: [] } : { type: "victory" },
      ...(selectedIsInteractiveHuman ? { successTransformation: "ally" as const, failureTransformation: "enemy" as const } : {}),
    };
    setConsoleVictory((current) => ({ ...current, operations: [...current.operations, operation] }));
    setSelectedOperationId(id);
  };
  const deleteSelectedOperation = () => {
    if (!selectedOperation) return;
    setConsoleVictory((current) => ({ ...current, operations: current.operations.filter((operation) => operation.id !== selectedOperation.id).map((operation) => ({
      ...operation,
      prerequisites: { ...operation.prerequisites, operationIds: operation.prerequisites.operationIds.filter((id) => id !== selectedOperation.id) },
      result: operation.result.type === "unlock" ? { ...operation.result, operationIds: operation.result.operationIds.filter((id) => id !== selectedOperation.id) } : operation.result,
    })) }));
    setSelectedOperationId(null);
  };
  const selectedIsLiquidHydrogen = selectedPlacement?.terrainDefinitionId.startsWith("liquid-hydrogen-") ?? false;
  const updateSelectedTerminal = (settings: { label?: string; terminalKind?: TacticalTerminalKind; facing?: TacticalTerrainPlacement["rotation"]; operational?: boolean; completesScenario?: boolean; combatProfile?: TacticalInteractiveHumanCombatProfile }) => {
    if (!selectedPlacement || !selectedHasTerminal) return;
    updatePlacements(draft.terrainPlacements.map((placement) => placement.id === selectedPlacement.id ? {
      ...placement,
      objectSettings: {
        ...placement.objectSettings,
        terminal: { ...placement.objectSettings?.terminal, ...settings },
      },
    } : placement));
  };
  const selectedHumanCombatProfile = selectedPlacement?.objectSettings?.terminal?.combatProfile ?? defaultTacticalInteractiveHumanCombatProfile;
  const updateSelectedHumanCombatProfile = (settings: Partial<TacticalInteractiveHumanCombatProfile>) => updateSelectedTerminal({ combatProfile: { ...selectedHumanCombatProfile, skills: selectedHumanCombatProfile.skills.map((skill) => ({ ...skill })), ...settings } });
  const rotateSelectedPlacement = () => {
    if (!selectedPlacement) return;
    const rotation = ((selectedPlacement.rotation + 90) % 360) as TacticalTerrainPlacement["rotation"];
    updatePlacements(draft.terrainPlacements.map((placement) => placement.id === selectedPlacement.id ? { ...placement, rotation } : placement));
  };
  const updateSelectedLiquidHydrogen = (filled: boolean) => {
    if (!selectedPlacement || !selectedIsLiquidHydrogen) return;
    updatePlacements(draft.terrainPlacements.map((placement) => placement.id === selectedPlacement.id ? { ...placement, terrainSettings: { ...placement.terrainSettings, filled } } : placement));
  };
  const removePlacementConsoleOperations = useCallback((placementId: string) => {
    setConsoleVictory((current) => removeConsolePlacementOperations(current, placementId));
    dispatch(editorOperationSelected(null));
  }, [dispatch, setConsoleVictory]);
  const updateSelectedEnemyName = (name: string) => {
    if (!selectedEnemy || selectedEnemyLocked) return;
    setDraft((current) => ({ ...current, enemyPlacements: (current.enemyPlacements ?? []).map((enemy) => enemy.id === selectedEnemy.id ? { ...enemy, name } : enemy) }));
  };
  const rotateSelectedEnemy = () => {
    if (!selectedEnemy || selectedEnemyLocked) return;
    const facings = ["north", "east", "south", "west"] as const;
    const facing = facings[(facings.indexOf(selectedEnemy.facing ?? "north") + 1) % facings.length];
    setDraft((current) => ({ ...current, enemyPlacements: (current.enemyPlacements ?? []).map((enemy) => enemy.id === selectedEnemy.id ? { ...enemy, facing } : enemy) }));
  };
  const deleteSelectedEnemy = () => {
    if (!selectedEnemy || selectedEnemyLocked) return;
    setDraft((current) => ({ ...current, enemyPlacements: (current.enemyPlacements ?? []).filter((enemy) => enemy.id !== selectedEnemy.id) }));
    setSelectedEnemyId(null);
    setPlacementError(null);
  };
  const updateSelectedArea = (updates: Partial<NonNullable<TacticalScenarioDefinitionFile["drawnAreas"]>[number]>) => {
    if (!selectedArea) return;
    const normalizedUpdates = updates.boundary === "none"
      ? { ...updates, portals: undefined }
      : updates;
    const candidate = {
      ...draft,
      drawnAreas: (draft.drawnAreas ?? []).map((area) => area.id === selectedArea.id ? { ...area, ...normalizedUpdates } : area),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That area configuration is invalid.");
    }
  };
  const deleteSelectedArea = () => {
    if (!selectedArea) return;
    setDraft((current) => ({ ...current, drawnAreas: (current.drawnAreas ?? []).filter((area) => area.id !== selectedArea.id) }));
    setSelectedRaisedAreaId(null);
    setPlacementError(null);
  };
  const deleteSelectedTerrainRegion = () => {
    if (!selectedTerrainRegion) return;
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      drawnTerrainRegions: (draft.drawnTerrainRegions ?? []).filter((region) => region.id !== selectedTerrainRegion.id),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setSelectedTerrainRegionId(null);
      setSelectedRaisedAreaId(null);
      setDragRaisedAreaControl(null);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That terrain region cannot be deleted.");
    }
  };
  const updateSelectedTerrainRegionFilled = (filled: boolean) => {
    if (selectedTerrainRegion?.kind !== "liquid-hydrogen") return;
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      drawnTerrainRegions: (draft.drawnTerrainRegions ?? []).map((region) => region.id === selectedTerrainRegion.id && region.kind === "liquid-hydrogen"
        ? { ...region, settings: { ...region.settings, filled } }
        : region),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That liquid-hydrogen setting is not valid.");
    }
  };
  const updateSelectedNaturalTerrainRadius = (radius: number) => {
    if (!selectedNaturalTerrain || !Number.isFinite(radius)) return;
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      naturalTerrainPlacements: (draft.naturalTerrainPlacements ?? [])
        .map((placement) => placement.id === selectedNaturalTerrain.id
          ? { ...placement, radius }
          : placement),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That natural terrain radius is not valid.");
    }
  };
  const deleteSelectedNaturalTerrain = () => {
    if (!selectedNaturalTerrain) return;
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      naturalTerrainPlacements: (draft.naturalTerrainPlacements ?? [])
        .filter((placement) => placement.id !== selectedNaturalTerrain.id),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setSelectedNaturalTerrainId(null);
      setDragNaturalTerrain(null);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That natural terrain cannot be deleted.");
    }
  };
  const updateSelectedPrimitive = (
    update: Partial<Pick<TacticalDrawnCirclePrimitive, "center" | "radius" | "terrainType" | "settings" | "portals">>,
  ) => {
    if (!selectedPrimitive) return;
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      drawnTerrainPrimitives: (draft.drawnTerrainPrimitives ?? [])
        .map((primitive) => primitive.id === selectedPrimitive.id
          ? { ...primitive, ...update }
          : primitive),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That circle setting is not valid.");
    }
  };
  const updateSelectedPrimitiveType = (terrainType: TacticalTerrainPrimitiveType) => {
    updateSelectedPrimitive({
      terrainType,
      ...(terrainType === "liquid-hydrogen"
        ? { settings: { filled: selectedPrimitive?.settings?.filled ?? true } }
        : { settings: undefined }),
      ...(terrainType === "wall" ? {} : { portals: undefined }),
    });
  };
  const deleteSelectedPrimitive = () => {
    if (!selectedPrimitive) return;
    try {
      const candidate = removeDrawnTerrainPrimitiveCandidate(draft, selectedPrimitive.id);
      setDraft(candidate.definition);
      setSelectedPrimitiveId(null);
      setDragCirclePrimitive(null);
      setPlacementError(candidate.removedTransitionIds.length > 0
        ? `Deleted the circle and ${candidate.removedTransitionIds.length} attached elevation ${candidate.removedTransitionIds.length === 1 ? "transition" : "transitions"}.`
        : null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That circle cannot be deleted.");
    }
  };
  const deleteSelectionForKeyboard = (key: "Delete" | "Backspace") => {
      if (primaryTool === "node" && selectedAreaAnchor) {
        deleteSelectedAreaAnchor();
        return true;
      }
      if (key !== "Delete" && !selectedPlacement) return false;
      if (selectedPlacement) {
        const candidate = { ...draft, terrainPlacements: draft.terrainPlacements.filter((placement) => placement.id !== selectedPlacement.id) };
        try {
          resolveTacticalScenarioTerrain(candidate);
          setDraft(candidate);
          removePlacementConsoleOperations(selectedPlacement.id);
          setSelectedPlacementId(null);
          setPlacementError(null);
        } catch (error) {
          setPlacementError(error instanceof Error ? error.message : "That terrain placement cannot be deleted.");
        }
      } else if (selectedEnemy) {
        if (selectedEnemyLocked) return false;
        setDraft((current) => ({ ...current, enemyPlacements: (current.enemyPlacements ?? []).filter((enemy) => enemy.id !== selectedEnemy.id) }));
        setSelectedEnemyId(null);
        setPlacementError(null);
      } else if (selectedNaturalTerrain) {
        const candidate: TacticalScenarioDefinitionFile = {
          ...draft,
          naturalTerrainPlacements: (draft.naturalTerrainPlacements ?? [])
            .filter((placement) => placement.id !== selectedNaturalTerrain.id),
        };
        try {
          resolveTacticalScenarioTerrain(candidate);
          setDraft(candidate);
          setSelectedNaturalTerrainId(null);
          setDragNaturalTerrain(null);
          setPlacementError(null);
        } catch (error) {
          setPlacementError(error instanceof Error ? error.message : "That natural terrain cannot be deleted.");
        }
      } else if (selectedPrimitive) {
        try {
          const candidate = removeDrawnTerrainPrimitiveCandidate(draft, selectedPrimitive.id);
          setDraft(candidate.definition);
          setSelectedPrimitiveId(null);
          setDragCirclePrimitive(null);
          setPlacementError(candidate.removedTransitionIds.length > 0
            ? `Deleted the circle and ${candidate.removedTransitionIds.length} attached elevation ${candidate.removedTransitionIds.length === 1 ? "transition" : "transitions"}.`
            : null);
        } catch (error) {
          setPlacementError(error instanceof Error ? error.message : "That circle cannot be deleted.");
        }
      } else if (selectedArea) {
        setDraft((current) => ({ ...current, drawnAreas: (current.drawnAreas ?? []).filter((area) => area.id !== selectedArea.id) }));
        setSelectedRaisedAreaId(null);
        setPlacementError(null);
      } else if (selectedRaisedArea) {
        try {
          const candidate = removeDrawnRaisedAreaCandidate(draft, selectedRaisedArea.id);
          setDraft(candidate.definition);
          setSelectedRaisedAreaId(null);
          setDragRaisedAreaControl(null);
          setPlacementError(candidate.removedTransitionIds.length > 0
            ? `Deleted the raised area and ${candidate.removedTransitionIds.length} attached elevation ${candidate.removedTransitionIds.length === 1 ? "transition" : "transitions"}.`
            : null);
        } catch (error) {
          setPlacementError(error instanceof Error ? error.message : "That raised area cannot be deleted.");
        }
      } else if (selectedTerrainRegion) {
        const candidate: TacticalScenarioDefinitionFile = {
          ...draft,
          drawnTerrainRegions: (draft.drawnTerrainRegions ?? []).filter((region) => region.id !== selectedTerrainRegion.id),
        };
        try {
          resolveTacticalScenarioTerrain(candidate);
          setDraft(candidate);
          setSelectedTerrainRegionId(null);
          setSelectedRaisedAreaId(null);
          setDragRaisedAreaControl(null);
          setPlacementError(null);
        } catch (error) {
          setPlacementError(error instanceof Error ? error.message : "That terrain region cannot be deleted.");
        }
      } else if (selectedWall) {
        const candidate = { ...draft, drawnWalls: (draft.drawnWalls ?? []).filter((wall) => wall.id !== selectedWall.id) };
        try {
          resolveTacticalScenarioTerrain(candidate);
          setDraft(candidate);
          setSelectedWallId(null);
          setDragWallEndpoint(null);
          setDragWallMove(null);
          setDragWallControl(null);
          setPlacementError(null);
        } catch (error) {
          setPlacementError(error instanceof Error ? error.message : "That wall cannot be deleted.");
        }
      } else if (selectedPortal && selectedPortalOwner) {
        const candidate = {
          ...draft,
          ...(selectedPortalWall
            ? {
              drawnWalls: (draft.drawnWalls ?? []).map((wall) => wall.id === selectedPortalWall.id
                ? { ...wall, portals: (wall.portals ?? []).filter((portal) => portal.id !== selectedPortal.id) }
                : wall),
            }
            : {
              drawnTerrainPrimitives: (draft.drawnTerrainPrimitives ?? []).map((circle) => circle.id === selectedPortalCircle?.id
                ? { ...circle, portals: (circle.portals ?? []).filter((portal) => portal.id !== selectedPortal.id) }
                : circle),
            }),
        };
        try {
          resolveTacticalScenarioTerrain(candidate);
          setDraft(candidate);
          setSelectedPortalId(null);
          setPlacementError(null);
        } catch (error) {
          setPlacementError(error instanceof Error ? error.message : "That portal cannot be deleted.");
        }
      } else if (selectedElevationTransition) {
        const candidate = {
          ...draft,
          elevationTransitions: (draft.elevationTransitions ?? []).filter((transition) => transition.id !== selectedElevationTransition.id),
        };
        try {
          resolveTacticalScenarioTerrain(candidate);
          setDraft(candidate);
          setSelectedElevationTransitionId(null);
          setPlacementError(null);
        } catch (error) {
          setPlacementError(error instanceof Error ? error.message : "That elevation transition cannot be deleted.");
        }
      } else if (selectedFire) {
        setDraft((current) => ({ ...current, fireCells: current.fireCells.filter((cell) => cellKey(cell) !== cellKey(selectedFire)) }));
        setSelectedFire(null);
        setPlacementError(null);
      } else return false;
      return true;
  };
  const undoPenAreaNode = () => {
    setRaisedAreaDraft((current) => {
      if (!current) return null;
      const removed = current.segments.at(-1);
      if (!removed) return null;
      return {
        ...current,
        segments: current.segments.slice(0, -1),
        current: gridPoint(removed.from),
        hover: gridPoint(removed.from),
        outgoingControl: removed.kind === "cubic" ? gridPoint(removed.control1) : null,
      };
    });
    setPlacementError(null);
  };
  const cancelPenArea = () => {
    setRaisedAreaDraft(null);
    setDragRaisedAreaControl(null);
    setPlacementError(null);
  };
  const cancelRampDrawing = () => {
    setRampDraft(null);
    setPlacementError(null);
  };
  const cancelCircleDrawing = () => {
    setCircleDraft(null);
    setPlacementError(null);
  };
  const beginPlaytest = () => {
    if (playtestBlocked || draft.map.width < 1 || draft.map.height < 1) return;
    setPlaytest({ definition: cloneTacticalScenarioDefinition(draft), consoleVictory: cloneTacticalConsoleVictoryDefinition(consoleVictory), sandbox: createAppStore(store.getState()) });
  };
  const clearEditorTransientState = () => {
    clearInteractionState();
  };
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
  const clearEditorSelection = () => {
    dispatch(editorSelectionCleared());
    setPlacementKind(null);
    setEnemyKind(null);
    clearEditorTransientState();
  };
  const discardDraftChanges = () => {
    if (!dirty || !window.confirm("Discard all unsaved changes and return to the last loaded or saved version?")) return;
    dispatch(editorDocumentDiscarded());
    clearEditorSelection();
    dispatch(editorFileMessageChanged({ kind: "success", text: "Discarded unsaved draft changes." }));
  };
  const clearActiveToolDrafts = (preserveAreaTarget: RaisedAreaDraft["target"] | null = null) => {
    setPlacementHover(null);
    setEnemyHover(null);
    setPortalHover(null);
    setWallDraft(null);
    setCircleDraft(null);
    setRampDraft(null);
    if (!preserveAreaTarget || raisedAreaDraft?.target !== preserveAreaTarget) {
      setRaisedAreaDraft(null);
      setDragRaisedAreaControl(null);
    }
    setPlacementError(null);
  };
  const activatePrimaryTool = (tool: "select" | "node" | "hand") => {
    setPrimaryTool(tool);
    clearActiveToolDrafts();
  };
  const activateDrawingTool = (tool: string) => {
    const nextAreaTarget = areaTargetForTool(tool);
    setPlacementKind(tool);
    clearActiveToolDrafts(nextAreaTarget);
    if (tool === CIRCLE_TOOL_ID) {
      setCirclePropertiesLayout((current) => ({ ...current, visible: true }));
    }
  };
  const activateEnemyTool = (kind: TacticalEnemyType) => {
    setEnemyKind(kind);
    clearActiveToolDrafts();
  };
  const selectEditorLayerObject = (object: TacticalEditorLayerObject) => {
    if (lockedLayerKeys.has(object.key) && object.kind !== "enemy") return;
    clearEditorSelection();
    setPrimaryTool("select");
    if (object.kind === "terrain-placement") selectTerrainPlacement(object.id);
    else if (object.kind === "enemy") selectEnemy(object.id);
    else if (object.kind === "wall") setSelectedWallId(object.id);
    else if (object.kind === "area" || object.kind === "raised-area") {
      setSelectedRaisedAreaId(object.id);
      if (object.kind === "area") setAreaPropertiesLayout((current) => ({ ...current, visible: true }));
    }
    else if (object.kind === "terrain-region") {
      setSelectedRaisedAreaId(object.id);
      setSelectedTerrainRegionId(object.id);
      setObjectPropertiesLayout((current) => ({ ...current, visible: true }));
    } else if (object.kind === "primitive") selectTerrainPrimitive(object.id);
    else if (object.kind === "natural-terrain") selectNaturalTerrain(object.id);
    else if (object.kind === "elevation-transition") setSelectedElevationTransitionId(object.id);
    else if (object.kind === "portal") setSelectedPortalId(object.id);
    else if (object.kind === "fire") {
      const [x, y] = object.id.split(":").map(Number);
      setSelectedFire({ x, y });
    }
  };
  const moveEditorLayerObject = (object: TacticalEditorLayerObject, direction: -1 | 1) => {
    setDraft((current) => {
      if (object.kind === "terrain-placement") {
        const index = current.terrainPlacements.findIndex((item) => item.id === object.id);
        return { ...current, terrainPlacements: moveTacticalEditorLayerObject(current.terrainPlacements, index, direction) };
      }
      if (object.kind === "area") {
        const items = current.drawnAreas ?? [];
        return { ...current, drawnAreas: moveTacticalEditorLayerObject(items, items.findIndex((item) => item.id === object.id), direction) };
      }
      if (object.kind === "enemy") {
        const items = current.enemyPlacements ?? [];
        return { ...current, enemyPlacements: moveTacticalEditorLayerObject(items, items.findIndex((item) => item.id === object.id), direction) };
      }
      if (object.kind === "wall") {
        const items = current.drawnWalls ?? [];
        return { ...current, drawnWalls: moveTacticalEditorLayerObject(items, items.findIndex((item) => item.id === object.id), direction) };
      }
      if (object.kind === "raised-area") {
        const items = current.drawnRaisedAreas ?? [];
        return { ...current, drawnRaisedAreas: moveTacticalEditorLayerObject(items, items.findIndex((item) => item.id === object.id), direction) };
      }
      if (object.kind === "terrain-region") {
        const items = current.drawnTerrainRegions ?? [];
        return { ...current, drawnTerrainRegions: moveTacticalEditorLayerObject(items, items.findIndex((item) => item.id === object.id), direction) };
      }
      if (object.kind === "primitive") {
        const items = current.drawnTerrainPrimitives ?? [];
        return { ...current, drawnTerrainPrimitives: moveTacticalEditorLayerObject(items, items.findIndex((item) => item.id === object.id), direction) };
      }
      if (object.kind === "natural-terrain") {
        const items = current.naturalTerrainPlacements ?? [];
        return { ...current, naturalTerrainPlacements: moveTacticalEditorLayerObject(items, items.findIndex((item) => item.id === object.id), direction) };
      }
      if (object.kind === "elevation-transition") {
        const items = current.elevationTransitions ?? [];
        return { ...current, elevationTransitions: moveTacticalEditorLayerObject(items, items.findIndex((item) => item.id === object.id), direction) };
      }
      if (object.kind === "fire") {
        const index = current.fireCells.findIndex((point) => `${point.x}:${point.y}` === object.id);
        return { ...current, fireCells: moveTacticalEditorLayerObject(current.fireCells, index, direction) };
      }
      return current;
    });
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
    canRotatePlacement: Boolean(selectedPlacement),
    onRotatePlacement: rotateSelectedPlacement,
  });
  const expandedToolGroup = EDITOR_DRAWING_TOOL_GROUPS.find((group) => group.id === openToolGroup) ?? null;
  const normalizedScenarioSearch = scenarioSearchQuery.trim().toLowerCase();
  const filteredScenarios = normalizedScenarioSearch
    ? availableScenarios.filter((scenario) => scenario.title.toLowerCase().includes(normalizedScenarioSearch)
      || scenario.id.toLowerCase().includes(normalizedScenarioSearch))
    : availableScenarios;
  const updateScenarioSearch = (value: string) => {
    dispatch(editorOpenScenarioSearchChanged(value));
  };

  if (playtest) return <Provider store={playtest.sandbox}>
    <PlaytestComponent draftPlaytest={{ definition: playtest.definition, consoleVictory: playtest.consoleVictory, onExit: () => setPlaytest(null) }} />
  </Provider>;

  return <main className="flex h-screen w-screen flex-col overflow-hidden bg-[#050a12] font-mono text-slate-100">
    <header className="relative flex h-16 shrink-0 items-center justify-between gap-4 border-b border-cyan-800 bg-slate-950 px-4">
      <div className="flex items-center gap-6">
        <div>
          <div className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-100">Scenario Editor</div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">{currentScenario.title} · {currentScenario.isDefault ? "immutable source" : "saved scenario"} · editable draft</div>
        </div>
        <nav aria-label="Scenario editor menu bar" className="flex self-stretch">
          <div className="relative h-full">
            <button type="button" aria-label="File menu" aria-haspopup="menu" aria-expanded={openHeaderMenu === "file"} onClick={() => dispatch(editorHeaderMenuToggled("file"))} className={`h-full border-x px-4 text-[11px] font-bold uppercase tracking-wider ${openHeaderMenu === "file" ? "border-cyan-500 bg-cyan-950/70 text-cyan-50" : "border-transparent text-slate-300 hover:border-cyan-800 hover:bg-cyan-950/30 hover:text-cyan-100"}`}>File</button>
            {openHeaderMenu === "file" && <div role="menu" aria-label="File" className="absolute left-0 top-full z-50 min-w-52 border border-cyan-700 bg-slate-950 p-1 shadow-2xl">
            <button type="button" role="menuitem" disabled={fileBusy || draft.map.width < 1 || draft.map.height < 1} onClick={() => {
              dispatch(editorHeaderMenuClosed());
              if (dirty && !window.confirm("Create a new scenario and discard the unsaved changes in this draft?")) return;
              dispatch(editorNewScenarioDialogOpened());
            }} className="h-9 w-full px-3 text-left text-[10px] font-bold uppercase tracking-wider text-cyan-100 hover:bg-cyan-950 disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:bg-transparent">New Scenario…</button>
            <button type="button" role="menuitem" onClick={() => {
              dispatch(editorOpenScenarioDialogOpened());
              void refreshScenarioList().catch((error) => dispatch(editorFileMessageChanged({ kind: "error", text: error instanceof Error ? error.message : "Could not list scenario files." })));
            }} className="h-9 w-full px-3 text-left text-[10px] font-bold uppercase tracking-wider text-cyan-100 hover:bg-cyan-950">Open Scenario…</button>
            <div className="my-1 border-t border-slate-700" />
            <button type="button" role="menuitem" disabled={fileBusy || currentScenario.isDefault || !dirty || draftBlocked} onClick={() => {
              dispatch(editorHeaderMenuClosed());
              void saveScenario();
            }} className="h-9 w-full px-3 text-left text-[10px] font-bold uppercase tracking-wider text-emerald-100 hover:bg-emerald-950/50 disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:bg-transparent">Save</button>
            <button type="button" role="menuitem" disabled={fileBusy || draftBlocked} onClick={() => {
              dispatch(editorSaveAsDialogOpened());
            }} className="h-9 w-full px-3 text-left text-[10px] font-bold uppercase tracking-wider text-emerald-100 hover:bg-emerald-950/50 disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:bg-transparent">Save As…</button>
            <div className="my-1 border-t border-slate-700" />
            <button type="button" role="menuitem" disabled={fileBusy || currentScenario.isDefault} onClick={() => {
              dispatch(editorHeaderMenuClosed());
              void deleteScenario();
            }} className="h-9 w-full px-3 text-left text-[10px] font-bold uppercase tracking-wider text-red-200 hover:bg-red-950/50 disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:bg-transparent">Delete Scenario…</button>
            </div>}
          </div>
          <div className="relative h-full">
            <button type="button" aria-label="Scenario menu" aria-haspopup="menu" aria-expanded={openHeaderMenu === "scenario"} onClick={() => dispatch(editorHeaderMenuToggled("scenario"))} className={`h-full border-x px-4 text-[11px] font-bold uppercase tracking-wider ${openHeaderMenu === "scenario" ? "border-cyan-500 bg-cyan-950/70 text-cyan-50" : "border-transparent text-slate-300 hover:border-cyan-800 hover:bg-cyan-950/30 hover:text-cyan-100"}`}>Scenario</button>
            {openHeaderMenu === "scenario" && <div role="menu" aria-label="Scenario" className="absolute left-0 top-full z-50 min-w-60 border border-cyan-700 bg-slate-950 p-1 shadow-2xl">
              <button type="button" role="menuitem" onClick={() => {
                dispatch(editorScenarioPropertiesDialogOpened({
                  title: draft.title,
                  briefing: draft.briefing,
                  objective: draft.objective,
                  deploymentEdges: [...(draft.deploymentEdges ?? ["south"])],
                }));
              }} className="h-9 w-full px-3 text-left text-[10px] font-bold uppercase tracking-wider text-cyan-100 hover:bg-cyan-950">Scenario Properties…</button>
              <div className="my-1 border-t border-slate-700" />
              <button type="button" role="menuitem" disabled={playtestBlocked || draft.map.width < 1 || draft.map.height < 1} onClick={() => {
                dispatch(editorHeaderMenuClosed());
                beginPlaytest();
              }} className="h-9 w-full px-3 text-left text-[10px] font-bold uppercase tracking-wider text-emerald-100 hover:bg-emerald-950/50 disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:bg-transparent">Playtest Draft</button>
              <div className="my-1 border-t border-slate-700" />
              <button type="button" role="menuitem" disabled={!dirty} onClick={() => {
                dispatch(editorHeaderMenuClosed());
                discardDraftChanges();
              }} className="h-9 w-full px-3 text-left text-[10px] font-bold uppercase tracking-wider text-amber-100 hover:bg-amber-950/50 disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:bg-transparent">Discard Draft Changes…</button>
            </div>}
          </div>
        </nav>
      </div>
      <div className="relative flex items-center gap-2">
        {fileMessage && !openScenarioDialog && !scenarioPropertiesDraft && !newScenarioDialogOpen && !saveAsDialogOpen && <span role={fileMessage.kind === "error" ? "alert" : "status"} className={`max-w-96 truncate text-[10px] ${fileMessage.kind === "error" ? "text-red-300" : "text-emerald-300"}`}>{fileMessage.text}</span>}
        {editorIssues.length > 0 && <button type="button" aria-label="Open editor issues" aria-expanded={issuesOpen} onClick={() => setIssuesOpen((current) => !current)} className={`border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${editorIssues.some((issue) => issue.severity === "error") ? "border-red-500 text-red-200" : "border-amber-500 text-amber-200"}`}>{editorIssues.length} {editorIssues.length === 1 ? "Issue" : "Issues"}</button>}
        {issuesOpen && editorIssues.length > 0 && <div role="dialog" aria-label="Editor issues" className="absolute right-0 top-[calc(100%+1rem)] z-[90] w-96 border border-amber-600 bg-slate-950 p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between border-b border-slate-700 pb-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-100">Editor issues</div>
            <button type="button" aria-label="Close editor issues" onClick={() => setIssuesOpen(false)} className="h-7 w-7 border border-slate-700 text-slate-300 hover:border-amber-500">×</button>
          </div>
          <div className="space-y-2">
            {editorIssues.map((issue, index) => <div key={`${issue.severity}-${index}`} role={issue.severity === "error" ? "alert" : "status"} className={`border p-2 text-[10px] normal-case ${issue.severity === "error" ? "border-red-600/70 bg-red-950/50 text-red-100" : "border-amber-600/70 bg-amber-950/40 text-amber-100"}`}>{issue.message}</div>)}
          </div>
        </div>}
        <span className={`border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${dirty ? "border-amber-400 text-amber-200" : "border-slate-600 text-slate-400"}`}>{dirty ? "Unsaved draft" : "Unchanged"}</span>
      </div>
    </header>
    {openScenarioDialog && <div role="presentation" className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-6" onPointerDown={(event) => {
      if (event.target === event.currentTarget && !fileBusy) dispatch(editorFileDialogClosed());
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="open-scenario-title" tabIndex={-1} onKeyDown={(event) => {
        if (event.key === "Escape" && !fileBusy) dispatch(editorFileDialogClosed());
      }} className="w-full max-w-xl border border-cyan-600 bg-slate-950 p-4 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-cyan-900 pb-3">
          <div>
            <h2 id="open-scenario-title" className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-100">Open Scenario</h2>
            <div className="mt-1 text-[10px] text-slate-400">Choose a saved scenario or the immutable default.</div>
          </div>
          <button type="button" aria-label="Close Open Scenario" disabled={fileBusy} onClick={() => dispatch(editorFileDialogClosed())} className="h-8 w-8 border border-slate-700 text-slate-300 hover:border-cyan-500 hover:text-cyan-100 disabled:opacity-40">×</button>
        </div>
        <div className="mb-3 flex gap-2">
          <label className="min-w-0 flex-1 text-[9px] font-bold uppercase tracking-wider text-cyan-200">Search scenarios
            <input
              autoFocus
              aria-label="Search scenarios"
              type="search"
              value={scenarioSearchQuery}
              onChange={(event) => updateScenarioSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  if (filteredScenarios.length === 0) return;
                  const selectedIndex = filteredScenarios.findIndex((scenario) => scenario.id === scenarioToLoad);
                  const nextIndex = event.key === "ArrowDown"
                    ? Math.min(filteredScenarios.length - 1, Math.max(0, selectedIndex + 1))
                    : Math.max(0, selectedIndex < 0 ? 0 : selectedIndex - 1);
                  dispatch(editorOpenScenarioSelected(filteredScenarios[nextIndex].id));
                  event.preventDefault();
                } else if (event.key === "Enter" && scenarioToLoad && filteredScenarios.some((scenario) => scenario.id === scenarioToLoad)) {
                  void loadScenario();
                  event.preventDefault();
                }
              }}
              placeholder="Title or file ID"
              className="mt-1 h-9 w-full border border-cyan-800 bg-[#071019] px-3 text-[11px] normal-case tracking-normal text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400"
            />
          </label>
          <button type="button" aria-label="Clear scenario search" disabled={!scenarioSearchQuery || fileBusy} onClick={() => updateScenarioSearch("")} className="mt-[1.15rem] h-9 border border-slate-700 px-3 text-[9px] font-bold uppercase tracking-wider text-slate-300 hover:border-cyan-600 hover:text-cyan-100 disabled:opacity-35">Clear</button>
        </div>
        <div role="listbox" aria-label="Available scenarios" className="max-h-[50vh] space-y-1 overflow-y-auto border border-slate-800 bg-[#071019] p-2">
          {scenarioListBusy && <div className="p-4 text-center text-[10px] uppercase tracking-wider text-slate-400">Loading scenarios…</div>}
          {!scenarioListBusy && availableScenarios.length === 0 && <div className="p-4 text-center text-[10px] text-slate-400">No scenarios are available.</div>}
          {!scenarioListBusy && availableScenarios.length > 0 && filteredScenarios.length === 0 && <div className="p-4 text-center text-[10px] text-slate-400">No matching scenarios.</div>}
          {!scenarioListBusy && filteredScenarios.map((scenario) => {
            const selected = scenario.id === scenarioToLoad;
            const current = scenario.id === currentScenario.id;
            return <button
              key={scenario.id}
              type="button"
              role="option"
              aria-label={`${scenario.title} · ${scenario.id}`}
              aria-selected={selected}
              disabled={fileBusy}
              onClick={() => dispatch(editorOpenScenarioSelected(scenario.id))}
              onDoubleClick={() => void loadScenario(scenario.id)}
              className={`flex min-h-14 w-full items-center justify-between gap-4 border px-3 py-2 text-left ${selected ? "border-cyan-300 bg-cyan-950/70" : "border-slate-700 bg-slate-950 hover:border-cyan-700"}`}
            >
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-bold text-slate-100">{scenario.title}</span>
                <span className="mt-1 block truncate text-[9px] text-slate-500">{scenario.id}</span>
              </span>
              <span className="flex shrink-0 gap-1 text-[8px] font-bold uppercase tracking-wider">
                {scenario.isDefault && <span className="border border-amber-600 px-1.5 py-1 text-amber-200">Default</span>}
                {!scenario.isDefault && <span className="border border-slate-600 px-1.5 py-1 text-slate-300">Saved</span>}
                {current && <span className="border border-cyan-500 px-1.5 py-1 text-cyan-200">Current</span>}
              </span>
            </button>;
          })}
        </div>
        {fileMessage?.kind === "error" && <div role="alert" className="mt-3 border border-red-600 bg-red-950/50 p-2 text-[10px] text-red-100">{fileMessage.text}</div>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" disabled={fileBusy} onClick={() => dispatch(editorFileDialogClosed())} className="h-9 border border-slate-600 px-4 text-[9px] font-bold uppercase tracking-wider text-slate-200 disabled:opacity-40">Cancel</button>
          <button type="button" disabled={fileBusy || scenarioListBusy || !scenarioToLoad} onClick={() => void loadScenario()} className="h-9 border border-cyan-400 px-4 text-[9px] font-bold uppercase tracking-wider text-cyan-100 disabled:opacity-40">{fileBusy ? "Opening…" : "Open"}</button>
        </div>
      </div>
    </div>}
    {scenarioPropertiesDraft && <div role="presentation" className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-6" onPointerDown={(event) => {
      if (event.target === event.currentTarget) dispatch(editorFileDialogClosed());
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="scenario-properties-title" onKeyDown={(event) => {
        if (event.key === "Escape") dispatch(editorFileDialogClosed());
      }} className="w-full max-w-xl border border-cyan-600 bg-slate-950 p-4 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-cyan-900 pb-3">
          <div>
            <h2 id="scenario-properties-title" className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-100">Scenario Properties</h2>
            <div className="mt-1 text-[10px] text-slate-400">Changes are staged until Apply is selected.</div>
          </div>
          <button type="button" aria-label="Close Scenario Properties" onClick={() => dispatch(editorFileDialogClosed())} className="h-8 w-8 border border-slate-700 text-slate-300 hover:border-cyan-500 hover:text-cyan-100">×</button>
        </div>
        <label className="mb-3 block text-[9px] font-bold uppercase tracking-wider text-cyan-200">Title
          <input autoFocus aria-label="Scenario title" value={scenarioPropertiesDraft.title} onChange={(event) => dispatch(editorScenarioPropertiesChanged({ ...scenarioPropertiesDraft, title: event.target.value }))} className="mt-1 h-9 w-full border border-slate-600 bg-[#071019] px-3 text-xs normal-case tracking-normal text-slate-100 outline-none focus:border-cyan-400" />
        </label>
        <label className="mb-3 block text-[9px] font-bold uppercase tracking-wider text-cyan-200">Briefing
          <textarea aria-label="Scenario briefing" value={scenarioPropertiesDraft.briefing} onChange={(event) => dispatch(editorScenarioPropertiesChanged({ ...scenarioPropertiesDraft, briefing: event.target.value }))} rows={4} className="mt-1 w-full resize-none border border-slate-600 bg-[#071019] p-3 text-xs normal-case tracking-normal text-slate-100 outline-none focus:border-cyan-400" />
        </label>
        <label className="mb-3 block text-[9px] font-bold uppercase tracking-wider text-cyan-200">Objective
          <textarea aria-label="Scenario objective" value={scenarioPropertiesDraft.objective} onChange={(event) => dispatch(editorScenarioPropertiesChanged({ ...scenarioPropertiesDraft, objective: event.target.value }))} rows={3} className="mt-1 w-full resize-none border border-slate-600 bg-[#071019] p-3 text-xs normal-case tracking-normal text-slate-100 outline-none focus:border-cyan-400" />
        </label>
        <div className="border-t border-slate-700 pt-3">
          <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-emerald-200">Crew deployment edges</div>
          <div className="mb-2 text-[9px] normal-case text-slate-500">Each selected edge allows setup within six squares of that edge.</div>
          <div className="grid grid-cols-4 gap-1">
            {(["north", "east", "south", "west"] as const).map((edge) => {
              const selected = scenarioPropertiesDraft.deploymentEdges.includes(edge);
              return <button key={edge} type="button" aria-label={`Allow ${edge} deployment`} aria-pressed={selected} onClick={() => dispatch(editorScenarioPropertiesChanged({
                ...scenarioPropertiesDraft,
                deploymentEdges: selected
                  ? scenarioPropertiesDraft.deploymentEdges.filter((item) => item !== edge)
                  : [...scenarioPropertiesDraft.deploymentEdges, edge],
              }))} className={`h-8 border text-[8px] font-bold uppercase ${selected ? "border-emerald-300 bg-emerald-300/20 text-emerald-50" : "border-slate-700 text-slate-400"}`}>{edge}</button>;
            })}
          </div>
        </div>
        {scenarioPropertiesError && <div role="alert" className="mt-3 border border-red-500/70 bg-red-950/60 p-2 text-[10px] text-red-100">{scenarioPropertiesError}</div>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => dispatch(editorFileDialogClosed())} className="h-9 border border-slate-600 px-4 text-[9px] font-bold uppercase tracking-wider text-slate-200">Cancel</button>
          <button type="button" onClick={applyScenarioProperties} className="h-9 border border-cyan-400 px-4 text-[9px] font-bold uppercase tracking-wider text-cyan-100">Apply</button>
        </div>
      </div>
    </div>}
    {newScenarioDialogOpen && <div role="presentation" className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-6" onPointerDown={(event) => {
      if (event.target === event.currentTarget && !fileBusy) dispatch(editorFileDialogClosed());
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="new-scenario-title" onKeyDown={(event) => {
        if (event.key === "Escape" && !fileBusy) dispatch(editorFileDialogClosed());
      }} className="w-full max-w-md border border-cyan-600 bg-slate-950 p-4 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-cyan-900 pb-3">
          <div>
            <h2 id="new-scenario-title" className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-100">New Scenario</h2>
            <div className="mt-1 text-[10px] text-slate-400">Create an empty {draft.map.width} × {draft.map.height} scenario with the current drawing precision.</div>
          </div>
          <button type="button" aria-label="Close New Scenario" disabled={fileBusy} onClick={() => dispatch(editorFileDialogClosed())} className="h-8 w-8 border border-slate-700 text-slate-300 hover:border-cyan-500 hover:text-cyan-100 disabled:opacity-40">×</button>
        </div>
        <label className="block text-[9px] font-bold uppercase tracking-wider text-cyan-200">Scenario name
          <input autoFocus aria-label="New scenario name" value={newScenarioName} onChange={(event) => dispatch(editorScenarioNameChanged(event.target.value))} onKeyDown={(event) => {
            if (event.key === "Enter" && newScenarioName.trim() && !fileBusy && draft.map.width > 0 && draft.map.height > 0) {
              void createNewScenario();
              event.preventDefault();
            }
          }} placeholder="Boarding action" className="mt-1 h-9 w-full border border-cyan-800 bg-[#071019] px-3 text-xs normal-case tracking-normal text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400" />
        </label>
        {fileMessage && <div role={fileMessage.kind === "error" ? "alert" : "status"} className={`mt-3 border p-2 text-[10px] ${fileMessage.kind === "error" ? "border-red-500/70 bg-red-950/60 text-red-100" : "border-emerald-500/70 bg-emerald-950/50 text-emerald-100"}`}>{fileMessage.text}</div>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" disabled={fileBusy} onClick={() => dispatch(editorFileDialogClosed())} className="h-9 border border-slate-600 px-4 text-[9px] font-bold uppercase tracking-wider text-slate-200 disabled:opacity-40">Cancel</button>
          <button type="button" disabled={fileBusy || !newScenarioName.trim() || draft.map.width < 1 || draft.map.height < 1} onClick={() => void createNewScenario()} className="h-9 border border-cyan-400 px-4 text-[9px] font-bold uppercase tracking-wider text-cyan-100 disabled:opacity-40">{fileBusy ? "Creating…" : "Create"}</button>
        </div>
      </div>
    </div>}
    {saveAsDialogOpen && <div role="presentation" className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-6" onPointerDown={(event) => {
      if (event.target === event.currentTarget && !fileBusy) dispatch(editorFileDialogClosed());
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="save-as-scenario-title" onKeyDown={(event) => {
        if (event.key === "Escape" && !fileBusy) dispatch(editorFileDialogClosed());
      }} className="w-full max-w-md border border-emerald-600 bg-slate-950 p-4 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-emerald-900 pb-3">
          <div>
            <h2 id="save-as-scenario-title" className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-100">Save Scenario As</h2>
            <div className="mt-1 text-[10px] text-slate-400">Create a new scenario file without overwriting an existing scenario.</div>
          </div>
          <button type="button" aria-label="Close Save Scenario As" disabled={fileBusy} onClick={() => dispatch(editorFileDialogClosed())} className="h-8 w-8 border border-slate-700 text-slate-300 hover:border-emerald-500 hover:text-emerald-100 disabled:opacity-40">×</button>
        </div>
        <label className="block text-[9px] font-bold uppercase tracking-wider text-emerald-200">Scenario name
          <input autoFocus aria-label="New scenario name" value={saveAsName} onChange={(event) => dispatch(editorScenarioNameChanged(event.target.value))} onKeyDown={(event) => {
            if (event.key === "Enter" && saveAsName.trim() && !fileBusy && !draftBlocked) {
              void saveScenarioAs();
              event.preventDefault();
            }
          }} placeholder="Boarding action" className="mt-1 h-9 w-full border border-emerald-800 bg-[#071019] px-3 text-xs normal-case tracking-normal text-slate-100 outline-none placeholder:text-slate-600 focus:border-emerald-400" />
        </label>
        {fileMessage && <div role={fileMessage.kind === "error" ? "alert" : "status"} className={`mt-3 border p-2 text-[10px] ${fileMessage.kind === "error" ? "border-red-500/70 bg-red-950/60 text-red-100" : "border-emerald-500/70 bg-emerald-950/50 text-emerald-100"}`}>{fileMessage.text}</div>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" disabled={fileBusy} onClick={() => dispatch(editorFileDialogClosed())} className="h-9 border border-slate-600 px-4 text-[9px] font-bold uppercase tracking-wider text-slate-200 disabled:opacity-40">Cancel</button>
          <button type="button" disabled={fileBusy || !saveAsName.trim() || draftBlocked} onClick={() => void saveScenarioAs()} className="h-9 border border-emerald-400 px-4 text-[9px] font-bold uppercase tracking-wider text-emerald-100 disabled:opacity-40">{fileBusy ? "Saving…" : "Save As"}</button>
        </div>
      </div>
    </div>}
    <div className="flex min-h-0 flex-1">
      <section aria-label="Editor canvas" className="relative h-full min-h-0 min-w-0 flex-1 overflow-hidden">
        <TacticalEditorViewportProvider key={`${draft.map.width}:${draft.map.height}`} map={draft.map}>
        <PluginHudLayer hiddenHuds={[
          ...((selectedPrimitive || placementKind === CIRCLE_TOOL_ID) && !circlePropertiesLayout.visible ? [{ id: "legacy-circle-properties", title: "Legacy Circle Properties" }] : []),
          ...(enemyPaletteLayout.visible ? [] : [{ id: "enemy-palette", title: "Enemy Palette" }]),
          ...(selectedHasTerminal && !consoleEditorLayout.visible ? [{ id: "console-editor", title: selectedIsInteractiveHuman ? "Human Interaction Editor" : "Console Editor" }] : []),
          ...(selectedEnemy && !enemyEditorLayout.visible ? [{ id: "enemy-editor", title: "Enemy Editor" }] : []),
          ...(navigationLayout.visible ? [] : [{ id: "navigation", title: "Navigation" }]),
          ...(tracingTemplateLayout.visible ? [] : [{ id: "tracing-template", title: "Tracing Template" }]),
          ...(toolsLayout.visible ? [] : [{ id: "tools", title: "Tools" }]),
          ...(layersLayout.visible ? [] : [{ id: "layers", title: "Layers" }]),
          ...(selectedArea && !areaPropertiesLayout.visible ? [{ id: "area-properties", title: "Area Properties" }] : []),
          ...(editableObjectProperties && !objectPropertiesLayout.visible ? [{ id: "object-properties", title: "Object Properties" }] : []),
        ]} onRestoreHud={(id) => {
          if (id === "console-editor") setConsoleEditorLayout((current) => ({ ...current, visible: true }));
          else if (id === "enemy-editor") setEnemyEditorLayout((current) => ({ ...current, visible: true }));
          else if (id === "enemy-palette") setEnemyPaletteLayout((current) => ({ ...current, visible: true }));
          else if (id === "navigation") setNavigationLayout((current) => ({ ...current, visible: true }));
          else if (id === "tracing-template") setTracingTemplateLayout((current) => ({ ...current, visible: true }));
          else if (id === "tools") setToolsLayout((current) => ({ ...current, visible: true }));
          else if (id === "layers") setLayersLayout((current) => ({ ...current, visible: true }));
          else if (id === "area-properties") setAreaPropertiesLayout((current) => ({ ...current, visible: true }));
          else if (id === "object-properties") setObjectPropertiesLayout((current) => ({ ...current, visible: true }));
          else if (id === "legacy-circle-properties") setCirclePropertiesLayout((current) => ({ ...current, visible: true }));
        }} className="p-5">
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
              selectPlacement={(id) => {
                if (id && lockedLayerKeys.has(tacticalEditorLayerKey("terrain-placement", id))) return;
                selectTerrainPlacement(id);
              }}
              selectEnemy={(id) => {
                selectEnemy(id);
              }}
              selectWall={(id) => {
                if (id && lockedLayerKeys.has(tacticalEditorLayerKey("wall", id))) return;
                setSelectedWallId(id);
                if (id) {
                  setSelectedRaisedAreaId(null);
                  setSelectedPrimitiveId(null);
                  setSelectedNaturalTerrainId(null);
                  setSelectedElevationTransitionId(null);
                  setSelectedPortalId(null);
                }
              }}
              selectRaisedArea={(id) => {
                if (!id || selectedAreaAnchor?.areaId !== id) setSelectedAreaAnchor(null);
                const kind = id && (draft.drawnAreas ?? []).some((area) => area.id === id)
                  ? "area"
                  : id && (draft.drawnTerrainRegions ?? []).some((region) => region.id === id)
                    ? "terrain-region"
                    : "raised-area";
                if (id && lockedLayerKeys.has(tacticalEditorLayerKey(kind, id))) return;
                setSelectedRaisedAreaId(id);
                setSelectedTerrainRegionId(id && kind === "terrain-region" ? id : null);
                if (id && kind === "area") setAreaPropertiesLayout((current) => ({ ...current, visible: true }));
                if (id && kind === "terrain-region") setObjectPropertiesLayout((current) => ({ ...current, visible: true }));
                if (id) {
                  setSelectedWallId(null);
                  setSelectedPrimitiveId(null);
                  setSelectedNaturalTerrainId(null);
                  setSelectedElevationTransitionId(null);
                  setSelectedPortalId(null);
                }
              }}
              selectAreaAnchor={setSelectedAreaAnchor}
              insertAreaAnchor={insertCompletedAreaAnchor}
              selectPrimitive={(id) => {
                if (id && lockedLayerKeys.has(tacticalEditorLayerKey("primitive", id))) return;
                selectTerrainPrimitive(id);
              }}
              selectNaturalTerrain={(id) => {
                if (id && lockedLayerKeys.has(tacticalEditorLayerKey("natural-terrain", id))) return;
                selectNaturalTerrain(id);
              }}
              selectElevationTransition={(id) => {
                if (id && lockedLayerKeys.has(tacticalEditorLayerKey("elevation-transition", id))) return;
                setSelectedElevationTransitionId(id);
                if (id) {
                  setSelectedWallId(null);
                  setSelectedRaisedAreaId(null);
                  setSelectedPrimitiveId(null);
                  setSelectedNaturalTerrainId(null);
                  setSelectedPortalId(null);
                }
              }}
              selectPortal={(id) => {
                if (id && lockedLayerKeys.has(tacticalEditorLayerKey("portal", id))) return;
                setSelectedPortalId(id);
              }}
              selectFire={(point) => {
                if (point && lockedLayerKeys.has(tacticalEditorLayerKey("fire", `${point.x}:${point.y}`))) return;
                setSelectedFire(point);
              }}
              hoverPlacement={setPlacementHover}
              hoverEnemy={setEnemyHover}
              hoverPortal={setPortalHover}
              beginWall={beginWall}
              updateWall={updateWall}
              finishWall={finishWall}
              finishWallInteraction={finishWallInteraction}
              cancelWall={() => setWallDraft(null)}
              beginCircle={beginCircle}
              updateCircle={updateCircle}
              finishCircle={finishCircle}
              cancelCircle={() => setCircleDraft(null)}
              beginCirclePrimitiveDrag={(id, kind) => {
                if (lockedLayerKeys.has(tacticalEditorLayerKey("primitive", id))) return;
                beginCirclePrimitiveDrag(id, kind);
              }}
              updateCirclePrimitiveDrag={updateCirclePrimitiveDrag}
              finishCirclePrimitiveDrag={() => setDragCirclePrimitive(null)}
              beginNaturalTerrainDrag={(id, kind, point) => {
                if (lockedLayerKeys.has(tacticalEditorLayerKey("natural-terrain", id))) return;
                beginNaturalTerrainDrag(id, kind, point);
              }}
              updateNaturalTerrainDrag={updateNaturalTerrainDrag}
              finishNaturalTerrainDrag={() => setDragNaturalTerrain(null)}
              createRectangleArea={createRectangleArea}
              commitPenNode={commitPenNode}
              closePenArea={closePenArea}
              hoverRaisedArea={hoverRaisedArea}
              beginOrFinishRamp={beginOrFinishRamp}
              beginRaisedAreaControlDrag={(owner, index) => {
                if (owner.kind !== "draft") {
                  const kind = owner.kind === "area" ? "area" : owner.kind === "raised" ? "raised-area" : "terrain-region";
                  if (lockedLayerKeys.has(tacticalEditorLayerKey(kind, owner.id))) return;
                }
                beginRaisedAreaControlDrag(owner, index);
              }}
              reshapeRaisedAreaControl={reshapeRaisedAreaControl}
              finishRaisedAreaControlDrag={() => setDragRaisedAreaControl(null)}
              cancelRaisedAreaControlDrag={cancelRaisedAreaControlDrag}
              beginAreaAnchorDrag={(id, index) => {
                if (lockedLayerKeys.has(tacticalEditorLayerKey("area", id))) return;
                beginAreaAnchorDrag(id, index);
              }}
              moveAreaAnchor={moveAreaAnchor}
              finishAreaAnchorDrag={() => setDragAreaAnchor(null)}
              cancelAreaAnchorDrag={cancelAreaAnchorDrag}
              beginAreaCubicControlDrag={(id, index, control) => {
                if (lockedLayerKeys.has(tacticalEditorLayerKey("area", id))) return;
                beginAreaCubicControlDrag(id, index, control);
              }}
              moveAreaCubicControl={moveAreaCubicControl}
              finishAreaCubicControlDrag={() => setDragAreaCubicControl(null)}
              cancelAreaCubicControlDrag={cancelAreaCubicControlDrag}
              beginConstrainedAreaDrag={(id, kind, point) => {
                if (lockedLayerKeys.has(tacticalEditorLayerKey("area", id))) return;
                beginConstrainedAreaDrag(id, kind, point);
              }}
              updateConstrainedAreaDrag={updateConstrainedAreaDrag}
              finishConstrainedAreaDrag={() => setDragConstrainedArea(null)}
              cancelConstrainedAreaDrag={cancelConstrainedAreaDrag}
              placeWallPortal={placeWallPortal}
              beginWallEndpointDrag={(id, endpoint) => {
                if (lockedLayerKeys.has(tacticalEditorLayerKey("wall", id))) return;
                beginWallEndpointDrag(id, endpoint);
              }}
              resizeWallEndpoint={resizeWallEndpoint}
              finishWallEndpointDrag={() => setDragWallEndpoint(null)}
              cancelWallEndpointDrag={cancelWallEndpointDrag}
              beginWallMove={(id, point) => {
                if (lockedLayerKeys.has(tacticalEditorLayerKey("wall", id))) return;
                beginWallMove(id, point);
              }}
              moveWall={moveWall}
              finishWallMove={() => setDragWallMove(null)}
              cancelWallMove={cancelWallMove}
              beginWallControlDrag={(id) => {
                if (lockedLayerKeys.has(tacticalEditorLayerKey("wall", id))) return;
                beginWallControlDrag(id);
              }}
              reshapeWallControl={reshapeWallControl}
              finishWallControlDrag={() => setDragWallControl(null)}
              cancelWallControlDrag={cancelWallControlDrag}
              beginWallPortalDrag={(id) => {
                if (lockedLayerKeys.has(tacticalEditorLayerKey("portal", id))) return;
                beginWallPortalDrag(id);
              }}
              moveWallPortal={moveWallPortal}
              finishWallPortalDrag={() => setDragWallPortal(null)}
              cancelWallPortalDrag={cancelWallPortalDrag}
              beginTracingTemplateDrag={beginTracingTemplateDrag}
              transformTracingTemplate={transformTracingTemplate}
              finishTracingTemplateDrag={() => setDragTracingTemplate(null)}
              cancelTracingTemplateDrag={cancelTracingTemplateDrag}
              beginDrag={(drag) => {
                if (lockedLayerKeys.has(tacticalEditorLayerKey("terrain-placement", drag.id))) return;
                setDragPlacement(drag);
              }}
              beginEnemyDrag={(drag) => {
                if (lockedLayerKeys.has(tacticalEditorLayerKey("enemy", drag.id))) return;
                setDragEnemy(drag);
              }}
              endDrag={() => {
                setDragPlacement(null);
                setDragEnemy(null);
              }}
              placeTerrain={placeTerrain}
              placeEnemy={placeEnemy}
              moveTerrain={moveTerrain}
              moveEnemy={moveEnemy}
            />
          </div>
          <div className={`contents ${hudLayoutsReady ? "" : "invisible"}`}>
          <TacticalNavigationHud layout={navigationLayout} mode="editor" onLayoutChange={persistNavigationLayout} />
          <FloatingPluginHud title="Tools" layout={toolsLayout} onLayoutChange={persistToolsLayout} className="font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
            <div role="toolbar" aria-label="Primary drawing tools" aria-orientation="horizontal" className="flex items-center gap-1 py-1">
              <button
                type="button"
                aria-label="Select tool"
                aria-pressed={primaryTool === "select" && placementKind === null && enemyKind === null}
                onClick={() => { dispatch(editorToolGroupClosed()); activatePrimaryTool("select"); }}
                className={`group relative grid h-9 w-9 place-items-center border transition-colors ${primaryTool === "select" && placementKind === null && enemyKind === null ? "border-cyan-200 bg-cyan-300/20 text-cyan-50" : "border-slate-700 text-slate-400 hover:border-cyan-500 hover:text-cyan-100"}`}
              >
                <MousePointer2 size={17} aria-hidden="true" />
                <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 hidden -translate-x-1/2 whitespace-nowrap border border-cyan-600 bg-slate-950 px-3 py-2 text-[11px] normal-case tracking-normal text-cyan-50 shadow-xl group-hover:block group-focus-visible:block">Select · V</span>
              </button>
              <button
                type="button"
                aria-label="Node edit tool"
                aria-pressed={primaryTool === "node"}
                onClick={() => { dispatch(editorToolGroupClosed()); activatePrimaryTool("node"); }}
                className={`group relative grid h-9 w-9 place-items-center border transition-colors ${primaryTool === "node" ? "border-cyan-200 bg-cyan-300/20 text-cyan-50" : "border-slate-700 text-slate-400 hover:border-cyan-500 hover:text-cyan-100"}`}
              >
                <Spline size={18} aria-hidden="true" />
                <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 hidden -translate-x-1/2 whitespace-nowrap border border-cyan-600 bg-slate-950 px-3 py-2 text-[11px] normal-case tracking-normal text-cyan-50 shadow-xl group-hover:block group-focus-visible:block">Node edit · N</span>
              </button>
              <button
                type="button"
                aria-label="Hand tool"
                aria-pressed={primaryTool === "hand"}
                onClick={() => { dispatch(editorToolGroupClosed()); activatePrimaryTool("hand"); }}
                className={`group relative grid h-9 w-9 place-items-center border transition-colors ${primaryTool === "hand" ? "border-cyan-200 bg-cyan-300/20 text-cyan-50" : "border-slate-700 text-slate-400 hover:border-cyan-500 hover:text-cyan-100"}`}
              >
                <Hand size={17} aria-hidden="true" />
                <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 hidden -translate-x-1/2 whitespace-nowrap border border-cyan-600 bg-slate-950 px-3 py-2 text-[11px] normal-case tracking-normal text-cyan-50 shadow-xl group-hover:block group-focus-visible:block">Hand · H</span>
              </button>
              <button
                type="button"
                title="Drawing Settings"
                aria-label="Open Drawing Settings"
                aria-expanded={openToolGroup === "drawing-settings"}
                onClick={() => dispatch(editorToolGroupToggled("drawing-settings"))}
                className={`group relative grid h-9 w-9 place-items-center border transition-colors ${openToolGroup === "drawing-settings" ? "border-cyan-200 bg-cyan-300/20 text-cyan-50" : "border-slate-700 text-slate-400 hover:border-cyan-500 hover:text-cyan-100"}`}
              >
                <Settings2 size={17} aria-hidden="true" />
                <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 hidden -translate-x-1/2 whitespace-nowrap border border-cyan-600 bg-slate-950 px-3 py-2 text-[11px] normal-case tracking-normal text-cyan-50 shadow-xl group-hover:block group-focus-visible:block">Drawing Settings</span>
              </button>
              <div className="mx-1 h-7 w-px bg-slate-700" aria-hidden="true" />
              {EDITOR_DRAWING_TOOL_GROUPS.map((group) => {
                const Icon = group.icon;
                const expanded = openToolGroup === group.id;
                const containsActiveTool = group.tools.some((tool) => tool.id === placementKind);
                return <button
                  key={group.id}
                  type="button"
                  title={group.label}
                  aria-label={`Open ${group.label} tools`}
                  aria-expanded={expanded}
                  onClick={() => dispatch(editorToolGroupToggled(group.id))}
                  className={`group relative grid h-9 w-9 place-items-center border transition-colors ${expanded || containsActiveTool ? "border-cyan-200 bg-cyan-300/20 text-cyan-50" : "border-slate-700 text-slate-400 hover:border-cyan-500 hover:text-cyan-100"}`}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 hidden -translate-x-1/2 whitespace-nowrap border border-cyan-600 bg-slate-950 px-3 py-2 text-[11px] normal-case tracking-normal text-cyan-50 shadow-xl group-hover:block group-focus-visible:block">{group.label}</span>
                </button>;
              })}
              {selectedPlacement && <button
                type="button"
                title={`Rotate ${selectedPlacement.id} 90° · R`}
                aria-label="Rotate selected placement 90 degrees"
                onClick={rotateSelectedPlacement}
                className="group relative grid h-9 w-9 place-items-center border border-amber-500 text-amber-200 transition-colors hover:border-amber-200 hover:bg-amber-300/20 hover:text-amber-50"
              >
                <RotateCw size={17} aria-hidden="true" />
                <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 hidden -translate-x-1/2 whitespace-nowrap border border-amber-500 bg-slate-950 px-3 py-2 text-[11px] normal-case tracking-normal text-amber-50 shadow-xl group-hover:block group-focus-visible:block">Rotate selected · R</span>
              </button>}
              <div className="mx-1 h-7 w-px bg-slate-700" aria-hidden="true" />
              <button
                type="button"
                aria-label="Open layers"
                aria-pressed={layersLayout.visible}
                onClick={() => setLayersLayout((current) => ({ ...current, visible: true }))}
                className={`group relative grid h-9 w-9 place-items-center border transition-colors ${layersLayout.visible ? "border-cyan-200 bg-cyan-300/20 text-cyan-50" : "border-slate-700 text-slate-400 hover:border-cyan-500 hover:text-cyan-100"}`}
              >
                <Layers3 size={17} aria-hidden="true" />
                <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 hidden -translate-x-1/2 whitespace-nowrap border border-cyan-600 bg-slate-950 px-3 py-2 text-[11px] normal-case tracking-normal text-cyan-50 shadow-xl group-hover:block group-focus-visible:block">Layers</span>
              </button>
            </div>
            {openToolGroup === "drawing-settings" && <div role="group" aria-label="Drawing settings" className="grid max-w-[36rem] grid-cols-[minmax(10rem,1fr)_6rem_6rem] gap-2 border-t border-slate-700 py-2">
              <TacticalDrawingPrecisionControl />
              <label className="block font-bold text-cyan-200">Map width
                <input aria-label="Map width" type="number" min="1" value={draft.map.width} onChange={(event) => updateDimension("width", event.target.value)} className="mt-1 h-8 w-full border border-cyan-700 bg-slate-950 px-2 text-[9px] text-cyan-50 outline-none focus:border-cyan-400" />
              </label>
              <label className="block font-bold text-cyan-200">Map height
                <input aria-label="Map height" type="number" min="1" value={draft.map.height} onChange={(event) => updateDimension("height", event.target.value)} className="mt-1 h-8 w-full border border-cyan-700 bg-slate-950 px-2 text-[9px] text-cyan-50 outline-none focus:border-cyan-400" />
              </label>
            </div>}
            {selectedIsLiquidHydrogen && <div role="group" aria-label="Selected liquid hydrogen settings" className="max-w-[36rem] border-t border-sky-800 py-2">
              <label className="flex h-8 items-center gap-2 border border-sky-700 px-2 font-bold text-sky-200">
                <input aria-label="Filled with liquid hydrogen" type="checkbox" checked={selectedPlacement?.terrainSettings?.filled ?? true} onChange={(event) => updateSelectedLiquidHydrogen(event.target.checked)} /> Filled with liquid hydrogen
              </label>
            </div>}
            {expandedToolGroup && <div className="border-t border-slate-700 py-1.5">
              <div className="mb-1 px-1 text-[9px] normal-case tracking-normal text-slate-400">{expandedToolGroup.label}</div>
              <div role="toolbar" aria-label={`${expandedToolGroup.label} tools`} aria-orientation="horizontal" className="flex max-w-[36rem] flex-wrap gap-1">
                {expandedToolGroup.tools.map((tool) => {
                  const Icon = tool.icon;
                  const active = placementKind === tool.id;
                  return <button
                    key={tool.id}
                    type="button"
                    title={tool.label}
                    aria-label={`Choose ${tool.label} tool`}
                    aria-pressed={active}
                    onClick={() => activateDrawingTool(tool.id)}
                    className={`group relative grid h-9 w-9 place-items-center border transition-colors ${active ? "border-cyan-200 bg-cyan-300/20 text-cyan-50" : "border-slate-700 text-slate-400 hover:border-cyan-500 hover:text-cyan-100"}`}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 hidden -translate-x-1/2 whitespace-nowrap border border-cyan-600 bg-slate-950 px-3 py-2 text-[11px] normal-case tracking-normal text-cyan-50 shadow-xl group-hover:block group-focus-visible:block">{tool.label}</span>
                  </button>;
                })}
              </div>
            </div>}
            {raisedAreaDraft && <div className="max-w-[36rem] border-t border-cyan-800 px-1 py-2 normal-case leading-relaxed tracking-normal text-cyan-100">
              <div>Click for corners. Click and drag a point to create curve handles. Click the cyan start, double-click, or press Enter to close. Backspace removes the last point.</div>
              <div className="mt-2 flex gap-2">
                <button type="button" disabled={raisedAreaDraft.segments.length < 2} onClick={closePenArea} className="h-8 flex-1 border border-emerald-500 px-3 font-bold uppercase tracking-wider text-emerald-100 disabled:opacity-35">Finish area</button>
                <button type="button" onClick={() => { setRaisedAreaDraft(null); setDragRaisedAreaControl(null); setPlacementError(null); }} className="h-8 flex-1 border border-red-500 px-3 font-bold uppercase tracking-wider text-red-100">Cancel outline</button>
              </div>
            </div>}
            {placementKind === PEN_AREA_TOOL_ID && !raisedAreaDraft && <div className="max-w-[36rem] border-t border-cyan-800 px-2 py-2 text-[10px] normal-case leading-relaxed tracking-normal text-cyan-100">Click to begin a path. Click for straight corners; click and drag for curved points.</div>}
            {placementKind === RECTANGLE_AREA_TOOL_ID && <div className="max-w-[36rem] border-t border-cyan-800 px-2 py-2 text-[10px] normal-case leading-relaxed tracking-normal text-cyan-100">Drag from one corner to the opposite corner. Hold Shift while dragging to draw a square.</div>}
            {placementKind === CIRCLE_AREA_TOOL_ID && <div className="max-w-[36rem] border-t border-cyan-800 px-2 py-2 text-[10px] normal-case leading-relaxed tracking-normal text-cyan-100">Drag from the center to the radius. The completed circle remains circular and uses the standard Area Properties.</div>}
            {rampDraft && <div className="max-w-[36rem] border-t border-purple-700 px-2 py-2 text-[10px] normal-case leading-relaxed tracking-normal text-purple-100">
              Move straight outward over at least two squares. Finish on lower terrain for a ramp or on a matching raised platform for a flat bridge.
              <button type="button" onClick={() => { setRampDraft(null); setPlacementError(null); }} className="mt-2 h-8 w-full border border-red-400 font-bold uppercase text-red-100">Cancel ramp</button>
            </div>}
          </FloatingPluginHud>
          {selectedArea && <FloatingPluginHud title="Area Properties" layout={areaPropertiesLayout} onLayoutChange={persistAreaPropertiesLayout} className="w-80 font-mono text-[10px] uppercase tracking-wider text-(--hud-text)">
            <div className="py-1">
              <div className="mb-3 flex items-start justify-between gap-3 border-b border-slate-700 pb-2">
                <div>
                  <div className="font-bold text-cyan-100">{selectedArea.id}</div>
                  <div className="mt-1 normal-case tracking-normal text-slate-400">Surface, level, boundary, and deployment use are independent.</div>
                </div>
                <LandPlot size={22} className="shrink-0 text-cyan-300" aria-hidden="true" />
              </div>
              <div className="mb-3 border border-cyan-900 bg-cyan-950/30 p-2 normal-case leading-relaxed tracking-normal text-cyan-100">{selectedArea.geometry?.kind === "circle"
                ? "Drag the cyan center to move the circle or the orange radius handle to resize it. It always remains circular."
                : selectedArea.geometry?.kind === "rectangle"
                  ? "Drag the cyan center to move the rectangle or an orange corner to resize it. It always remains rectangular."
                  : primaryTool === "node"
                    ? "Drag cyan points to edit the Pen outline. Double-click a segment to add a point. Select an amber point and press Delete or Backspace to remove it."
                    : "Drag cyan points or purple curve handles to reshape the Pen area. Choose Node Edit (N) to add or remove points."}</div>
              <label className="mb-3 block font-bold text-cyan-200">Surface
                <select aria-label="Area surface fill" value={selectedArea.surface} onChange={(event) => updateSelectedArea({ surface: event.target.value as NonNullable<TacticalScenarioDefinitionFile["drawnAreas"]>[number]["surface"] })} className="mt-1 h-9 w-full border border-slate-600 bg-slate-950 px-2 text-[11px] normal-case tracking-normal text-slate-100">
                  <option value="none">None</option>
                  <option value="grass">Grass</option>
                  <option value="sand">Sand</option>
                  <option value="water">Water</option>
                  <option value="close-machinery">Closed machinery</option>
                  <option value="liquid-hydrogen">Liquid hydrogen</option>
                </select>
              </label>
              <div className="mb-3 grid grid-cols-[1fr_auto_auto] items-end gap-1">
                <label className="block font-bold text-cyan-200">Level
                  <input aria-label="Area elevation level" type="number" min="0" step="0.5" value={selectedArea.elevation} onChange={(event) => updateSelectedArea({ elevation: Number.parseFloat(event.target.value) })} className="mt-1 h-9 w-full border border-slate-600 bg-slate-950 px-2 text-[11px] text-slate-100" />
                </label>
                <button type="button" aria-label="Lower area by half level" disabled={selectedArea.elevation <= 0} onClick={() => updateSelectedArea({ elevation: Math.max(0, selectedArea.elevation - 0.5) })} className="h-9 w-9 border border-slate-600 text-lg text-cyan-100 disabled:opacity-35">−</button>
                <button type="button" aria-label="Raise area by half level" onClick={() => updateSelectedArea({ elevation: selectedArea.elevation + 0.5 })} className="h-9 w-9 border border-slate-600 text-lg text-cyan-100">+</button>
              </div>
              <label className="mb-3 block font-bold text-cyan-200">Boundary
                <select aria-label="Area boundary" value={selectedArea.boundary} onChange={(event) => updateSelectedArea({ boundary: event.target.value as NonNullable<TacticalScenarioDefinitionFile["drawnAreas"]>[number]["boundary"] })} className="mt-1 h-9 w-full border border-slate-600 bg-slate-950 px-2 text-[11px] normal-case tracking-normal text-slate-100">
                  <option value="none">None</option>
                  <option value="wall">Wall around boundary</option>
                </select>
              </label>
              <label className="mb-3 block font-bold text-cyan-200">Area use
                <select aria-label="Area use" value={selectedArea.deployment ? "crew-deployment" : "normal"} onChange={(event) => updateSelectedArea({ deployment: event.target.value === "crew-deployment" || undefined })} className="mt-1 h-9 w-full border border-slate-600 bg-slate-950 px-2 text-[11px] normal-case tracking-normal text-slate-100">
                  <option value="normal">Normal area</option>
                  <option value="crew-deployment">Crew deployment area</option>
                </select>
              </label>
              {selectedArea.surface === "liquid-hydrogen" && <label className="mb-3 flex h-9 items-center gap-2 border border-sky-700 px-2 font-bold text-sky-200">
                <input aria-label="Area liquid hydrogen filled" type="checkbox" checked={selectedArea.settings?.filled ?? true} onChange={(event) => updateSelectedArea({ settings: { ...selectedArea.settings, filled: event.target.checked } })} /> Filled
              </label>}
              <div className="mb-3 border border-cyan-900 bg-cyan-950/30 p-2 normal-case leading-relaxed tracking-normal text-cyan-100/80">Changes apply immediately. Select this area again from the map or Layers panel to reopen these controls.</div>
              <button type="button" onClick={deleteSelectedArea} className="h-9 w-full border border-red-500 font-bold text-red-100">Delete area</button>
            </div>
          </FloatingPluginHud>}
          {editableObjectProperties && <FloatingPluginHud title="Object Properties" layout={objectPropertiesLayout} onLayoutChange={persistObjectPropertiesLayout} className="w-64 font-mono text-[9px] uppercase tracking-wider text-(--hud-text)">
            <div className="max-h-[65vh] overflow-y-auto py-1 pr-1">
              {selectedNaturalTerrain && <>
                <div className="mb-2 font-bold text-lime-200">{naturalTerrainLabel(selectedNaturalTerrain.kind)}</div>
                <div className="mb-3 normal-case text-(--hud-text-dim)">Center {selectedNaturalTerrain.position.x},{selectedNaturalTerrain.position.y} · {selectedNaturalTerrain.kind === "tree" ? "trunk blocks one square" : `${tacticalNaturalTerrainFootprintCells(selectedNaturalTerrain, draft.map.width, draft.map.height).length} cover squares${selectedNaturalTerrain.kind === "rock" ? " · 3 AP" : " · 2 AP"}`}</div>
                <label className="mb-3 block font-bold text-lime-200">Radius
                  <input aria-label={`${naturalTerrainLabel(selectedNaturalTerrain.kind)} radius`} type="number" min="0.25" step="0.25" value={selectedNaturalTerrain.radius} onChange={(event) => updateSelectedNaturalTerrainRadius(Number.parseFloat(event.target.value))} className="mt-1 h-8 w-full border border-lime-700 bg-slate-950 px-2 text-[10px] text-slate-100" />
                </label>
                <div className="mb-3 normal-case text-lime-100/70">Move and resize directly on the map. Delete or Backspace also removes the selection.</div>
                <button type="button" onClick={deleteSelectedNaturalTerrain} className="h-8 w-full border border-red-500 font-bold text-red-100">Delete {selectedNaturalTerrain.kind}</button>
              </>}
              {selectedTerrainRegion?.kind === "liquid-hydrogen" && <>
                <div className="mb-2 font-bold text-sky-200">Legacy liquid hydrogen region</div>
                <label className="mb-3 flex h-8 items-center gap-2 border border-sky-700 px-2 font-bold text-sky-200">
                  <input aria-label="Liquid hydrogen region filled" type="checkbox" checked={selectedTerrainRegion.settings?.filled ?? true} onChange={(event) => updateSelectedTerrainRegionFilled(event.target.checked)} /> Filled
                </label>
                <button type="button" onClick={deleteSelectedTerrainRegion} className="h-8 w-full border border-red-500 font-bold text-red-100">Delete terrain region</button>
              </>}
            </div>
          </FloatingPluginHud>}
          <FloatingPluginHud title="Layers" layout={layersLayout} onLayoutChange={persistLayersLayout} className="font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
            <TacticalEditorLayersPanel
              groups={layerGroups}
              selectedKey={selectedLayerKey}
              hiddenKeys={hiddenLayerKeys}
              lockedKeys={lockedLayerKeys}
              onSelect={selectEditorLayerObject}
              onToggleHidden={(object) => dispatch(editorHiddenLayerToggled(object.key))}
              onToggleLocked={(object) => dispatch(editorLockedLayerToggled(object.key))}
              onMove={moveEditorLayerObject}
            />
          </FloatingPluginHud>
          <FloatingPluginHud title="Tracing Template" layout={tracingTemplateLayout} onLayoutChange={persistTracingTemplateLayout} className="w-72 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
            <div className="max-h-[70vh] overflow-y-auto py-1 pr-1">
              <div className="mb-2 normal-case text-(--hud-text-dim)">Editor-only reference image rendered beneath the grid.</div>
              <label className="mb-2 block font-bold text-cyan-200">Template image
                <select
                  aria-label="Template image"
                  value={draft.tracingTemplate?.imagePath ?? ""}
                  disabled={templateBusy}
                  onChange={(event) => void selectTracingTemplate(event.target.value)}
                  className="mt-1 h-8 w-full border border-(--hud-border) bg-slate-950 px-2 text-[9px] normal-case text-slate-100 disabled:opacity-40"
                >
                  <option value="">Choose an image</option>
                  {draft.tracingTemplate && !availableTemplates.some((template) => template.imagePath === draft.tracingTemplate?.imagePath) && <option value={draft.tracingTemplate.imagePath}>Current template</option>}
                  {availableTemplates.map((template) => <option key={template.id} value={template.imagePath}>{template.label}{template.source === "uploaded" ? " (uploaded)" : ""}</option>)}
                </select>
              </label>
              <label className="mb-2 block border border-cyan-600 px-2 py-2 text-center font-bold text-cyan-100">
                {templateBusy ? "Working…" : "Upload image"}
                <input
                  aria-label="Upload tracing template"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={templateBusy}
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void uploadTracingTemplate(file);
                  }}
                />
              </label>
              {draft.tracingTemplate && <>
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-pressed={tracingTemplateEditing}
                    disabled={!draft.tracingTemplate.visible}
                    onClick={() => {
                      setTracingTemplateEditing((current) => !current);
                      setPlacementKind(null);
                      setEnemyKind(null);
                      setWallDraft(null);
                      setPlacementHover(null);
                      setEnemyHover(null);
                    }}
                    className={`h-8 border font-bold disabled:opacity-40 ${tracingTemplateEditing ? "border-cyan-200 bg-cyan-300/20 text-cyan-50" : "border-cyan-600 text-cyan-100"}`}
                  >
                    {tracingTemplateEditing ? "Finish adjusting" : "Adjust on map"}
                  </button>
                  <button type="button" disabled={templateBusy} onClick={() => void resetTracingTemplateFit()} className="h-8 border border-amber-500 font-bold text-amber-100 disabled:opacity-40">Reset to fit</button>
                </div>
                <div className="mb-2 grid grid-cols-2 gap-2">
                  {(["x", "y", "width", "height", "rotation"] as const).map((field) => <label key={field} className="font-bold text-cyan-200">{field}
                    <input
                      aria-label={`Template ${field}`}
                      type="number"
                      min={field === "width" || field === "height" ? 0.25 : undefined}
                      step="0.1"
                      value={Number(draft.tracingTemplate?.[field].toFixed(3))}
                      onChange={(event) => updateTracingTemplateNumber(field, Number.parseFloat(event.target.value))}
                      className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-2 text-[9px] normal-case text-slate-100"
                    />
                  </label>)}
                  <label className="flex items-end">
                    <span className="flex h-7 w-full items-center gap-2 border border-(--hud-border) px-2 font-bold text-cyan-200">
                      <input type="checkbox" checked={draft.tracingTemplate.lockAspectRatio} onChange={(event) => updateTracingTemplate({ lockAspectRatio: event.target.checked })} />
                      Lock ratio
                    </span>
                  </label>
                </div>
                <label className="mb-2 block font-bold text-cyan-200">Opacity · {Math.round(draft.tracingTemplate.opacity * 100)}%
                  <input aria-label="Template opacity" type="range" min="0" max="1" step="0.05" value={draft.tracingTemplate.opacity} onChange={(event) => updateTracingTemplate({ opacity: Number.parseFloat(event.target.value) })} className="mt-1 w-full" />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex h-8 items-center gap-2 border border-(--hud-border) px-2 font-bold text-cyan-200">
                    <input
                      type="checkbox"
                      checked={draft.tracingTemplate.visible}
                      onChange={(event) => {
                        updateTracingTemplate({ visible: event.target.checked });
                        if (!event.target.checked) setTracingTemplateEditing(false);
                      }}
                    />
                    Visible
                  </label>
                  <button type="button" onClick={() => { setDraft((current) => ({ ...current, tracingTemplate: undefined })); setTracingTemplateEditing(false); }} className="h-8 border border-red-500 font-bold text-red-100">Remove</button>
                </div>
              </>}
              {templateMessage && <div role="status" className={`mt-2 border p-2 normal-case ${templateMessage.kind === "error" ? "border-red-500/70 bg-red-950/60 text-red-100" : "border-emerald-500/70 bg-emerald-950/50 text-emerald-100"}`}>{templateMessage.text}</div>}
            </div>
          </FloatingPluginHud>
          {(selectedPrimitive || placementKind === CIRCLE_TOOL_ID) && <FloatingPluginHud title="Legacy Circle Properties" layout={circlePropertiesLayout} onLayoutChange={persistCirclePropertiesLayout} className="w-56 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
            <div aria-label="Legacy circle properties" className="py-1">
              <div className="border border-violet-700 bg-violet-950/20 p-2">
                <div className="mb-2 font-bold text-violet-200">{selectedPrimitive ? `Legacy circle · ${selectedPrimitive.id}` : "Legacy circle compatibility"}</div>
                <div className="mb-2 grid grid-cols-2 gap-1">
                  {([
                    ["wall", "Wall"],
                    ["raised-area", "Raised"],
                    ["close-machinery", "Machinery"],
                    ["liquid-hydrogen", "Liquid H₂"],
                  ] as const).map(([terrainType, label]) => {
                    const activeType = selectedPrimitive?.terrainType ?? circleTerrainType;
                    return <button
                      key={terrainType}
                      type="button"
                      aria-label={`Circle type ${label}`}
                      aria-pressed={activeType === terrainType}
                      onClick={() => {
                        setCircleTerrainType(terrainType);
                        if (selectedPrimitive) updateSelectedPrimitiveType(terrainType);
                      }}
                      className={`h-8 border px-1 font-bold uppercase ${activeType === terrainType ? "border-white bg-white/15 text-white" : "border-violet-800 text-violet-200"}`}
                    >{label}</button>;
                  })}
                </div>
                <div className="mb-2 normal-case text-violet-200/70">
                  {selectedPrimitive
                    ? "Change type here. Use the handles on the map to move or resize."
                    : `The Boundaries HUD activated this compatibility tool. Use Circle Area for ordinary circles. This legacy circle will be ${circleTerrainType === "wall" ? "a wall" : circleTerrainType === "raised-area" ? "a raised area" : circleTerrainType === "close-machinery" ? "machinery" : "liquid hydrogen"}.`}
                </div>
                {selectedPrimitive && <>
                  <div className="mb-2 grid grid-cols-3 gap-1">
                    {(["x", "y"] as const).map((axis) => <label key={axis} className="font-bold text-violet-200">Center {axis}
                      <input
                        aria-label={`Circle center ${axis}`}
                        type="number"
                        step="0.25"
                        value={selectedPrimitive.center[axis]}
                        onChange={(event) => updateSelectedPrimitive({
                          center: {
                            ...selectedPrimitive.center,
                            [axis]: Number.parseFloat(event.target.value),
                          },
                        })}
                        className="mt-1 h-7 w-full border border-violet-800 bg-slate-950 px-1 text-[9px] text-slate-100"
                      />
                    </label>)}
                    <label className="font-bold text-violet-200">Radius
                      <input
                        aria-label="Circle radius"
                        type="number"
                        min="0.01"
                        step="0.25"
                        value={selectedPrimitive.radius}
                        onChange={(event) => updateSelectedPrimitive({ radius: Number.parseFloat(event.target.value) })}
                        className="mt-1 h-7 w-full border border-violet-800 bg-slate-950 px-1 text-[9px] text-slate-100"
                      />
                    </label>
                  </div>
                  {selectedPrimitive.terrainType === "liquid-hydrogen" && <label className="mb-2 flex items-center gap-2 border-t border-violet-800 pt-2 font-bold text-sky-200">
                    <input
                      aria-label="Circle liquid hydrogen filled"
                      type="checkbox"
                      checked={selectedPrimitive.settings?.filled ?? true}
                      onChange={(event) => updateSelectedPrimitive({ settings: { filled: event.target.checked } })}
                    />
                    Filled
                  </label>}
                  <button type="button" onClick={deleteSelectedPrimitive} className="h-7 w-full border border-red-500 font-bold uppercase text-red-100">Delete Circle</button>
                </>}
              </div>
            </div>
          </FloatingPluginHud>}
          <FloatingPluginHud title="Enemy Palette" layout={enemyPaletteLayout} onLayoutChange={persistEnemyPaletteLayout} className="w-56 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
            <div aria-label="Enemy options" className="grid grid-cols-1 gap-1.5 py-1">
              {tacticalEnemyPalette.map((enemy) => <button type="button" key={enemy.id} aria-pressed={enemyKind === enemy.id} onClick={() => activateEnemyTool(enemy.id)} className={`min-h-11 border px-2 py-2 text-left ${enemyKind === enemy.id ? "border-red-200 bg-red-300/20 text-red-50" : "border-(--hud-border) text-(--hud-text) hover:border-red-300"}`}>
                <span className="block font-bold">{enemy.label}</span><span className="mt-1 block normal-case text-(--hud-text-dim)">{enemy.equipment}</span>
              </button>)}
            </div>
          </FloatingPluginHud>
          {selectedPlacement && selectedHasTerminal && <FloatingPluginHud title={selectedIsInteractiveHuman ? "Human Interaction Editor" : "Console Editor"} layout={consoleEditorLayout} onLayoutChange={persistConsoleEditorLayout} className="w-80 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
            <div className="max-h-[70vh] overflow-y-auto overscroll-contain py-1 pr-1">
              <div className="mb-2 text-[8px] text-(--hud-text-dim)">{selectedPlacement.id}</div>
              <label className="mb-2 block font-bold text-cyan-200">{selectedIsInteractiveHuman ? "Human name" : "Console name"}
                <input value={selectedPlacement.objectSettings?.terminal?.label ?? (selectedIsInteractiveHuman ? "Interactive Human" : selectedPlacement.terrainDefinitionId === "console-1x1" ? "Console" : "Control Room Console")} onChange={(event) => updateSelectedTerminal({ label: event.target.value })} className="mt-1 h-8 w-full border border-(--hud-border) bg-slate-950 px-2 text-[10px] normal-case text-slate-100 outline-none focus:border-cyan-400" />
              </label>
              {selectedIsInteractiveHuman && <button type="button" aria-label="Rotate interactive human 90 degrees" onClick={() => updateSelectedTerminal({ facing: ((((selectedPlacement.objectSettings?.terminal?.facing ?? 0) + 90) % 360) as TacticalTerrainPlacement["rotation"]) })} className="mb-3 h-8 w-full border border-purple-400 font-bold text-purple-100">Facing {facingName((((selectedPlacement.objectSettings?.terminal?.facing ?? 0) + selectedPlacement.rotation) % 360) as TacticalTerrainPlacement["rotation"])} · Rotate 90°</button>}
              <div className={`mb-3 grid items-end gap-2 ${selectedIsInteractiveHuman ? "grid-cols-1" : "grid-cols-[1fr_auto]"}`}>
                {!selectedIsInteractiveHuman && <label className="block font-bold text-cyan-200">Console type
                  <select value={selectedPlacement.objectSettings?.terminal?.terminalKind ?? "generic"} onChange={(event) => updateSelectedTerminal({ terminalKind: event.target.value as TacticalTerminalKind })} className="mt-1 h-8 w-full border border-(--hud-border) bg-slate-950 px-2 text-[9px] normal-case text-slate-100">
                    {(["generic", "navigation", "engineering", "security", "communications"] as const).map((kind) => <option key={kind} value={kind}>{kind}</option>)}
                  </select>
                </label>}
                <label className="flex h-8 items-center gap-1 border border-(--hud-border) px-2 font-bold text-cyan-200">
                  <input type="checkbox" checked={selectedPlacement.objectSettings?.terminal?.operational ?? true} onChange={(event) => updateSelectedTerminal({ operational: event.target.checked })} /> Operational
                </label>
              </div>

              {selectedIsInteractiveHuman && <details className="mb-3 border border-purple-500/60" open>
                <summary className="cursor-pointer px-2 py-1.5 font-bold text-purple-200">Combat profile after transformation</summary>
                <div className="grid grid-cols-2 gap-2 border-t border-purple-500/40 p-2">
                  <label className="font-bold text-purple-200">Weapon
                    <select value={selectedHumanCombatProfile.weaponId} onChange={(event) => updateSelectedHumanCombatProfile({ weaponId: event.target.value as TacticalHumanWeaponId })} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[8px] normal-case text-slate-100">{tacticalHumanWeaponOptions.map((weapon) => <option key={weapon.id} value={weapon.id}>{weapon.label}</option>)}</select>
                  </label>
                  <label className="font-bold text-purple-200">Weapon skill
                    <input type="number" value={selectedHumanCombatProfile.weaponSkill} onChange={(event) => updateSelectedHumanCombatProfile({ weaponSkill: Number.parseInt(event.target.value, 10) || 0 })} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[9px] text-slate-100" />
                  </label>
                  <label className="font-bold text-purple-200">Armor
                    <select value={selectedHumanCombatProfile.armorId} onChange={(event) => updateSelectedHumanCombatProfile({ armorId: event.target.value as TacticalHumanArmorId })} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[8px] normal-case text-slate-100">{tacticalHumanArmorOptions.map((armor) => <option key={armor.id} value={armor.id}>{armor.label}</option>)}</select>
                  </label>
                  <label className="font-bold text-purple-200">Melee weapon
                    <input value={selectedHumanCombatProfile.meleeWeaponName} onChange={(event) => updateSelectedHumanCombatProfile({ meleeWeaponName: event.target.value })} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[9px] normal-case text-slate-100" />
                  </label>
                  <label className="font-bold text-purple-200">Melee penetration
                    <input type="number" value={selectedHumanCombatProfile.meleePenetration} onChange={(event) => updateSelectedHumanCombatProfile({ meleePenetration: Number.parseInt(event.target.value, 10) || 0 })} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[9px] text-slate-100" />
                  </label>
                  <label className="font-bold text-purple-200">Melee rating
                    <input type="number" value={selectedHumanCombatProfile.meleeRating} onChange={(event) => updateSelectedHumanCombatProfile({ meleeRating: Number.parseInt(event.target.value, 10) || 0 })} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[9px] text-slate-100" />
                  </label>
                  <label className="font-bold text-purple-200">Morale
                    <input type="number" value={selectedHumanCombatProfile.moraleFactor} onChange={(event) => updateSelectedHumanCombatProfile({ moraleFactor: Number.parseInt(event.target.value, 10) || 0 })} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[9px] text-slate-100" />
                  </label>
                  <label className="font-bold text-purple-200">Leadership
                    <input type="number" value={selectedHumanCombatProfile.leadershipRating} onChange={(event) => updateSelectedHumanCombatProfile({ leadershipRating: Number.parseInt(event.target.value, 10) || 0 })} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[9px] text-slate-100" />
                  </label>
                  <div className="col-span-2 border-t border-purple-500/40 pt-2">
                    <div className="mb-1 flex items-center justify-between"><span className="font-bold text-purple-200">Skills</span><button type="button" onClick={() => updateSelectedHumanCombatProfile({ skills: [...selectedHumanCombatProfile.skills, { name: "Skill", level: 0 }] })} className="border border-emerald-600 px-2 py-1 text-emerald-100">Add skill</button></div>
                    {selectedHumanCombatProfile.skills.map((skill, index) => <div key={`${index}:${skill.name}`} className="mb-1 grid grid-cols-[1fr_3rem_auto] gap-1">
                      <input aria-label={`Combat skill ${index + 1}`} value={skill.name} onChange={(event) => updateSelectedHumanCombatProfile({ skills: selectedHumanCombatProfile.skills.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) })} className="h-7 border border-(--hud-border) bg-slate-950 px-1 text-[9px] normal-case text-slate-100" />
                      <input aria-label={`Combat skill level ${index + 1}`} type="number" value={skill.level} onChange={(event) => updateSelectedHumanCombatProfile({ skills: selectedHumanCombatProfile.skills.map((item, itemIndex) => itemIndex === index ? { ...item, level: Number.parseInt(event.target.value, 10) || 0 } : item) })} className="h-7 border border-(--hud-border) bg-slate-950 px-1 text-[9px] text-slate-100" />
                      <button type="button" onClick={() => updateSelectedHumanCombatProfile({ skills: selectedHumanCombatProfile.skills.filter((_, itemIndex) => itemIndex !== index) })} className="border border-red-600 px-1 text-red-200">Remove</button>
                    </div>)}
                  </div>
                </div>
              </details>}

              <div className="border-t border-(--hud-border) pt-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-cyan-200">{selectedIsInteractiveHuman ? "Tasks involving this person" : "Tasks at this console"}</div>
                    <div className="mt-1 normal-case text-(--hud-text-dim)">A task is what a character can perform {selectedIsInteractiveHuman ? "with this person" : "at this console"}.</div>
                  </div>
                  <button type="button" onClick={addConsoleOperation} className="shrink-0 border border-emerald-500 px-2 py-1.5 font-bold text-emerald-100">{victoryTaskRequired ? "Add victory task" : "Add operation"}</button>
                </div>
                {selectedConsoleOperations.length === 0 && <div className="mb-2 border border-amber-500/70 bg-amber-950/50 p-2 normal-case text-amber-100">This {selectedIsInteractiveHuman ? "person" : "console"} has no task. Add a victory task before saving or playtesting.</div>}
                <div className="mb-2 flex flex-wrap gap-1">
                  {selectedConsoleOperations.map((operation) => <button type="button" key={operation.id} onClick={() => setSelectedOperationId(operation.id)} className={`border px-2 py-1.5 normal-case ${selectedOperationId === operation.id ? "border-amber-300 bg-amber-950/50 text-amber-100" : "border-(--hud-border) text-(--hud-text)"}`}>{operation.label}</button>)}
                </div>

                {selectedOperation?.consolePlacementId === selectedPlacement.id && <div className="border border-amber-700/70 p-2">
                  <label className="mb-2 block font-bold text-amber-200">Task name
                    <input value={selectedOperation.label} onChange={(event) => updateConsoleOperation(selectedOperation.id, (operation) => ({ ...operation, label: event.target.value }))} className="mt-1 h-8 w-full border border-(--hud-border) bg-slate-950 px-2 text-[10px] normal-case text-slate-100" />
                  </label>
                  <div className="mb-1 font-bold text-amber-200">Required checks, in order</div>
                  {selectedOperation.checks.map((check, index) => <div key={check.id} className="mb-2 border border-(--hud-border) p-1.5">
                    <div className="mb-1 text-(--hud-text-dim)">Check {index + 1}</div>
                    <label className="mb-1 block font-bold text-amber-200">Skill
                      <input aria-label={`Skill for check ${index + 1}`} list="interaction-skill-options" value={check.skill} onChange={(event) => updateConsoleOperation(selectedOperation.id, (operation) => ({ ...operation, checks: operation.checks.map((item) => item.id === check.id ? { ...item, skill: event.target.value } : item) }))} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[9px] normal-case text-slate-100" />
                    </label>
                    <div className="grid grid-cols-[1fr_4rem] gap-1">
                      <label className="font-bold text-amber-200">Difficulty
                        <select aria-label={`Difficulty for check ${index + 1}`} value={check.difficulty} onChange={(event) => updateConsoleOperation(selectedOperation.id, (operation) => ({ ...operation, checks: operation.checks.map((item) => item.id === check.id ? { ...item, difficulty: event.target.value as TravellerTaskDifficulty } : item) }))} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[8px] text-slate-100">
                          {TRAVELLER_TASK_DIFFICULTIES.map((difficulty) => <option key={difficulty.id} value={difficulty.id}>{difficulty.label} {difficulty.target}+</option>)}
                        </select>
                      </label>
                      <label className="font-bold text-amber-200">AP cost
                        <input aria-label={`AP cost for check ${index + 1}`} type="number" min="1" max="6" value={check.apCost} onChange={(event) => updateConsoleOperation(selectedOperation.id, (operation) => ({ ...operation, checks: operation.checks.map((item) => item.id === check.id ? { ...item, apCost: Number.parseInt(event.target.value, 10) || 1 } : item) }))} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[8px] text-slate-100" />
                      </label>
                    </div>
                    <div className="mt-1 grid grid-cols-3 gap-1">
                      <button type="button" disabled={index === 0} onClick={() => updateConsoleOperation(selectedOperation.id, (operation) => { const checks = [...operation.checks]; [checks[index - 1], checks[index]] = [checks[index], checks[index - 1]]; return { ...operation, checks }; })} className="border border-(--hud-border) disabled:opacity-30">Up</button>
                      <button type="button" disabled={index === selectedOperation.checks.length - 1} onClick={() => updateConsoleOperation(selectedOperation.id, (operation) => { const checks = [...operation.checks]; [checks[index], checks[index + 1]] = [checks[index + 1], checks[index]]; return { ...operation, checks }; })} className="border border-(--hud-border) disabled:opacity-30">Down</button>
                      <button type="button" disabled={selectedOperation.checks.length === 1} onClick={() => updateConsoleOperation(selectedOperation.id, (operation) => ({ ...operation, checks: operation.checks.filter((item) => item.id !== check.id) }))} className="border border-red-600 text-red-200 disabled:opacity-30">Remove</button>
                    </div>
                  </div>)}
                  <button type="button" onClick={() => updateConsoleOperation(selectedOperation.id, (operation) => { const suffix = operation.checks.length + 1; return { ...operation, checks: [...operation.checks, { id: `${operation.id}-check-${suffix}`, skill: selectedIsInteractiveHuman ? "Persuade" : "Security", difficulty: "average", apCost: 6 }] }; })} className="mb-2 w-full border border-emerald-600 py-1.5 text-emerald-100">Add task check</button>
                  {selectedIsInteractiveHuman && <div className="mb-2 grid grid-cols-2 gap-2 border border-purple-500/60 p-2">
                    <label className="font-bold text-purple-200">Success becomes
                      <select value={selectedOperation.successTransformation ?? "none"} onChange={(event) => updateConsoleOperation(selectedOperation.id, (operation) => ({ ...operation, successTransformation: event.target.value === "none" ? undefined : event.target.value as "ally" | "enemy" }))} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[8px] text-slate-100"><option value="none">No transformation</option><option value="ally">Ally</option><option value="enemy">Enemy</option></select>
                    </label>
                    <label className="font-bold text-purple-200">Failure becomes
                      <select value={selectedOperation.failureTransformation ?? "none"} onChange={(event) => updateConsoleOperation(selectedOperation.id, (operation) => ({ ...operation, failureTransformation: event.target.value === "none" ? undefined : event.target.value as "ally" | "enemy" }))} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[8px] text-slate-100"><option value="none">No transformation</option><option value="ally">Ally</option><option value="enemy">Enemy</option></select>
                    </label>
                    <div className="col-span-2 normal-case text-(--hud-text-dim)">A transformation resolves this interaction permanently. The new combatant waits for its side’s next phase.</div>
                  </div>}
                  <label className="mb-2 block font-bold text-amber-200">When all checks succeed
                    <select value={selectedOperation.result.type} onChange={(event) => { const victory = event.target.value === "victory"; setConsoleVictory((current) => ({ ...current, operations: current.operations.map((operation) => operation.id === selectedOperation.id ? { ...operation, result: victory ? { type: "victory" } : { type: "unlock", operationIds: [] } } : victory ? { ...operation, prerequisites: { ...operation.prerequisites, operationIds: operation.prerequisites.operationIds.filter((id) => id !== selectedOperation.id) } } : operation) })); }} className="mt-1 h-8 w-full border border-(--hud-border) bg-slate-950 px-2 text-[9px] text-slate-100"><option value="victory">Win the scenario</option><option value="unlock">Unlock other tasks</option></select>
                  </label>

                  <details className="mb-2 border border-(--hud-border)">
                    <summary className="cursor-pointer px-2 py-1.5 font-bold text-(--hud-text-dim)">Advanced chaining and critical effects</summary>
                    <div className="border-t border-(--hud-border) p-2">
                      <label className="mb-2 block font-bold text-amber-200">Available after
                        <select value={selectedOperation.prerequisites.mode} onChange={(event) => updateConsoleOperation(selectedOperation.id, (operation) => ({ ...operation, prerequisites: { ...operation.prerequisites, mode: event.target.value as "any" | "all" } }))} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[8px] text-slate-100"><option value="any">Any selected task</option><option value="all">All selected tasks</option></select>
                      </label>
                      <div className="mb-2 max-h-24 overflow-y-auto border border-(--hud-border) p-1">
                        {consoleVictory.operations.filter((operation) => operation.id !== selectedOperation.id && operation.result.type === "unlock").map((candidate) => <label key={candidate.id} className="mb-1 flex items-center gap-1 normal-case text-(--hud-text)"><input type="checkbox" checked={selectedOperation.prerequisites.operationIds.includes(candidate.id)} onChange={(event) => { const checked = event.target.checked; setConsoleVictory((current) => ({ ...current, operations: current.operations.map((operation) => {
                          if (operation.id === selectedOperation.id) return { ...operation, prerequisites: { ...operation.prerequisites, operationIds: checked ? [...new Set([...operation.prerequisites.operationIds, candidate.id])] : operation.prerequisites.operationIds.filter((id) => id !== candidate.id) } };
                          if (operation.id === candidate.id && operation.result.type === "unlock") return { ...operation, result: { ...operation.result, operationIds: checked ? [...new Set([...operation.result.operationIds, selectedOperation.id])] : operation.result.operationIds.filter((id) => id !== selectedOperation.id) } };
                          return operation;
                        }) })); }} /> {candidate.label}</label>)}
                        {consoleVictory.operations.filter((operation) => operation.id !== selectedOperation.id && operation.result.type === "unlock").length === 0 && <div className="normal-case text-(--hud-text-dim)">No predecessor tasks are available.</div>}
                      </div>
                      {selectedOperation.result.type === "unlock" && <div className="mb-2">
                        <div className="mb-1 font-bold text-amber-200">Tasks unlocked</div>
                        <div className="max-h-24 overflow-y-auto border border-(--hud-border) p-1">{consoleVictory.operations.filter((operation) => operation.id !== selectedOperation.id).map((candidate) => <label key={candidate.id} className="mb-1 flex items-center gap-1 normal-case text-(--hud-text)"><input type="checkbox" checked={selectedOperation.result.type === "unlock" && selectedOperation.result.operationIds.includes(candidate.id)} onChange={(event) => { const checked = event.target.checked; setConsoleVictory((current) => ({ ...current, operations: current.operations.map((operation) => {
                          if (operation.id === selectedOperation.id && operation.result.type === "unlock") return { ...operation, result: { ...operation.result, operationIds: checked ? [...new Set([...operation.result.operationIds, candidate.id])] : operation.result.operationIds.filter((id) => id !== candidate.id) } };
                          if (operation.id === candidate.id) return { ...operation, prerequisites: { ...operation.prerequisites, operationIds: checked ? [...new Set([...operation.prerequisites.operationIds, selectedOperation.id])] : operation.prerequisites.operationIds.filter((id) => id !== selectedOperation.id) } };
                          return operation;
                        }) })); }} /> {candidate.label}</label>)}</div>
                      </div>}
                      <div className="grid grid-cols-2 gap-1">
                        <label className="font-bold text-amber-200">Critical success next DM<input type="number" value={selectedOperation.criticalSuccessNextCheckModifier ?? 0} onChange={(event) => updateConsoleOperation(selectedOperation.id, (operation) => ({ ...operation, criticalSuccessNextCheckModifier: Number.parseInt(event.target.value, 10) || 0 }))} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[9px] text-slate-100" /></label>
                        <label className="font-bold text-amber-200">Critical failure next DM<input type="number" value={selectedOperation.criticalFailureNextCheckModifier ?? 0} onChange={(event) => updateConsoleOperation(selectedOperation.id, (operation) => ({ ...operation, criticalFailureNextCheckModifier: Number.parseInt(event.target.value, 10) || 0 }))} className="mt-1 h-7 w-full border border-(--hud-border) bg-slate-950 px-1 text-[9px] text-slate-100" /></label>
                      </div>
                    </div>
                  </details>
                  <button type="button" onClick={deleteSelectedOperation} className="w-full border border-red-500 py-1.5 font-bold text-red-100">Delete task</button>
                </div>}
              </div>
              <datalist id="interaction-skill-options">{INTERACTION_SKILLS.map((skill) => <option key={skill} value={skill} />)}</datalist>
            </div>
          </FloatingPluginHud>}
          {selectedEnemy && <FloatingPluginHud title="Enemy Editor" layout={enemyEditorLayout} onLayoutChange={persistEnemyEditorLayout} className="w-64 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
            <div className="py-1">
              <div className="mb-3 flex gap-2">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden border border-red-500/60 bg-black">
                  <Image src={selectedEnemy.avatarPath} alt="" fill sizes="64px" className="object-cover" />
                </div>
                <div className="min-w-0 normal-case">
                  <div className="truncate font-bold text-red-100">{tacticalEnemyPalette.find((enemy) => enemy.id === selectedEnemy.type)?.label}</div>
                  <div className="mt-1 text-(--hud-text-dim)">{tacticalEnemyPalette.find((enemy) => enemy.id === selectedEnemy.type)?.equipment}</div>
                  <div className="mt-1 text-(--hud-text-dim)">Square {selectedEnemy.position.x}, {selectedEnemy.position.y}</div>
                </div>
              </div>
              {selectedEnemyLocked && <div className="mb-3 border border-amber-500/70 bg-amber-950/40 p-2 normal-case text-amber-100">
                <div className="mb-2">This enemy is locked. It can be selected, but it cannot be moved or edited.</div>
                <button type="button" onClick={() => dispatch(editorLayerUnlocked(tacticalEditorLayerKey("enemy", selectedEnemy.id)))} className="h-7 w-full border border-amber-400 font-bold uppercase">Unlock enemy</button>
              </div>}
              <label className="mb-3 block font-bold text-red-200">Enemy name
                <input disabled={selectedEnemyLocked} value={selectedEnemy.name} onChange={(event) => updateSelectedEnemyName(event.target.value)} className="mt-1 h-8 w-full border border-(--hud-border) bg-slate-950 px-2 text-[10px] normal-case text-slate-100 outline-none focus:border-red-400 disabled:cursor-not-allowed disabled:opacity-50" />
              </label>
              <button type="button" disabled={selectedEnemyLocked} aria-label="Rotate enemy 90 degrees" onClick={rotateSelectedEnemy} className="mb-3 h-8 w-full border border-amber-400 font-bold text-amber-100 disabled:cursor-not-allowed disabled:opacity-40">Facing {facingName(selectedEnemy.facing ?? "north")} · Rotate 90°</button>
              <button type="button" disabled={selectedEnemyLocked} onClick={deleteSelectedEnemy} className="w-full border border-red-500 py-1.5 font-bold text-red-100 disabled:cursor-not-allowed disabled:opacity-40">Delete enemy</button>
              <div className="mt-2 normal-case text-(--hud-text-dim)">You can also press Delete while this enemy is selected.</div>
            </div>
          </FloatingPluginHud>}
          </div>
        </PluginHudLayer>
        </TacticalEditorViewportProvider>
      </section>
    </div>
  </main>;
};

export default TacticalScenarioEditorClient;
