import type { RaisedAreaDraft } from "@/plugins/characterCombat/editor/lib/tacticalEditorInteractionState";
import type { EditorMapPoint } from "@/plugins/characterCombat/editor/lib/tacticalEditorInteractionState";
import {
  snapTacticalEditorPoint,
  type TacticalEditorMapSize,
  type TacticalEditorSnapMode,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorCamera";
import { gridPoint } from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

export type TacticalEditorClientPointer = {
  currentTarget: EventTarget & SVGElement;
  clientX: number;
  clientY: number;
};

export const tacticalEditorLocalMapPoint = (event: TacticalEditorClientPointer) => {
  const svg = event.currentTarget instanceof SVGSVGElement
    ? event.currentTarget
    : event.currentTarget.ownerSVGElement;
  const matrix = svg?.getScreenCTM();
  if (!svg || !matrix) return null;
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(matrix.inverse());
};

export const tacticalEditorMapPointer = (point: { x: number; y: number }): EditorMapPoint => {
  const x = Math.floor(point.x);
  const y = Math.floor(point.y);
  const fractionX = point.x - x;
  const fractionY = point.y - y;
  const edgeRotation = ([
    { distance: fractionY, rotation: 0 as const },
    { distance: 1 - fractionX, rotation: 90 as const },
    { distance: 1 - fractionY, rotation: 180 as const },
    { distance: fractionX, rotation: 270 as const },
  ]).sort((first, second) => first.distance - second.distance)[0].rotation;
  return { x, y, edgeRotation, mapX: point.x, mapY: point.y };
};

export const tacticalEditorMapVertex = (
  point: { x: number; y: number },
  {
    raisedAreaDraft,
    areaToolActive,
    snapMode,
    map,
  }: {
    raisedAreaDraft: RaisedAreaDraft | null;
    areaToolActive: boolean;
    snapMode: TacticalEditorSnapMode;
    map: TacticalEditorMapSize;
  },
) => {
  if (raisedAreaDraft
    && areaToolActive
    && Math.hypot(point.x - raisedAreaDraft.start.x, point.y - raisedAreaDraft.start.y) <= 0.35) {
    return gridPoint(raisedAreaDraft.start);
  }
  return snapTacticalEditorPoint(point, snapMode, map);
};

export const tacticalEditorRectangleEndPoint = (
  start: { x: number; y: number },
  point: { x: number; y: number },
  constrain: boolean,
  map: TacticalEditorMapSize,
) => {
  if (!constrain) return point;
  const size = Math.max(Math.abs(point.x - start.x), Math.abs(point.y - start.y));
  return {
    x: Math.max(0, Math.min(map.width, start.x + (point.x < start.x ? -size : size))),
    y: Math.max(0, Math.min(map.height, start.y + (point.y < start.y ? -size : size))),
  };
};
