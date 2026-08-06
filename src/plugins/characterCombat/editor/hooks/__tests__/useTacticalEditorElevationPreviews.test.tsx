/** @jest-environment jsdom */

import { renderHook } from "@testing-library/react";
import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import {
  LADDER_TOOL_ID,
  RAMP_TOOL_ID,
  STAIRS_TOOL_ID,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";
import { useTacticalEditorElevationPreviews } from "../useTacticalEditorElevationPreviews";

const raisedAreaDefinition = () => {
  const definition = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
  definition.terrainPlacements = [];
  definition.drawnRaisedAreas = [{
    id: "platform",
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

const westEdgeHover = {
  x: 9,
  y: 11,
  edgeRotation: 90 as const,
  mapX: 10,
  mapY: 11.5,
};

describe("useTacticalEditorElevationPreviews", () => {
  it("returns no candidates or previews without an elevation tool", () => {
    const { result } = renderHook(() => useTacticalEditorElevationPreviews({
      definition: raisedAreaDefinition(),
      placementKind: null,
      placementHover: westEdgeHover,
      rampDraft: null,
    }));

    expect(result.current).toEqual({
      elevationTransitionKind: null,
      elevationEdgeCandidates: [],
      elevationEdgePreview: null,
      ladderMountPreview: null,
      rampPreview: null,
    });
  });

  it("finds candidates and the nearest stairs edge", () => {
    const { result } = renderHook(() => useTacticalEditorElevationPreviews({
      definition: raisedAreaDefinition(),
      placementKind: STAIRS_TOOL_ID,
      placementHover: westEdgeHover,
      rampDraft: null,
    }));

    expect(result.current.elevationTransitionKind).toBe("stairs");
    expect(result.current.elevationEdgeCandidates.length).toBeGreaterThan(0);
    expect(result.current.elevationEdgePreview).toMatchObject({
      lower: { x: 9, y: 11 },
      upper: { x: 10, y: 11 },
      center: { x: 10, y: 11.5 },
    });
    expect(result.current.ladderMountPreview).toBeNull();
  });

  it("derives the ladder mount for the nearest platform edge", () => {
    const { result } = renderHook(() => useTacticalEditorElevationPreviews({
      definition: raisedAreaDefinition(),
      placementKind: LADDER_TOOL_ID,
      placementHover: westEdgeHover,
      rampDraft: null,
    }));

    expect(result.current.elevationTransitionKind).toBe("ladder");
    expect(result.current.ladderMountPreview?.error).toBeNull();
    expect(result.current.ladderMountPreview?.mount?.position.x).toBeCloseTo(9.91);
    expect(result.current.ladderMountPreview?.mount?.position.y).toBeCloseTo(11.5);
  });

  it("derives a ramp preview after an edge has been selected", () => {
    const scenario = raisedAreaDefinition();
    const first = renderHook(() => useTacticalEditorElevationPreviews({
      definition: scenario,
      placementKind: RAMP_TOOL_ID,
      placementHover: westEdgeHover,
      rampDraft: null,
    })).result.current;
    const edge = first.elevationEdgePreview!;
    const rampHover = { x: 7, y: 11, mapX: 7.5, mapY: 11.5, edgeRotation: 90 as const };
    const { result } = renderHook(() => useTacticalEditorElevationPreviews({
      definition: scenario,
      placementKind: RAMP_TOOL_ID,
      placementHover: rampHover,
      rampDraft: { edge },
    }));

    expect(result.current.elevationTransitionKind).toBe("ramp");
    expect(result.current.elevationEdgePreview).toBe(edge);
    expect(result.current.rampPreview).toMatchObject({
      edge,
      lower: { x: 7, y: 11 },
      upper: { x: 10, y: 11 },
      valid: true,
      error: null,
    });
  });

  it("keeps the selected ramp edge when the pointer moves near another edge", () => {
    const scenario = raisedAreaDefinition();
    const first = renderHook(() => useTacticalEditorElevationPreviews({
      definition: scenario,
      placementKind: RAMP_TOOL_ID,
      placementHover: westEdgeHover,
      rampDraft: null,
    })).result.current.elevationEdgePreview!;
    const { result } = renderHook(() => useTacticalEditorElevationPreviews({
      definition: scenario,
      placementKind: RAMP_TOOL_ID,
      placementHover: { x: 13, y: 11, edgeRotation: 270, mapX: 13, mapY: 11.5 },
      rampDraft: { edge: first },
    }));

    expect(result.current.elevationEdgePreview).toBe(first);
  });

  it("returns no nearest preview when the pointer is away from every edge", () => {
    const { result } = renderHook(() => useTacticalEditorElevationPreviews({
      definition: raisedAreaDefinition(),
      placementKind: STAIRS_TOOL_ID,
      placementHover: { x: 1, y: 1, mapX: 1.5, mapY: 1.5 },
      rampDraft: null,
    }));

    expect(result.current.elevationEdgeCandidates.length).toBeGreaterThan(0);
    expect(result.current.elevationEdgePreview).toBeNull();
  });

  it("falls back to an empty candidate list when area geometry is invalid", () => {
    const scenario = raisedAreaDefinition();
    scenario.drawnRaisedAreas = [{
      id: "open-area",
      segments: [{ kind: "line", from: { x: 10, y: 10 }, to: { x: 13, y: 10 } }],
    }];
    const { result } = renderHook(() => useTacticalEditorElevationPreviews({
      definition: scenario,
      placementKind: STAIRS_TOOL_ID,
      placementHover: westEdgeHover,
      rampDraft: null,
    }));

    expect(result.current.elevationEdgeCandidates).toEqual([]);
    expect(result.current.elevationEdgePreview).toBeNull();
  });
});
