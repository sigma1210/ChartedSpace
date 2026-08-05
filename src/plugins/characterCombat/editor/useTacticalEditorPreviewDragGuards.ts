"use client";

import type {
  AreaCubicControlDrag,
  CirclePrimitiveDrag,
  ConstrainedAreaDrag,
  EditorMapPoint,
  EditorObjectDrag,
  NaturalTerrainDrag,
  RaisedAreaControlDrag,
  WallEndpoint,
} from "@/plugins/characterCombat/editor/tacticalEditorInteractionState";
import {
  tacticalEditorLayerKey,
  type TacticalEditorLayerObjectKind,
} from "@/plugins/characterCombat/editor/tacticalEditorLayers";

type TacticalEditorPreviewDragGuardOptions = {
  lockedLayerKeys: ReadonlySet<string>;
  beginCirclePrimitiveDrag: (id: string, kind: CirclePrimitiveDrag["kind"]) => void;
  beginNaturalTerrainDrag: (id: string, kind: NaturalTerrainDrag["kind"], point?: EditorMapPoint) => void;
  beginRaisedAreaControlDrag: (owner: RaisedAreaControlDrag["owner"], segmentIndex: number) => void;
  beginAreaAnchorDrag: (id: string, anchorIndex: number) => void;
  beginAreaCubicControlDrag: (id: string, segmentIndex: number, control: AreaCubicControlDrag["control"]) => void;
  beginConstrainedAreaDrag: (id: string, kind: ConstrainedAreaDrag["kind"], point: EditorMapPoint) => void;
  beginWallEndpointDrag: (id: string, endpoint: WallEndpoint) => void;
  beginWallMove: (id: string, point: EditorMapPoint) => void;
  beginWallControlDrag: (id: string) => void;
  beginWallPortalDrag: (id: string) => void;
  beginPlacementDrag: (drag: EditorObjectDrag) => void;
  beginEnemyDrag: (drag: EditorObjectDrag) => void;
};

export const useTacticalEditorPreviewDragGuards = ({
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
  beginPlacementDrag,
  beginEnemyDrag,
}: TacticalEditorPreviewDragGuardOptions) => {
  const isLocked = (kind: TacticalEditorLayerObjectKind, id: string) => (
    lockedLayerKeys.has(tacticalEditorLayerKey(kind, id))
  );

  const previewBeginCirclePrimitiveDrag = (id: string, kind: CirclePrimitiveDrag["kind"]) => {
    if (isLocked("primitive", id)) return;
    beginCirclePrimitiveDrag(id, kind);
  };
  const previewBeginNaturalTerrainDrag = (id: string, kind: NaturalTerrainDrag["kind"], point?: EditorMapPoint) => {
    if (isLocked("natural-terrain", id)) return;
    beginNaturalTerrainDrag(id, kind, point);
  };
  const previewBeginRaisedAreaControlDrag = (owner: RaisedAreaControlDrag["owner"], segmentIndex: number) => {
    if (owner.kind !== "draft") {
      const kind = owner.kind === "area"
        ? "area"
        : owner.kind === "raised"
          ? "raised-area"
          : "terrain-region";
      if (isLocked(kind, owner.id)) return;
    }
    beginRaisedAreaControlDrag(owner, segmentIndex);
  };
  const previewBeginAreaAnchorDrag = (id: string, anchorIndex: number) => {
    if (isLocked("area", id)) return;
    beginAreaAnchorDrag(id, anchorIndex);
  };
  const previewBeginAreaCubicControlDrag = (
    id: string,
    segmentIndex: number,
    control: AreaCubicControlDrag["control"],
  ) => {
    if (isLocked("area", id)) return;
    beginAreaCubicControlDrag(id, segmentIndex, control);
  };
  const previewBeginConstrainedAreaDrag = (
    id: string,
    kind: ConstrainedAreaDrag["kind"],
    point: EditorMapPoint,
  ) => {
    if (isLocked("area", id)) return;
    beginConstrainedAreaDrag(id, kind, point);
  };
  const previewBeginWallEndpointDrag = (id: string, endpoint: WallEndpoint) => {
    if (isLocked("wall", id)) return;
    beginWallEndpointDrag(id, endpoint);
  };
  const previewBeginWallMove = (id: string, point: EditorMapPoint) => {
    if (isLocked("wall", id)) return;
    beginWallMove(id, point);
  };
  const previewBeginWallControlDrag = (id: string) => {
    if (isLocked("wall", id)) return;
    beginWallControlDrag(id);
  };
  const previewBeginWallPortalDrag = (id: string) => {
    if (isLocked("portal", id)) return;
    beginWallPortalDrag(id);
  };
  const previewBeginPlacementDrag = (drag: EditorObjectDrag) => {
    if (isLocked("terrain-placement", drag.id)) return;
    beginPlacementDrag(drag);
  };
  const previewBeginEnemyDrag = (drag: EditorObjectDrag) => {
    if (isLocked("enemy", drag.id)) return;
    beginEnemyDrag(drag);
  };

  return {
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
  };
};
