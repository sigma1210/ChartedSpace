/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
  type TacticalRaisedAreaOutlineSegment,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type {
  RaisedAreaControlDrag,
  RaisedAreaDraft,
} from "../tacticalEditorInteractionState";
import { useTacticalEditorAreaCurveControls } from "../useTacticalEditorAreaCurveControls";

const curvedSegments = (): TacticalRaisedAreaOutlineSegment[] => [
  {
    kind: "quadratic",
    from: { x: 10, y: 10 },
    control: { x: 12, y: 8 },
    to: { x: 14, y: 10 },
  },
  { kind: "line", from: { x: 14, y: 10 }, to: { x: 14, y: 14 } },
  { kind: "line", from: { x: 14, y: 14 }, to: { x: 10, y: 14 } },
  { kind: "line", from: { x: 10, y: 14 }, to: { x: 10, y: 10 } },
];

const emptyDraft = (): TacticalScenarioDefinitionFile => ({
  ...cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition),
  terrainPlacements: [],
  drawnWalls: [],
  drawnAreas: [],
  drawnRaisedAreas: [],
  drawnTerrainRegions: [],
  drawnTerrainPrimitives: [],
  naturalTerrainPlacements: [],
  elevationTransitions: [],
  fireCells: [],
  enemyPlacements: [],
});

const penDraft = (): RaisedAreaDraft => ({
  target: "area",
  start: { x: 10, y: 10 },
  current: { x: 10, y: 10 },
  hover: { x: 10, y: 10 },
  segments: curvedSegments(),
  outgoingControl: null,
});

const renderCurveControls = ({
  initialDraft,
  initialAreaDraft = null,
}: {
  initialDraft: TacticalScenarioDefinitionFile;
  initialAreaDraft?: RaisedAreaDraft | null;
}) => {
  const clearAreaAnchorDrag = jest.fn();
  const clearAreaCubicControlDrag = jest.fn();
  const clearConstrainedAreaDrag = jest.fn();
  const hook = renderHook(() => {
    const [draft, setDraft] = useState(initialDraft);
    const [areaDraft, setAreaDraft] = useState<RaisedAreaDraft | null>(initialAreaDraft);
    const [drag, setDrag] = useState<RaisedAreaControlDrag | null>(null);
    const [placementError, setPlacementError] = useState<string | null>(null);
    return {
      ...useTacticalEditorAreaCurveControls({
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
      }),
      draft,
      areaDraft,
      drag,
      placementError,
    };
  });
  return {
    ...hook,
    clearAreaAnchorDrag,
    clearAreaCubicControlDrag,
    clearConstrainedAreaDrag,
  };
};

type OwnerKind = "area" | "raised" | "terrain-region" | "draft";

const fixtureFor = (kind: OwnerKind) => {
  const draft = emptyDraft();
  if (kind === "area") {
    draft.drawnAreas = [{
      id: "owner-1",
      segments: curvedSegments(),
      surface: "grass",
      elevation: 0,
      boundary: "none",
    }];
  } else if (kind === "raised") {
    draft.drawnRaisedAreas = [{ id: "owner-1", segments: curvedSegments() }];
  } else if (kind === "terrain-region") {
    draft.drawnTerrainRegions = [{ id: "owner-1", kind: "grass", segments: curvedSegments() }];
  }
  return {
    draft,
    areaDraft: kind === "draft" ? penDraft() : null,
    owner: kind === "draft" ? { kind: "draft" as const } : { kind, id: "owner-1" } as Exclude<RaisedAreaControlDrag["owner"], { kind: "draft" }>,
  };
};

const controlFor = (
  kind: OwnerKind,
  draft: TacticalScenarioDefinitionFile,
  areaDraft: RaisedAreaDraft | null,
) => {
  const segment = kind === "area"
    ? draft.drawnAreas?.[0]?.segments[0]
    : kind === "raised"
      ? draft.drawnRaisedAreas?.[0]?.segments[0]
      : kind === "terrain-region"
        ? draft.drawnTerrainRegions?.[0]?.segments[0]
        : areaDraft?.segments[0];
  return segment?.kind === "quadratic" ? segment.control : null;
};

describe("useTacticalEditorAreaCurveControls", () => {
  it.each(["area", "raised", "terrain-region", "draft"] as const)(
    "moves and restores a %s quadratic control",
    (kind) => {
      const fixture = fixtureFor(kind);
      const {
        result,
        clearAreaAnchorDrag,
        clearAreaCubicControlDrag,
        clearConstrainedAreaDrag,
      } = renderCurveControls({
        initialDraft: fixture.draft,
        initialAreaDraft: fixture.areaDraft,
      });

      act(() => result.current.beginRaisedAreaControlDrag(fixture.owner, 0));
      act(() => result.current.reshapeRaisedAreaControl({ x: 12, y: 6 }));
      expect(controlFor(kind, result.current.draft, result.current.areaDraft)).toEqual({ x: 12, y: 6 });

      act(() => result.current.cancelRaisedAreaControlDrag());
      expect(controlFor(kind, result.current.draft, result.current.areaDraft)).toEqual({ x: 12, y: 8 });
      expect(result.current.drag).toBeNull();
      expect(clearAreaAnchorDrag).toHaveBeenCalledTimes(1);
      expect(clearAreaCubicControlDrag).toHaveBeenCalledTimes(1);
      expect(clearConstrainedAreaDrag).toHaveBeenCalledTimes(1);
    },
  );

  it("finishes a control drag without restoring the edited position", () => {
    const fixture = fixtureFor("area");
    const { result } = renderCurveControls({ initialDraft: fixture.draft });

    act(() => result.current.beginRaisedAreaControlDrag(fixture.owner, 0));
    act(() => result.current.reshapeRaisedAreaControl({ x: 11, y: 7 }));
    act(() => result.current.finishRaisedAreaControlDrag());

    expect(controlFor("area", result.current.draft, null)).toEqual({ x: 11, y: 7 });
    expect(result.current.drag).toBeNull();
  });
});
