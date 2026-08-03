import { useCallback, useMemo, useReducer, type Dispatch, type SetStateAction } from "react";
import type {
  TacticalClosedAreaGeometry,
  TacticalRaisedAreaOutlineSegment,
  TacticalScenarioTracingTemplate,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type {
  TacticalElevationEdgeCandidate,
  TacticalElevationEdgePointer,
} from "@/plugins/characterCombat/tacticalElevationTransitions";

export type TracingTemplateCorner = "nw" | "ne" | "se" | "sw";
export type TracingTemplateTransformDrag =
  | { kind: "move"; start: { x: number; y: number }; original: TacticalScenarioTracingTemplate }
  | { kind: "resize"; corner: TracingTemplateCorner; original: TacticalScenarioTracingTemplate }
  | { kind: "rotate"; center: { x: number; y: number }; startAngle: number; original: TacticalScenarioTracingTemplate };
export type EditorMapPoint = TacticalElevationEdgePointer;
export type WallEndpoint = "from" | "to";
export type WallEndpointDrag = {
  id: string;
  endpoint: WallEndpoint;
  original: { from: { x: number; y: number }; to: { x: number; y: number }; control?: { x: number; y: number } };
};
export type WallMoveDrag = {
  id: string;
  start: { x: number; y: number };
  original: { from: { x: number; y: number }; to: { x: number; y: number }; control?: { x: number; y: number } };
};
export type WallControlDrag = { id: string; original: { x: number; y: number } };
export type WallPortalDrag = {
  ownerKind: "wall" | "circle" | "area";
  ownerId: string;
  portalId: string;
  originalPosition: number;
};
export type RaisedAreaDraft = {
  target: "area";
  start: { x: number; y: number };
  current: { x: number; y: number };
  hover: { x: number; y: number };
  segments: TacticalRaisedAreaOutlineSegment[];
  outgoingControl: { x: number; y: number } | null;
};
export type RaisedAreaControlDrag = {
  owner: { kind: "draft" } | { kind: "area"; id: string } | { kind: "raised"; id: string } | { kind: "terrain-region"; id: string };
  segmentIndex: number;
  original: { x: number; y: number };
};
export type AreaAnchorDrag = {
  id: string;
  anchorIndex: number;
  originalSegments: TacticalRaisedAreaOutlineSegment[];
};
export type AreaCubicControlDrag = {
  id: string;
  segmentIndex: number;
  control: "control1" | "control2";
  original: { x: number; y: number };
};
export type ConstrainedAreaDrag = {
  id: string;
  kind: "circle-center" | "circle-radius" | "rectangle-center" | "rectangle-top-left" | "rectangle-top-right" | "rectangle-bottom-right" | "rectangle-bottom-left";
  start: { x: number; y: number };
  original: TacticalClosedAreaGeometry;
};
export type RampDraft = { edge: TacticalElevationEdgeCandidate };
export type CircleDraft = { center: { x: number; y: number }; radius: number };
export type CirclePrimitiveDrag = {
  id: string;
  kind: "center" | "radius";
};
export type NaturalTerrainDrag = {
  id: string;
  kind: "position" | "radius";
  offset?: { x: number; y: number };
};
export type EditorWallDraft = {
  from: { x: number; y: number };
  to: { x: number; y: number };
  curved: boolean;
  awaitingEnd: boolean;
};
export type EditorObjectDrag = { id: string; offset: { x: number; y: number } };

export interface TacticalEditorInteractionState {
  placementHover: EditorMapPoint | null;
  enemyHover: { x: number; y: number } | null;
  portalHover: { x: number; y: number } | null;
  wallDraft: EditorWallDraft | null;
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
  dragPlacement: EditorObjectDrag | null;
  dragEnemy: EditorObjectDrag | null;
  placementError: string | null;
}

export const initialTacticalEditorInteractionState = (): TacticalEditorInteractionState => ({
  placementHover: null,
  enemyHover: null,
  portalHover: null,
  wallDraft: null,
  raisedAreaDraft: null,
  circleDraft: null,
  rampDraft: null,
  dragRaisedAreaControl: null,
  dragAreaAnchor: null,
  dragAreaCubicControl: null,
  dragConstrainedArea: null,
  dragCirclePrimitive: null,
  dragNaturalTerrain: null,
  dragWallEndpoint: null,
  dragWallMove: null,
  dragWallControl: null,
  dragWallPortal: null,
  dragTracingTemplate: null,
  tracingTemplateEditing: false,
  dragPlacement: null,
  dragEnemy: null,
  placementError: null,
});

type TacticalEditorInteractionFieldAction = {
  [Key in keyof TacticalEditorInteractionState]: {
    type: "set";
    key: Key;
    update: SetStateAction<TacticalEditorInteractionState[Key]>;
  }
}[keyof TacticalEditorInteractionState];
export type TacticalEditorInteractionAction = TacticalEditorInteractionFieldAction | { type: "clear" };

export const tacticalEditorInteractionReducer = (
  state: TacticalEditorInteractionState,
  action: TacticalEditorInteractionAction,
): TacticalEditorInteractionState => {
  if (action.type === "clear") return initialTacticalEditorInteractionState();
  const current = state[action.key];
  const next = typeof action.update === "function"
    ? (action.update as (value: typeof current) => typeof current)(current)
    : action.update;
  return Object.is(current, next) ? state : { ...state, [action.key]: next };
};

type TacticalEditorInteractionSetters = {
  [Key in keyof TacticalEditorInteractionState as `set${Capitalize<Key & string>}`]: Dispatch<SetStateAction<TacticalEditorInteractionState[Key]>>;
};

export const useTacticalEditorInteractionState = () => {
  const [state, dispatch] = useReducer(tacticalEditorInteractionReducer, undefined, initialTacticalEditorInteractionState);
  const setters = useMemo(() => Object.fromEntries(
    (Object.keys(initialTacticalEditorInteractionState()) as Array<keyof TacticalEditorInteractionState>).map((key) => {
      const setterName = `set${key.charAt(0).toUpperCase()}${key.slice(1)}`;
      return [setterName, (update: SetStateAction<TacticalEditorInteractionState[typeof key]>) => {
        dispatch({ type: "set", key, update } as TacticalEditorInteractionFieldAction);
      }];
    }),
  ) as TacticalEditorInteractionSetters, []);
  const clearInteractionState = useCallback(() => dispatch({ type: "clear" }), []);
  return { ...state, ...setters, clearInteractionState };
};
