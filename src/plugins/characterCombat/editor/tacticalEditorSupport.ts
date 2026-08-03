import { Aperture, BrickWall, Circle, DoorOpen, Flame, Gem, LandPlot, ListStart, MessagesSquare, MonitorCog, MoveUpRight, RectangleHorizontal, Shrub, Spline, TreePine, TriangleRight, UserRound } from "lucide-react";
import {
  tacticalTerrainPalette,
  type TacticalElevationTransitionDefinition,
  type TacticalEnemyPlacement,
  type TacticalEnemyType,
  type TacticalNaturalTerrainPlacement,
  type TacticalRaisedAreaOutlineSegment,
  type TacticalScenarioDefinitionFile,
  type TacticalScenarioTracingTemplate,
  type TacticalTerrainPlacement,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { TacticalEditorCamera } from "@/plugins/characterCombat/editor/TacticalEditorViewport";
import type {
  EditorMapPoint,
  RaisedAreaDraft,
  TracingTemplateCorner,
} from "@/plugins/characterCombat/editor/tacticalEditorInteractionState";
import { tacticalWallPortalPlacementCandidate, type TacticalWallPortalKind } from "@/plugins/characterCombat/tacticalWallPortals";
import { tacticalCirclePortalPlacementCandidate } from "@/plugins/characterCombat/tacticalTerrainPrimitives";
import { tacticalAreaBoundaryPortalPlacementCandidate } from "@/plugins/characterCombat/tacticalAreaBoundaryPortals";

export const FIRE_TOOL_ID = "scenario-fire";
export const WALL_TOOL_ID = "scenario-wall";
export const CURVED_WALL_TOOL_ID = "scenario-curved-wall";
export const PEN_AREA_TOOL_ID = "scenario-pen-area";
export const RECTANGLE_AREA_TOOL_ID = "scenario-rectangle-area";
export const TREE_TOOL_ID = "scenario-tree";
export const BUSH_TOOL_ID = "scenario-bush";
export const ROCK_TOOL_ID = "scenario-rock";
export const CIRCLE_TOOL_ID = "scenario-circle";
export const CIRCLE_AREA_TOOL_ID = "scenario-circle-area";
export const DOOR_TOOL_ID = "scenario-wall-door";
export const WALL_IRIS_TOOL_ID = "scenario-wall-iris-valve";
export const STAIRS_TOOL_ID = "scenario-stairs";
export const LADDER_TOOL_ID = "scenario-ladder";
export const RAMP_TOOL_ID = "scenario-ramp";
export const CONTROL_ROOM_TOOL_ID = "control-room";
export const CONSOLE_TOOL_ID = "console-1x1";
export const INTERACTIVE_HUMAN_TOOL_ID = "interactive-human";
export const EDITOR_DRAWING_TOOL_GROUPS = [
  {
    id: "boundaries",
    label: "Boundaries",
    icon: BrickWall,
    tools: [
    { id: WALL_TOOL_ID, label: "Wall", icon: BrickWall },
    { id: CURVED_WALL_TOOL_ID, label: "Curved wall", icon: Spline },
    { id: DOOR_TOOL_ID, label: "Door", icon: DoorOpen },
    { id: WALL_IRIS_TOOL_ID, label: "Wall iris valve", icon: Aperture },
    { id: CIRCLE_TOOL_ID, label: "Legacy circle wall", icon: Circle },
    ],
  },
  {
    id: "areas",
    label: "Areas",
    icon: LandPlot,
    tools: [
    { id: RECTANGLE_AREA_TOOL_ID, label: "Rectangle area", icon: RectangleHorizontal },
    { id: CIRCLE_AREA_TOOL_ID, label: "Circle area", icon: Circle },
    { id: PEN_AREA_TOOL_ID, label: "Pen", icon: Spline },
    ],
  },
  {
    id: "nature",
    label: "Nature & effects",
    icon: TreePine,
    tools: [
    { id: TREE_TOOL_ID, label: "Tree", icon: TreePine },
    { id: BUSH_TOOL_ID, label: "Bush", icon: Shrub },
    { id: ROCK_TOOL_ID, label: "Rock", icon: Gem },
    { id: FIRE_TOOL_ID, label: "Fire", icon: Flame },
    ],
  },
  {
    id: "elevation",
    label: "Elevation",
    icon: MoveUpRight,
    tools: [
    { id: STAIRS_TOOL_ID, label: "Stairs", icon: ListStart },
    { id: LADDER_TOOL_ID, label: "Ladder", icon: MoveUpRight },
    { id: RAMP_TOOL_ID, label: "Ramp", icon: TriangleRight },
    ],
  },
  {
    id: "interactions",
    label: "Interactions",
    icon: MessagesSquare,
    tools: [
    { id: CONTROL_ROOM_TOOL_ID, label: "Control Room", icon: MessagesSquare },
    { id: CONSOLE_TOOL_ID, label: "Console 1x1", icon: MonitorCog },
    { id: INTERACTIVE_HUMAN_TOOL_ID, label: "Interactive Human", icon: UserRound },
    ],
  },
] as const;
export const wallPortalKindForTool = (tool: string | null): TacticalWallPortalKind | null =>
  tool === DOOR_TOOL_ID ? "sliding-door" : tool === WALL_IRIS_TOOL_ID ? "iris-valve" : null;
export const elevationTransitionKindForTool = (tool: string | null): TacticalElevationTransitionDefinition["kind"] | null =>
  tool === STAIRS_TOOL_ID ? "stairs" : tool === LADDER_TOOL_ID ? "ladder" : tool === RAMP_TOOL_ID ? "ramp" : null;
export const INTERACTION_SKILLS = ["Bribery", "Carouse", "Diplomat", "Medic", "Leadership", "Streetwise", "Persuade", "Investigate", "Deception"] as const;
export const cellKey = (point: { x: number; y: number }) => `${point.x}:${point.y}`;
export const gridPoint = (point: { x: number; y: number }) => ({ x: point.x, y: point.y });
export const fitTacticalTracingTemplate = (
  imagePath: string,
  naturalSize: { width: number; height: number },
  mapSize: { width: number; height: number },
): TacticalScenarioTracingTemplate => {
  const validNaturalSize = naturalSize.width > 0 && naturalSize.height > 0;
  const naturalWidth = validNaturalSize ? naturalSize.width : mapSize.width;
  const naturalHeight = validNaturalSize ? naturalSize.height : mapSize.height;
  const scale = Math.min(mapSize.width / naturalWidth, mapSize.height / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  return {
    imagePath,
    x: (mapSize.width - width) / 2,
    y: (mapSize.height - height) / 2,
    width,
    height,
    rotation: 0,
    opacity: 0.45,
    visible: true,
    lockAspectRatio: true,
  };
};
export const tracingTemplateRotation = (template: TacticalScenarioTracingTemplate) => template.rotation * Math.PI / 180;
export const tracingTemplateCenter = (template: TacticalScenarioTracingTemplate) => ({
  x: template.x + template.width / 2,
  y: template.y + template.height / 2,
});
export const rotateOffset = (offset: { x: number; y: number }, radians: number) => ({
  x: offset.x * Math.cos(radians) - offset.y * Math.sin(radians),
  y: offset.x * Math.sin(radians) + offset.y * Math.cos(radians),
});
export const tracingTemplateHandlePoint = (template: TacticalScenarioTracingTemplate, corner: TracingTemplateCorner) => {
  const center = tracingTemplateCenter(template);
  const signs = {
    nw: { x: -1, y: -1 },
    ne: { x: 1, y: -1 },
    se: { x: 1, y: 1 },
    sw: { x: -1, y: 1 },
  }[corner];
  const offset = rotateOffset({ x: signs.x * template.width / 2, y: signs.y * template.height / 2 }, tracingTemplateRotation(template));
  return { x: center.x + offset.x, y: center.y + offset.y };
};
export const resizeTacticalTracingTemplate = (
  original: TacticalScenarioTracingTemplate,
  corner: TracingTemplateCorner,
  point: { x: number; y: number },
): TacticalScenarioTracingTemplate => {
  const signs = {
    nw: { x: -1, y: -1 },
    ne: { x: 1, y: -1 },
    se: { x: 1, y: 1 },
    sw: { x: -1, y: 1 },
  }[corner];
  const opposite = ({ nw: "se", ne: "sw", se: "nw", sw: "ne" } as const)[corner];
  const anchor = tracingTemplateHandlePoint(original, opposite);
  const radians = tracingTemplateRotation(original);
  const widthAxis = { x: Math.cos(radians), y: Math.sin(radians) };
  const heightAxis = { x: -Math.sin(radians), y: Math.cos(radians) };
  const delta = { x: point.x - anchor.x, y: point.y - anchor.y };
  let width = Math.max(0.25, signs.x * (delta.x * widthAxis.x + delta.y * widthAxis.y));
  let height = Math.max(0.25, signs.y * (delta.x * heightAxis.x + delta.y * heightAxis.y));
  if (original.lockAspectRatio) {
    const aspectRatio = original.width / original.height;
    const widthChange = Math.abs(width - original.width) / original.width;
    const heightChange = Math.abs(height - original.height) / original.height;
    if (widthChange >= heightChange) height = width / aspectRatio;
    else width = height * aspectRatio;
  }
  const center = {
    x: anchor.x + signs.x * widthAxis.x * width / 2 + signs.y * heightAxis.x * height / 2,
    y: anchor.y + signs.x * widthAxis.y * width / 2 + signs.y * heightAxis.y * height / 2,
  };
  return { ...original, x: center.x - width / 2, y: center.y - height / 2, width, height };
};
export const loadImageDimensions = (imagePath: string) => new Promise<{ width: number; height: number }>((resolve, reject) => {
  const image = new window.Image();
  image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
  image.onerror = () => reject(new Error("The selected tracing template could not be loaded."));
  image.src = imagePath;
});
export const facingRotation = (facing: NonNullable<TacticalEnemyPlacement["facing"]> | TacticalTerrainPlacement["rotation"]) => typeof facing === "number" ? facing : ({ north: 0, east: 90, south: 180, west: 270 } as const)[facing];
export const facingVector = (facing: NonNullable<TacticalEnemyPlacement["facing"]> | TacticalTerrainPlacement["rotation"]) => {
  const radians = facingRotation(facing) * Math.PI / 180;
  return { x: Math.sin(radians), y: -Math.cos(radians) };
};
export const facingName = (facing: NonNullable<TacticalEnemyPlacement["facing"]> | TacticalTerrainPlacement["rotation"]) => ["North", "East", "South", "West"][facingRotation(facing) / 90] ?? "North";
export type EditorPanDrag = {
  pointerId: number;
  start: { x: number; y: number };
  camera: TacticalEditorCamera;
  viewport: { width: number; height: number };
};
export const areaTargetForTool = (tool: string | null): RaisedAreaDraft["target"] | null => {
  return tool === PEN_AREA_TOOL_ID ? "area" : null;
};
export const isAreaTool = (tool: string | null) => areaTargetForTool(tool) !== null;
export const naturalTerrainKindForTool = (tool: string | null): TacticalNaturalTerrainPlacement["kind"] | null =>
  tool === TREE_TOOL_ID ? "tree" : tool === BUSH_TOOL_ID ? "bush" : tool === ROCK_TOOL_ID ? "rock" : null;
export const defaultNaturalTerrainRadius = (kind: TacticalNaturalTerrainPlacement["kind"]) => kind === "tree" ? 1.5 : 0.5;
export const naturalTerrainLabel = (kind: TacticalNaturalTerrainPlacement["kind"]) =>
  kind === "tree" ? "Tree" : kind === "bush" ? "Bush" : "Rock";
export const naturalTerrainEditorColor = (kind: TacticalNaturalTerrainPlacement["kind"]) =>
  kind === "tree"
    ? { footprint: "#92400e", fill: "#166534", stroke: "#4ade80", marker: "T" }
    : kind === "bush"
      ? { footprint: "#65a30d", fill: "#4d7c0f", stroke: "#a3e635", marker: "B" }
      : { footprint: "#78716c", fill: "#57534e", stroke: "#d6d3d1", marker: "R" };
export const sameGridPoint = (first: { x: number; y: number }, second: { x: number; y: number }) => first.x === second.x && first.y === second.y;
export const penAreaSegment = (
  from: { x: number; y: number },
  to: { x: number; y: number },
  outgoingControl: { x: number; y: number } | null,
  incomingControl: { x: number; y: number } | null,
): TacticalRaisedAreaOutlineSegment => outgoingControl || incomingControl ? {
  kind: "cubic",
  from: gridPoint(from),
  control1: gridPoint(outgoingControl ?? from),
  control2: gridPoint(incomingControl ?? to),
  to: gridPoint(to),
} : { kind: "line", from: gridPoint(from), to: gridPoint(to) };
export const lerpPoint = (from: { x: number; y: number }, to: { x: number; y: number }, progress: number) => ({
  x: from.x + (to.x - from.x) * progress,
  y: from.y + (to.y - from.y) * progress,
});
export const areaSegmentPoint = (segment: TacticalRaisedAreaOutlineSegment, progress: number) => {
  if (segment.kind === "line") return lerpPoint(segment.from, segment.to, progress);
  if (segment.kind === "quadratic") {
    return lerpPoint(
      lerpPoint(segment.from, segment.control, progress),
      lerpPoint(segment.control, segment.to, progress),
      progress,
    );
  }
  const first = lerpPoint(segment.from, segment.control1, progress);
  const second = lerpPoint(segment.control1, segment.control2, progress);
  const third = lerpPoint(segment.control2, segment.to, progress);
  return lerpPoint(lerpPoint(first, second, progress), lerpPoint(second, third, progress), progress);
};
export const closestAreaSegmentProgress = (segment: TacticalRaisedAreaOutlineSegment, point: { x: number; y: number }) => {
  if (segment.kind === "line") {
    const dx = segment.to.x - segment.from.x;
    const dy = segment.to.y - segment.from.y;
    const lengthSquared = dx * dx + dy * dy;
    return lengthSquared === 0 ? 0.5 : Math.max(0.02, Math.min(0.98,
      ((point.x - segment.from.x) * dx + (point.y - segment.from.y) * dy) / lengthSquared));
  }
  let closest = 0.5;
  let distance = Number.POSITIVE_INFINITY;
  for (let index = 1; index < 100; index += 1) {
    const progress = index / 100;
    const candidate = areaSegmentPoint(segment, progress);
    const candidateDistance = Math.hypot(candidate.x - point.x, candidate.y - point.y);
    if (candidateDistance < distance) {
      closest = progress;
      distance = candidateDistance;
    }
  }
  return closest;
};
export const splitAreaSegment = (segment: TacticalRaisedAreaOutlineSegment, point: { x: number; y: number }): [TacticalRaisedAreaOutlineSegment, TacticalRaisedAreaOutlineSegment] => {
  const progress = closestAreaSegmentProgress(segment, point);
  if (segment.kind === "line") {
    const split = gridPoint(areaSegmentPoint(segment, progress));
    return [
      { kind: "line", from: { ...segment.from }, to: split },
      { kind: "line", from: split, to: { ...segment.to } },
    ];
  }
  if (segment.kind === "quadratic") {
    const firstControl = lerpPoint(segment.from, segment.control, progress);
    const secondControl = lerpPoint(segment.control, segment.to, progress);
    const split = lerpPoint(firstControl, secondControl, progress);
    return [
      { kind: "quadratic", from: { ...segment.from }, control: firstControl, to: split },
      { kind: "quadratic", from: split, control: secondControl, to: { ...segment.to } },
    ];
  }
  const first = lerpPoint(segment.from, segment.control1, progress);
  const second = lerpPoint(segment.control1, segment.control2, progress);
  const third = lerpPoint(segment.control2, segment.to, progress);
  const firstMiddle = lerpPoint(first, second, progress);
  const secondMiddle = lerpPoint(second, third, progress);
  const split = lerpPoint(firstMiddle, secondMiddle, progress);
  return [
    { kind: "cubic", from: { ...segment.from }, control1: first, control2: firstMiddle, to: split },
    { kind: "cubic", from: split, control1: secondMiddle, control2: third, to: { ...segment.to } },
  ];
};
export const mergeAreaSegmentsAcrossAnchor = (
  previous: TacticalRaisedAreaOutlineSegment,
  next: TacticalRaisedAreaOutlineSegment,
): TacticalRaisedAreaOutlineSegment => {
  if (previous.kind === "line" && next.kind === "line") {
    return { kind: "line", from: { ...previous.from }, to: { ...next.to } };
  }
  const control1 = previous.kind === "cubic"
    ? previous.control1
    : previous.kind === "quadratic"
      ? lerpPoint(previous.from, previous.control, 2 / 3)
      : previous.from;
  const control2 = next.kind === "cubic"
    ? next.control2
    : next.kind === "quadratic"
      ? lerpPoint(next.to, next.control, 2 / 3)
      : next.to;
  return {
    kind: "cubic",
    from: { ...previous.from },
    control1: { ...control1 },
    control2: { ...control2 },
    to: { ...next.to },
  };
};
export const areaSegmentSvgPath = (segment: TacticalRaisedAreaOutlineSegment) => segment.kind === "quadratic"
  ? `M ${segment.from.x} ${segment.from.y} Q ${segment.control.x} ${segment.control.y} ${segment.to.x} ${segment.to.y}`
  : segment.kind === "cubic"
    ? `M ${segment.from.x} ${segment.from.y} C ${segment.control1.x} ${segment.control1.y} ${segment.control2.x} ${segment.control2.y} ${segment.to.x} ${segment.to.y}`
    : `M ${segment.from.x} ${segment.from.y} L ${segment.to.x} ${segment.to.y}`;
export const tacticalEditorMarkerInteractionEnabled = (
  placementKind: string | null,
  enemyKind: TacticalEnemyType | null,
) => placementKind === null && enemyKind === null;
export const placementRotations = (terrainDefinitionId: string): TacticalTerrainPlacement["rotation"][] =>
  terrainDefinitionId.startsWith("bridge-") ? [0, 90, 180, 270] : [0];
export const rotatePreviewCell = (point: { x: number; y: number }, size: { width: number; height: number }, rotation: TacticalTerrainPlacement["rotation"]) => {
  if (rotation === 90) return { x: size.height - 1 - point.y, y: point.x };
  if (rotation === 180) return { x: size.width - 1 - point.x, y: size.height - 1 - point.y };
  if (rotation === 270) return { x: point.y, y: size.width - 1 - point.x };
  return point;
};
export const placementCandidates = (terrainDefinitionId: string, anchor: EditorMapPoint) => {
  const paletteItem = tacticalTerrainPalette.find((item) => item.id === terrainDefinitionId);
  if (!paletteItem) return [];
  const candidates = placementRotations(terrainDefinitionId).flatMap((rotation) => {
    const cells = paletteItem.previewCells.map((cell) => rotatePreviewCell(cell, paletteItem.size, rotation));
    const anchors = terrainDefinitionId.startsWith("bridge-") ? cells : [{ x: 0, y: 0 }];
    return anchors.map((cell) => ({ rotation, cells, origin: { x: anchor.x - cell.x, y: anchor.y - cell.y } }));
  });
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.origin.x}:${candidate.origin.y}:${candidate.rotation}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const tacticalEditorPortalPlacementCandidate = (
  definition: TacticalScenarioDefinitionFile,
  point: { x: number; y: number },
  kind: TacticalWallPortalKind,
) => {
  const candidates = [
    tacticalWallPortalPlacementCandidate(definition.drawnWalls ?? [], point, kind),
    tacticalCirclePortalPlacementCandidate(definition.drawnTerrainPrimitives ?? [], point, kind),
    tacticalAreaBoundaryPortalPlacementCandidate(definition.drawnAreas ?? [], point, kind),
  ].filter((candidate) => candidate !== null);
  return candidates.sort((first, second) =>
    first.distanceFromWall - second.distanceFromWall)[0] ?? null;
};
