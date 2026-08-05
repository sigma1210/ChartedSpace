import {
  resolveTacticalScenarioTerrain,
  tacticalClosedAreaGeometrySegments,
  type TacticalClosedAreaGeometry,
  type TacticalRaisedAreaOutlineSegment,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type {
  AreaAnchorDrag,
  AreaCubicControlDrag,
  ConstrainedAreaDrag,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorInteractionState";
import {
  mergeAreaSegmentsAcrossAnchor,
  splitAreaSegment,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";
import { removeDrawnRaisedAreaCandidate } from "@/plugins/characterCombat/editor/lib/tacticalEditorDocument";

type DraftUpdate = TacticalScenarioDefinitionFile
  | ((current: TacticalScenarioDefinitionFile) => TacticalScenarioDefinitionFile);

type UseTacticalEditorAreasOptions = {
  draft: TacticalScenarioDefinitionFile;
  setDraft: (update: DraftUpdate) => void;
  selectedAreaId: string | null;
  selectedTerrainRegionId: string | null;
  selectedAreaAnchor: { areaId: string; anchorIndex: number } | null;
  dragAreaAnchor: AreaAnchorDrag | null;
  dragAreaCubicControl: AreaCubicControlDrag | null;
  dragConstrainedArea: ConstrainedAreaDrag | null;
  setSelectedAreaId: (id: string | null) => void;
  setSelectedTerrainRegionId: (id: string | null) => void;
  setSelectedAreaAnchor: (anchor: { areaId: string; anchorIndex: number } | null) => void;
  setDragAreaAnchor: (drag: AreaAnchorDrag | null) => void;
  setDragAreaCubicControl: (drag: AreaCubicControlDrag | null) => void;
  setDragConstrainedArea: (drag: ConstrainedAreaDrag | null) => void;
  clearRaisedAreaControlDrag: () => void;
  setPlacementError: (error: string | null) => void;
};

const cloneAreaSegments = (segments: TacticalRaisedAreaOutlineSegment[]) => segments.map((segment) => ({
  ...segment,
  from: { ...segment.from },
  to: { ...segment.to },
  ...(segment.kind === "quadratic" ? { control: { ...segment.control } } : {}),
  ...(segment.kind === "cubic" ? { control1: { ...segment.control1 }, control2: { ...segment.control2 } } : {}),
}));

export const useTacticalEditorAreas = ({
  draft,
  setDraft,
  selectedAreaId,
  selectedTerrainRegionId,
  selectedAreaAnchor,
  dragAreaAnchor,
  dragAreaCubicControl,
  dragConstrainedArea,
  setSelectedAreaId,
  setSelectedTerrainRegionId,
  setSelectedAreaAnchor,
  setDragAreaAnchor,
  setDragAreaCubicControl,
  setDragConstrainedArea,
  clearRaisedAreaControlDrag,
  setPlacementError,
}: UseTacticalEditorAreasOptions) => {
  const selectedArea = (draft.drawnAreas ?? [])
    .find((area) => area.id === selectedAreaId) ?? null;
  const selectedLegacyRaisedArea = (draft.drawnRaisedAreas ?? [])
    .find((area) => area.id === selectedAreaId) ?? null;
  const selectedTerrainRegion = (draft.drawnTerrainRegions ?? [])
    .find((region) => region.id === (selectedTerrainRegionId ?? selectedAreaId)) ?? null;

  const applyCompletedAreaSegments = (
    areaId: string,
    segments: TacticalRaisedAreaOutlineSegment[],
    fallbackMessage: string,
  ) => {
    if ((draft.drawnAreas ?? []).find((area) => area.id === areaId)?.geometry) return false;
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
      return true;
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : fallbackMessage);
      return false;
    }
  };

  const insertCompletedAreaAnchor = (
    areaId: string,
    segmentIndex: number,
    point: { x: number; y: number },
  ) => {
    const area = (draft.drawnAreas ?? []).find((candidate) => candidate.id === areaId);
    const segment = area?.segments[segmentIndex];
    if (!area || area.geometry || !segment) return;
    const segments = [
      ...area.segments.slice(0, segmentIndex),
      ...splitAreaSegment(segment, point),
      ...area.segments.slice(segmentIndex + 1),
    ];
    if (applyCompletedAreaSegments(areaId, segments, "That new area point is not valid.")) {
      setSelectedAreaAnchor({ areaId, anchorIndex: segmentIndex + 1 });
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
    if (applyCompletedAreaSegments(area.id, segments, "That area point cannot be deleted.")) {
      setSelectedAreaAnchor(null);
    }
    return true;
  };

  const beginAreaAnchorDrag = (id: string, anchorIndex: number) => {
    const area = (draft.drawnAreas ?? []).find((candidate) => candidate.id === id);
    if (!area || area.geometry || anchorIndex < 0 || anchorIndex >= area.segments.length) return;
    setDragAreaAnchor({ id, anchorIndex, originalSegments: cloneAreaSegments(area.segments) });
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
        ? { ...area, segments: cloneAreaSegments(dragAreaAnchor.originalSegments) }
        : area),
    }));
    setDragAreaAnchor(null);
    setPlacementError(null);
  };

  const beginAreaCubicControlDrag = (
    id: string,
    segmentIndex: number,
    control: AreaCubicControlDrag["control"],
  ) => {
    const area = (draft.drawnAreas ?? []).find((candidate) => candidate.id === id);
    const segment = area?.segments[segmentIndex];
    if (area?.geometry || segment?.kind !== "cubic") return;
    setDragAreaCubicControl({ id, segmentIndex, control, original: { ...segment[control] } });
    setPlacementError(null);
  };

  const moveAreaCubicControl = (point: { x: number; y: number }) => {
    if (!dragAreaCubicControl) return;
    const control = {
      x: Math.max(0, Math.min(draft.map.width, point.x)),
      y: Math.max(0, Math.min(draft.map.height, point.y)),
    };
    const segments = cloneAreaSegments(
      (draft.drawnAreas ?? []).find((area) => area.id === dragAreaCubicControl.id)?.segments ?? [],
    ).map((segment, index): TacticalRaisedAreaOutlineSegment => (
      index === dragAreaCubicControl.segmentIndex && segment.kind === "cubic"
        ? { ...segment, [dragAreaCubicControl.control]: control }
        : segment
    ));
    applyCompletedAreaSegments(
      dragAreaCubicControl.id,
      segments,
      "That area curve position is not valid.",
    );
  };

  const cancelAreaCubicControlDrag = () => {
    if (!dragAreaCubicControl) return;
    const { id, segmentIndex, control, original } = dragAreaCubicControl;
    setDraft((current) => ({
      ...current,
      drawnAreas: (current.drawnAreas ?? []).map((area) => area.id === id
        ? {
          ...area,
          segments: area.segments.map((segment, index) => (
            index === segmentIndex && segment.kind === "cubic"
              ? { ...segment, [control]: { ...original } }
              : segment
          )),
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

  const applyConstrainedAreaGeometry = (
    id: string,
    geometry: TacticalClosedAreaGeometry,
    fallbackMessage: string,
  ) => {
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
      return true;
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : fallbackMessage);
      return false;
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
        : {
          ...original,
          radius: Math.hypot(bounded.x - original.center.x, bounded.y - original.center.y),
        };
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

  const updateSelectedArea = (
    updates: Partial<NonNullable<TacticalScenarioDefinitionFile["drawnAreas"]>[number]>,
  ) => {
    if (!selectedArea) return;
    const normalizedUpdates = updates.boundary === "none"
      ? { ...updates, portals: undefined }
      : updates;
    const candidate = {
      ...draft,
      drawnAreas: (draft.drawnAreas ?? []).map((area) => area.id === selectedArea.id
        ? { ...area, ...normalizedUpdates }
        : area),
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
    setDraft((current) => ({
      ...current,
      drawnAreas: (current.drawnAreas ?? []).filter((area) => area.id !== selectedArea.id),
    }));
    setSelectedAreaId(null);
    setPlacementError(null);
  };

  const deleteSelectedLegacyRaisedArea = () => {
    if (!selectedLegacyRaisedArea) return false;
    try {
      const candidate = removeDrawnRaisedAreaCandidate(draft, selectedLegacyRaisedArea.id);
      setDraft(candidate.definition);
      setSelectedAreaId(null);
      clearRaisedAreaControlDrag();
      setPlacementError(candidate.removedTransitionIds.length > 0
        ? `Deleted the raised area and ${candidate.removedTransitionIds.length} attached elevation ${candidate.removedTransitionIds.length === 1 ? "transition" : "transitions"}.`
        : null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That raised area cannot be deleted.");
    }
    return true;
  };

  const deleteSelectedTerrainRegion = () => {
    if (!selectedTerrainRegion) return;
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      drawnTerrainRegions: (draft.drawnTerrainRegions ?? [])
        .filter((region) => region.id !== selectedTerrainRegion.id),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setSelectedTerrainRegionId(null);
      setSelectedAreaId(null);
      clearRaisedAreaControlDrag();
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That terrain region cannot be deleted.");
    }
  };

  const updateSelectedTerrainRegionFilled = (filled: boolean) => {
    if (selectedTerrainRegion?.kind !== "liquid-hydrogen") return;
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      drawnTerrainRegions: (draft.drawnTerrainRegions ?? []).map((region) => (
        region.id === selectedTerrainRegion.id && region.kind === "liquid-hydrogen"
          ? { ...region, settings: { ...region.settings, filled } }
          : region
      )),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error
        ? error.message
        : "That liquid-hydrogen setting is not valid.");
    }
  };

  return {
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
  };
};
