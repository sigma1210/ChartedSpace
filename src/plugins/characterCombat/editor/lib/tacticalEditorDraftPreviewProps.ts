import type {
  TacticalEnemyType,
  TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type {
  AreaAnchorDrag,
  AreaCubicControlDrag,
  CircleDraft,
  CirclePrimitiveDrag,
  ConstrainedAreaDrag,
  EditorMapPoint,
  NaturalTerrainDrag,
  RaisedAreaControlDrag,
  RaisedAreaDraft,
  RampDraft,
  TracingTemplateCorner,
  TracingTemplateTransformDrag,
  WallControlDrag,
  WallEndpoint,
  WallEndpointDrag,
  WallMoveDrag,
  WallPortalDrag,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorInteractionState";

export type TacticalEditorDraftPreviewProps = {
  definition: TacticalScenarioDefinitionFile;
  handToolActive: boolean;
  nodeEditActive: boolean;
  selectedAreaAnchor: { areaId: string; anchorIndex: number } | null;
  selectedPlacementId: string | null;
  selectedEnemyId: string | null;
  selectedWallId: string | null;
  selectedRaisedAreaId: string | null;
  selectedPrimitiveId: string | null;
  selectedNaturalTerrainId: string | null;
  selectedElevationTransitionId: string | null;
  selectedPortalId: string | null;
  selectedFire: { x: number; y: number } | null;
  placementKind: string | null;
  enemyKind: TacticalEnemyType | null;
  placementHover: EditorMapPoint | null;
  enemyHover: { x: number; y: number } | null;
  portalHover: { x: number; y: number } | null;
  wallDraft: { from: { x: number; y: number }; to: { x: number; y: number }; curved: boolean; awaitingEnd: boolean } | null;
  raisedAreaDraft: RaisedAreaDraft | null;
  circleDraft: CircleDraft | null;
  rampDraft: RampDraft | null;
  dragRaisedAreaControl: RaisedAreaControlDrag | null;
  dragAreaAnchor: AreaAnchorDrag | null;
  dragAreaCubicControl: AreaCubicControlDrag | null;
  dragConstrainedArea: ConstrainedAreaDrag | null;
  dragCirclePrimitive: CirclePrimitiveDrag | null;
  dragNaturalTerrain: NaturalTerrainDrag | null;
  dragWallEndpoint: WallEndpointDrag | null;
  dragWallMove: WallMoveDrag | null;
  dragWallControl: WallControlDrag | null;
  dragWallPortal: WallPortalDrag | null;
  dragTracingTemplate: TracingTemplateTransformDrag | null;
  tracingTemplateEditing: boolean;
  dragPlacement: { id: string; offset: { x: number; y: number } } | null;
  dragEnemy: { id: string; offset: { x: number; y: number } } | null;
  selectPlacement: (id: string | null) => void;
  selectEnemy: (id: string | null) => void;
  selectWall: (id: string | null) => void;
  selectRaisedArea: (id: string | null) => void;
  selectAreaAnchor: (selection: { areaId: string; anchorIndex: number } | null) => void;
  insertAreaAnchor: (areaId: string, segmentIndex: number, point: { x: number; y: number }) => void;
  selectPrimitive: (id: string | null) => void;
  selectNaturalTerrain: (id: string | null) => void;
  selectElevationTransition: (id: string | null) => void;
  selectPortal: (id: string | null) => void;
  selectFire: (point: { x: number; y: number } | null) => void;
  hoverPlacement: (point: EditorMapPoint | null) => void;
  hoverEnemy: (point: { x: number; y: number } | null) => void;
  hoverPortal: (point: { x: number; y: number } | null) => void;
  beginWall: (point: { x: number; y: number }) => void;
  updateWall: (point: { x: number; y: number }) => void;
  finishWall: (point: { x: number; y: number }) => void;
  finishWallInteraction: (point: { x: number; y: number }) => void;
  cancelWall: () => void;
  beginCircle: (point: { x: number; y: number }) => void;
  updateCircle: (point: { x: number; y: number }) => void;
  finishCircle: (point: { x: number; y: number }) => void;
  cancelCircle: () => void;
  beginCirclePrimitiveDrag: (id: string, kind: CirclePrimitiveDrag["kind"]) => void;
  updateCirclePrimitiveDrag: (point: { x: number; y: number }) => void;
  finishCirclePrimitiveDrag: () => void;
  beginNaturalTerrainDrag: (id: string, kind: NaturalTerrainDrag["kind"], point?: { x: number; y: number }) => void;
  updateNaturalTerrainDrag: (point: { x: number; y: number }) => void;
  finishNaturalTerrainDrag: () => void;
  createRectangleArea: (from: { x: number; y: number }, to: { x: number; y: number }) => void;
  commitPenNode: (anchor: { x: number; y: number }, handle: { x: number; y: number }) => void;
  closePenArea: () => void;
  hoverRaisedArea: (point: { x: number; y: number }) => void;
  beginOrFinishRamp: (point: EditorMapPoint) => void;
  beginRaisedAreaControlDrag: (owner: RaisedAreaControlDrag["owner"], segmentIndex: number) => void;
  reshapeRaisedAreaControl: (point: { x: number; y: number }) => void;
  finishRaisedAreaControlDrag: () => void;
  cancelRaisedAreaControlDrag: () => void;
  beginAreaAnchorDrag: (id: string, anchorIndex: number) => void;
  moveAreaAnchor: (point: { x: number; y: number }) => void;
  finishAreaAnchorDrag: () => void;
  cancelAreaAnchorDrag: () => void;
  beginAreaCubicControlDrag: (id: string, segmentIndex: number, control: AreaCubicControlDrag["control"]) => void;
  moveAreaCubicControl: (point: { x: number; y: number }) => void;
  finishAreaCubicControlDrag: () => void;
  cancelAreaCubicControlDrag: () => void;
  beginConstrainedAreaDrag: (id: string, kind: ConstrainedAreaDrag["kind"], point: { x: number; y: number }) => void;
  updateConstrainedAreaDrag: (point: { x: number; y: number }) => void;
  finishConstrainedAreaDrag: () => void;
  cancelConstrainedAreaDrag: () => void;
  placeWallPortal: (point: { x: number; y: number }) => void;
  beginWallEndpointDrag: (id: string, endpoint: WallEndpoint) => void;
  resizeWallEndpoint: (point: { x: number; y: number }) => void;
  finishWallEndpointDrag: () => void;
  cancelWallEndpointDrag: () => void;
  beginWallMove: (id: string, point: { x: number; y: number }) => void;
  moveWall: (point: { x: number; y: number }) => void;
  finishWallMove: () => void;
  cancelWallMove: () => void;
  beginWallControlDrag: (id: string) => void;
  reshapeWallControl: (point: { x: number; y: number }) => void;
  finishWallControlDrag: () => void;
  cancelWallControlDrag: () => void;
  beginWallPortalDrag: (id: string) => void;
  moveWallPortal: (point: { x: number; y: number }) => void;
  finishWallPortalDrag: () => void;
  cancelWallPortalDrag: () => void;
  beginTracingTemplateDrag: (kind: "move" | "rotate" | TracingTemplateCorner, point: { x: number; y: number }) => void;
  transformTracingTemplate: (point: { x: number; y: number }) => void;
  finishTracingTemplateDrag: () => void;
  cancelTracingTemplateDrag: () => void;
  beginDrag: (drag: { id: string; offset: { x: number; y: number } }) => void;
  beginEnemyDrag: (drag: { id: string; offset: { x: number; y: number } }) => void;
  endDrag: () => void;
  placeTerrain: (point: EditorMapPoint) => void;
  placeEnemy: (point: { x: number; y: number }) => void;
  moveTerrain: (id: string, origin: { x: number; y: number }) => void;
  moveEnemy: (id: string, position: { x: number; y: number }) => void;
};
