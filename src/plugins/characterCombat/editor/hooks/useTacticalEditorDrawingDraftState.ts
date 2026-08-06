"use client";

import { useState } from "react";
import type { TacticalEditorMapSize } from "@/plugins/characterCombat/editor/lib/tacticalEditorCamera";
import { tacticalEditorRectangleEndPoint } from "@/plugins/characterCombat/editor/lib/tacticalEditorPointerCoordinates";

type MapPoint = { x: number; y: number };

export type TacticalEditorRectangleDraft = {
  pointerId: number;
  start: MapPoint;
  current: MapPoint;
};

export type TacticalEditorPenNodeDrag = {
  pointerId: number;
  anchor: MapPoint;
  handle: MapPoint;
};

export const useTacticalEditorDrawingDraftState = (map: TacticalEditorMapSize) => {
  const [rectangleDraft, setRectangleDraft] = useState<TacticalEditorRectangleDraft | null>(null);
  const [penNodeDrag, setPenNodeDrag] = useState<TacticalEditorPenNodeDrag | null>(null);

  const beginRectangle = (pointerId: number, start: MapPoint) => {
    setRectangleDraft({ pointerId, start, current: start });
  };
  const moveRectangle = (pointerId: number, point: MapPoint, constrain: boolean) => {
    if (!rectangleDraft || rectangleDraft.pointerId !== pointerId) return false;
    setRectangleDraft({
      ...rectangleDraft,
      current: tacticalEditorRectangleEndPoint(rectangleDraft.start, point, constrain, map),
    });
    return true;
  };
  const finishRectangle = (pointerId: number, point: MapPoint | null, constrain: boolean) => {
    if (!rectangleDraft || rectangleDraft.pointerId !== pointerId) return null;
    const completed = {
      start: rectangleDraft.start,
      end: point
        ? tacticalEditorRectangleEndPoint(rectangleDraft.start, point, constrain, map)
        : rectangleDraft.current,
    };
    setRectangleDraft(null);
    return completed;
  };
  const beginPenNode = (pointerId: number, anchor: MapPoint) => {
    setPenNodeDrag({ pointerId, anchor, handle: anchor });
  };
  const movePenNode = (pointerId: number, handle: MapPoint) => {
    if (!penNodeDrag || penNodeDrag.pointerId !== pointerId) return false;
    setPenNodeDrag({ ...penNodeDrag, handle });
    return true;
  };
  const finishPenNode = (pointerId: number, handle: MapPoint | null) => {
    if (!penNodeDrag || penNodeDrag.pointerId !== pointerId) return null;
    const completed = {
      anchor: penNodeDrag.anchor,
      handle: handle ?? penNodeDrag.handle,
    };
    setPenNodeDrag(null);
    return completed;
  };
  const cancelPenNode = () => setPenNodeDrag(null);
  const cancelDrawingDrafts = () => {
    setRectangleDraft(null);
    setPenNodeDrag(null);
  };
  const rectanglePreview = rectangleDraft ? {
    x: Math.min(rectangleDraft.start.x, rectangleDraft.current.x),
    y: Math.min(rectangleDraft.start.y, rectangleDraft.current.y),
    width: Math.abs(rectangleDraft.current.x - rectangleDraft.start.x),
    height: Math.abs(rectangleDraft.current.y - rectangleDraft.start.y),
  } : null;

  return {
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
  };
};
