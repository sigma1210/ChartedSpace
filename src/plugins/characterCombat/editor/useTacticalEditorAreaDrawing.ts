import {
  resolveTacticalScenarioTerrain,
  tacticalClosedAreaGeometrySegments,
  type TacticalClosedAreaGeometry,
  type TacticalRaisedAreaOutlineSegment,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { RaisedAreaDraft } from "@/plugins/characterCombat/editor/tacticalEditorInteractionState";
import {
  PEN_AREA_TOOL_ID,
  gridPoint,
  penAreaSegment,
  sameGridPoint,
} from "@/plugins/characterCombat/editor/tacticalEditorSupport";

type DraftUpdate = TacticalScenarioDefinitionFile
  | ((current: TacticalScenarioDefinitionFile) => TacticalScenarioDefinitionFile);
type AreaDraftUpdate = RaisedAreaDraft | null
  | ((current: RaisedAreaDraft | null) => RaisedAreaDraft | null);

type UseTacticalEditorAreaDrawingOptions = {
  draft: TacticalScenarioDefinitionFile;
  setDraft: (update: DraftUpdate) => void;
  activeDrawingTool: string | null;
  areaDraft: RaisedAreaDraft | null;
  setAreaDraft: (update: AreaDraftUpdate) => void;
  setSelectedAreaId: (id: string | null) => void;
  setSelectedTerrainRegionId: (id: string | null) => void;
  clearDrawingTool: () => void;
  clearSelections: () => void;
  clearRaisedAreaControlDrag: () => void;
  showAreaProperties: () => void;
  setPlacementError: (error: string | null) => void;
};

export const useTacticalEditorAreaDrawing = ({
  draft,
  setDraft,
  activeDrawingTool,
  areaDraft,
  setAreaDraft,
  setSelectedAreaId,
  setSelectedTerrainRegionId,
  clearDrawingTool,
  clearSelections,
  clearRaisedAreaControlDrag,
  showAreaProperties,
  setPlacementError,
}: UseTacticalEditorAreaDrawingOptions) => {
  const nextAreaId = (prefix: "rectangle-area" | "circle-area" | "drawn-area") => {
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
    let id = `${prefix}-${suffix}`;
    while (usedIds.has(id)) {
      suffix += 1;
      id = `${prefix}-${suffix}`;
    }
    return id;
  };

  const commitArea = (
    id: string,
    geometry: TacticalClosedAreaGeometry,
    fallbackMessage: string,
  ) => {
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
      setSelectedAreaId(id);
      setSelectedTerrainRegionId(null);
      showAreaProperties();
      clearDrawingTool();
      setPlacementError(null);
      return true;
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : fallbackMessage);
      return false;
    }
  };

  const createRectangleArea = (
    from: { x: number; y: number },
    to: { x: number; y: number },
  ) => {
    const left = Math.min(from.x, to.x);
    const right = Math.max(from.x, to.x);
    const top = Math.min(from.y, to.y);
    const bottom = Math.max(from.y, to.y);
    if (right - left < 0.25 || bottom - top < 0.25) {
      setPlacementError("Drag a rectangle with both width and height.");
      return false;
    }
    return commitArea(nextAreaId("rectangle-area"), {
      kind: "rectangle",
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    }, "That rectangle is not valid.");
  };

  const createCircleArea = (
    center: { x: number; y: number },
    radius: number,
  ) => {
    if (radius <= 0) {
      setPlacementError("A circle must have a positive radius.");
      return false;
    }
    return commitArea(nextAreaId("circle-area"), {
      kind: "circle",
      center: gridPoint(center),
      radius,
    }, "That circle area is not valid.");
  };

  const finishPenArea = (segments: TacticalRaisedAreaOutlineSegment[]) => {
    if (segments.length < 3) {
      setPlacementError("A Pen area needs at least three boundary segments.");
      return false;
    }
    const id = nextAreaId("drawn-area");
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
      setAreaDraft(null);
      clearRaisedAreaControlDrag();
      setSelectedAreaId(id);
      setSelectedTerrainRegionId(null);
      showAreaProperties();
      clearDrawingTool();
      setPlacementError(null);
      return true;
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That Pen outline is not valid.");
      return false;
    }
  };

  const closePenArea = () => {
    if (!areaDraft || sameGridPoint(areaDraft.current, areaDraft.start)) return false;
    return finishPenArea([
      ...areaDraft.segments,
      penAreaSegment(areaDraft.current, areaDraft.start, areaDraft.outgoingControl, null),
    ]);
  };

  const commitPenNode = (
    anchor: { x: number; y: number },
    handle: { x: number; y: number },
  ) => {
    if (activeDrawingTool !== PEN_AREA_TOOL_ID) return;
    const dragged = Math.hypot(handle.x - anchor.x, handle.y - anchor.y) >= 0.1;
    const outgoingControl = dragged ? gridPoint(handle) : null;
    const incomingControl = dragged ? {
      x: anchor.x * 2 - handle.x,
      y: anchor.y * 2 - handle.y,
    } : null;
    if (!areaDraft) {
      const snapped = gridPoint(anchor);
      clearRaisedAreaControlDrag();
      setAreaDraft({
        target: "area",
        start: snapped,
        current: snapped,
        hover: snapped,
        segments: [],
        outgoingControl,
      });
      clearSelections();
      setPlacementError(null);
      return;
    }
    if (sameGridPoint(anchor, areaDraft.current)) return;
    const segment = penAreaSegment(
      areaDraft.current,
      anchor,
      areaDraft.outgoingControl,
      incomingControl,
    );
    const segments = [...areaDraft.segments, segment];
    if (sameGridPoint(anchor, areaDraft.start)) {
      finishPenArea(segments);
      return;
    }
    setAreaDraft({
      ...areaDraft,
      current: gridPoint(anchor),
      hover: gridPoint(anchor),
      segments,
      outgoingControl,
    });
    setPlacementError(null);
  };

  const hoverRaisedArea = (point: { x: number; y: number }) => {
    setAreaDraft((current) => current ? { ...current, hover: gridPoint(point) } : null);
  };

  const undoPenAreaNode = () => {
    setAreaDraft((current) => {
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
    setAreaDraft(null);
    clearRaisedAreaControlDrag();
    setPlacementError(null);
  };

  return {
    createRectangleArea,
    createCircleArea,
    finishPenArea,
    closePenArea,
    commitPenNode,
    hoverRaisedArea,
    undoPenAreaNode,
    cancelPenArea,
  };
};
