/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { EditorMapPoint, RampDraft } from "../tacticalEditorInteractionState";
import { tacticalEditorLayerKey } from "../tacticalEditorLayers";
import { LADDER_TOOL_ID, RAMP_TOOL_ID, STAIRS_TOOL_ID } from "../tacticalEditorSupport";
import { useTacticalEditorElevationTransitions } from "../useTacticalEditorElevationTransitions";

const raisedAreaDefinition = (): TacticalScenarioDefinitionFile => {
  const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
  definition.terrainPlacements = [];
  definition.drawnRaisedAreas = [{
    id: "transition-platform",
    segments: [
      { kind: "line", from: { x: 10, y: 10 }, to: { x: 13, y: 10 } },
      { kind: "line", from: { x: 13, y: 10 }, to: { x: 13, y: 13 } },
      { kind: "line", from: { x: 13, y: 13 }, to: { x: 10, y: 13 } },
      { kind: "line", from: { x: 10, y: 13 }, to: { x: 10, y: 10 } },
    ],
  }];
  definition.elevationTransitions = [];
  return definition;
};

const renderTransitions = ({
  initialDraft = raisedAreaDefinition(),
  activeDrawingTool = null,
  initialSelectedId = null,
  lockedLayerKeys = new Set<string>(),
}: {
  initialDraft?: TacticalScenarioDefinitionFile;
  activeDrawingTool?: string | null;
  initialSelectedId?: string | null;
  lockedLayerKeys?: ReadonlySet<string>;
} = {}) => {
  const clearOtherSelections = jest.fn();
  const hook = renderHook(() => {
    const [draft, setDraft] = useState(initialDraft);
    const [rampDraft, setRampDraft] = useState<RampDraft | null>(null);
    const [placementHover, setPlacementHover] = useState<EditorMapPoint | null>(null);
    const [selectedElevationTransitionId, setSelectedElevationTransitionId] = useState(initialSelectedId);
    const [placementError, setPlacementError] = useState<string | null>(null);
    return {
      ...useTacticalEditorElevationTransitions({
        draft,
        setDraft,
        activeDrawingTool,
        rampDraft,
        selectedElevationTransitionId,
        lockedLayerKeys,
        setRampDraft,
        setPlacementHover,
        setSelectedElevationTransitionId,
        clearOtherSelections,
        setPlacementError,
      }),
      draft,
      rampDraft,
      placementHover,
      selectedElevationTransitionId,
      placementError,
    };
  });
  return { ...hook, clearOtherSelections };
};

describe("useTacticalEditorElevationTransitions", () => {
  it.each([
    [STAIRS_TOOL_ID, "stairs"],
    [LADDER_TOOL_ID, "ladder"],
  ] as const)("places %s across an adjacent-level edge", (toolId, kind) => {
    const { result, clearOtherSelections } = renderTransitions({ activeDrawingTool: toolId });

    act(() => result.current.placeElevationTransition({
      x: 9,
      y: 11,
      edgeRotation: 90,
      mapX: 9.6,
      mapY: 11.5,
    }));

    expect(result.current.draft.elevationTransitions).toEqual([
      expect.objectContaining({ kind }),
    ]);
    expect(result.current.selectedElevationTransitionId).toBe(`${kind}-1`);
    expect(clearOtherSelections).toHaveBeenCalledTimes(1);
    expect(result.current.placementError).toBeNull();
  });

  it("starts, completes, and cancels a ramp", () => {
    const { result, clearOtherSelections } = renderTransitions({ activeDrawingTool: RAMP_TOOL_ID });

    act(() => result.current.beginOrFinishRamp({
      x: 9,
      y: 11,
      edgeRotation: 90,
      mapX: 9.6,
      mapY: 11.5,
    }));
    expect(result.current.rampDraft).not.toBeNull();
    expect(result.current.placementHover).toMatchObject({ x: 9, y: 11 });
    expect(clearOtherSelections).toHaveBeenCalledTimes(1);

    act(() => result.current.beginOrFinishRamp({
      x: 8,
      y: 11,
      mapX: 8.5,
      mapY: 11.5,
    }));
    expect(result.current.rampDraft).toBeNull();
    expect(result.current.draft.elevationTransitions).toEqual([
      expect.objectContaining({ id: "ramp-1", kind: "ramp" }),
    ]);

    act(() => result.current.beginOrFinishRamp({
      x: 9,
      y: 11,
      edgeRotation: 90,
      mapX: 9.6,
      mapY: 11.5,
    }));
    act(() => result.current.cancelRampDrawing());
    expect(result.current.rampDraft).toBeNull();
    expect(result.current.placementError).toBeNull();
  });

  it("reports invalid transition placement", () => {
    const definition = raisedAreaDefinition();
    definition.drawnRaisedAreas = [];
    const { result } = renderTransitions({
      initialDraft: definition,
      activeDrawingTool: STAIRS_TOOL_ID,
    });

    act(() => result.current.placeElevationTransition({ x: 1, y: 1 }));

    expect(result.current.draft.elevationTransitions).toEqual([]);
    expect(result.current.placementError).toBeTruthy();
  });

  it("selects and deletes an elevation transition", () => {
    const definition = raisedAreaDefinition();
    const placed = renderTransitions({
      initialDraft: definition,
      activeDrawingTool: LADDER_TOOL_ID,
    });
    act(() => placed.result.current.placeElevationTransition({
      x: 9,
      y: 11,
      edgeRotation: 90,
      mapX: 9.6,
      mapY: 11.5,
    }));
    const transitionDefinition = placed.result.current.draft;
    const transitionId = transitionDefinition.elevationTransitions?.[0]?.id ?? "ladder-1";
    const selected = renderTransitions({
      initialDraft: transitionDefinition,
      initialSelectedId: transitionId,
    });

    let deleted = false;
    act(() => { deleted = selected.result.current.deleteSelectedElevationTransition(); });

    expect(deleted).toBe(true);
    expect(selected.result.current.draft.elevationTransitions).toEqual([]);
    expect(selected.result.current.selectedElevationTransitionId).toBeNull();
  });

  it("does not select or delete a locked transition", () => {
    const definition = raisedAreaDefinition();
    definition.elevationTransitions = [{
      id: "ladder-1",
      kind: "ladder",
      lower: { x: 9, y: 11 },
      upper: { x: 10, y: 11 },
    }];
    const lockedLayerKeys = new Set([
      tacticalEditorLayerKey("elevation-transition", "ladder-1"),
    ]);
    const unselected = renderTransitions({ initialDraft: definition, lockedLayerKeys });
    act(() => unselected.result.current.selectElevationTransition("ladder-1"));
    expect(unselected.result.current.selectedElevationTransitionId).toBeNull();

    const selected = renderTransitions({
      initialDraft: definition,
      initialSelectedId: "ladder-1",
      lockedLayerKeys,
    });
    expect(selected.result.current.deleteSelectedElevationTransition()).toBe(false);
    expect(selected.result.current.draft.elevationTransitions).toHaveLength(1);
  });
});
