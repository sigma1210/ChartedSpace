import {
  resolveTacticalScenarioTerrain,
  type TacticalRaisedAreaOutlineSegment,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type {
  RaisedAreaControlDrag,
  RaisedAreaDraft,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorInteractionState";

type DraftUpdate = TacticalScenarioDefinitionFile
  | ((current: TacticalScenarioDefinitionFile) => TacticalScenarioDefinitionFile);
type AreaDraftUpdate = RaisedAreaDraft | null
  | ((current: RaisedAreaDraft | null) => RaisedAreaDraft | null);

type UseTacticalEditorAreaCurveControlsOptions = {
  draft: TacticalScenarioDefinitionFile;
  setDraft: (update: DraftUpdate) => void;
  areaDraft: RaisedAreaDraft | null;
  setAreaDraft: (update: AreaDraftUpdate) => void;
  drag: RaisedAreaControlDrag | null;
  setDrag: (drag: RaisedAreaControlDrag | null) => void;
  clearAreaAnchorDrag: () => void;
  clearAreaCubicControlDrag: () => void;
  clearConstrainedAreaDrag: () => void;
  setPlacementError: (error: string | null) => void;
};

const replaceQuadraticControl = (
  segments: TacticalRaisedAreaOutlineSegment[],
  segmentIndex: number,
  control: { x: number; y: number },
) => segments.map((segment, index) => (
  index === segmentIndex && segment.kind === "quadratic"
    ? { ...segment, control: { ...control } }
    : segment
));

export const useTacticalEditorAreaCurveControls = ({
  draft,
  setDraft,
  areaDraft,
  setAreaDraft,
  drag,
  setDrag,
  clearAreaAnchorDrag,
  clearAreaCubicControlDrag,
  clearConstrainedAreaDrag,
  setPlacementError,
}: UseTacticalEditorAreaCurveControlsOptions) => {
  const beginRaisedAreaControlDrag = (
    owner: RaisedAreaControlDrag["owner"],
    segmentIndex: number,
  ) => {
    if (owner.kind === "area" && (draft.drawnAreas ?? [])
      .find((area) => area.id === owner.id)?.geometry) return;
    const segment = owner.kind === "area"
      ? (draft.drawnAreas ?? []).find((area) => area.id === owner.id)?.segments[segmentIndex]
      : owner.kind === "raised"
        ? (draft.drawnRaisedAreas ?? []).find((area) => area.id === owner.id)?.segments[segmentIndex]
        : owner.kind === "terrain-region"
          ? (draft.drawnTerrainRegions ?? []).find((region) => region.id === owner.id)?.segments[segmentIndex]
          : areaDraft?.segments[segmentIndex];
    if (segment?.kind !== "quadratic") return;
    setDrag({ owner, segmentIndex, original: { ...segment.control } });
    setPlacementError(null);
  };

  const reshapeRaisedAreaControl = (point: { x: number; y: number }) => {
    if (!drag) return;
    const control = {
      x: Math.max(0, Math.min(draft.map.width, point.x)),
      y: Math.max(0, Math.min(draft.map.height, point.y)),
    };
    if (drag.owner.kind === "draft") {
      setAreaDraft((current) => current ? {
        ...current,
        segments: replaceQuadraticControl(current.segments, drag.segmentIndex, control),
      } : null);
      setPlacementError(null);
      return;
    }

    const ownerId = drag.owner.id;
    const segmentIndex = drag.segmentIndex;
    const candidate: TacticalScenarioDefinitionFile = drag.owner.kind === "area"
      ? {
        ...draft,
        drawnAreas: (draft.drawnAreas ?? []).map((area) => area.id === ownerId
          ? { ...area, segments: replaceQuadraticControl(area.segments, segmentIndex, control) }
          : area),
      }
      : drag.owner.kind === "raised"
        ? {
          ...draft,
          drawnRaisedAreas: (draft.drawnRaisedAreas ?? []).map((area) => area.id === ownerId
            ? { ...area, segments: replaceQuadraticControl(area.segments, segmentIndex, control) }
            : area),
        }
        : {
          ...draft,
          drawnTerrainRegions: (draft.drawnTerrainRegions ?? []).map((region) => region.id === ownerId
            ? { ...region, segments: replaceQuadraticControl(region.segments, segmentIndex, control) }
            : region),
        };
    const fallbackMessage = drag.owner.kind === "area"
      ? "That area curve position is not valid."
      : drag.owner.kind === "raised"
        ? "That raised-area curve position is not valid."
        : "That terrain-region curve position is not valid.";
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : fallbackMessage);
    }
  };

  const finishRaisedAreaControlDrag = () => setDrag(null);

  const cancelRaisedAreaControlDrag = () => {
    if (!drag) return;
    const { owner, segmentIndex, original } = drag;
    if (owner.kind === "draft") {
      setAreaDraft((current) => current ? {
        ...current,
        segments: replaceQuadraticControl(current.segments, segmentIndex, original),
      } : null);
    } else {
      const ownerId = owner.id;
      setDraft((current) => owner.kind === "area"
        ? {
          ...current,
          drawnAreas: (current.drawnAreas ?? []).map((area) => area.id === ownerId
            ? { ...area, segments: replaceQuadraticControl(area.segments, segmentIndex, original) }
            : area),
        }
        : owner.kind === "raised"
          ? {
            ...current,
            drawnRaisedAreas: (current.drawnRaisedAreas ?? []).map((area) => area.id === ownerId
              ? { ...area, segments: replaceQuadraticControl(area.segments, segmentIndex, original) }
              : area),
          }
          : {
            ...current,
            drawnTerrainRegions: (current.drawnTerrainRegions ?? []).map((region) => region.id === ownerId
              ? { ...region, segments: replaceQuadraticControl(region.segments, segmentIndex, original) }
              : region),
          });
    }
    setDrag(null);
    clearAreaAnchorDrag();
    clearAreaCubicControlDrag();
    clearConstrainedAreaDrag();
    setPlacementError(null);
  };

  return {
    beginRaisedAreaControlDrag,
    reshapeRaisedAreaControl,
    finishRaisedAreaControlDrag,
    cancelRaisedAreaControlDrag,
  };
};
