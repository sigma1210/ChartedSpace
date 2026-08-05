/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
  type TacticalDrawnArea,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { RaisedAreaDraft } from "../../lib/tacticalEditorInteractionState";
import { PEN_AREA_TOOL_ID } from "../../lib/tacticalEditorSupport";
import { useTacticalEditorAreaDrawing } from "../useTacticalEditorAreaDrawing";

const existingArea = (id: string): TacticalDrawnArea => ({
  id,
  geometry: { kind: "rectangle", x: 20, y: 20, width: 2, height: 2 },
  segments: [
    { kind: "line", from: { x: 20, y: 20 }, to: { x: 22, y: 20 } },
    { kind: "line", from: { x: 22, y: 20 }, to: { x: 22, y: 22 } },
    { kind: "line", from: { x: 22, y: 22 }, to: { x: 20, y: 22 } },
    { kind: "line", from: { x: 20, y: 22 }, to: { x: 20, y: 20 } },
  ],
  surface: "none",
  elevation: 0,
  boundary: "none",
});

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

const renderAreaDrawing = (
  initialDraft = emptyDraft(),
  activeDrawingTool: string | null = null,
  initialAreaDraft: RaisedAreaDraft | null = null,
) => {
  const clearDrawingTool = jest.fn();
  const clearSelections = jest.fn();
  const clearRaisedAreaControlDrag = jest.fn();
  const showAreaProperties = jest.fn();
  const hook = renderHook(() => {
    const [draft, setDraft] = useState(initialDraft);
    const [areaDraft, setAreaDraft] = useState<RaisedAreaDraft | null>(initialAreaDraft);
    const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
    const [selectedTerrainRegionId, setSelectedTerrainRegionId] = useState<string | null>("old-region");
    const [placementError, setPlacementError] = useState<string | null>(null);
    return {
      ...useTacticalEditorAreaDrawing({
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
      }),
      draft,
      areaDraft,
      selectedAreaId,
      selectedTerrainRegionId,
      placementError,
    };
  });
  return {
    ...hook,
    clearDrawingTool,
    clearSelections,
    clearRaisedAreaControlDrag,
    showAreaProperties,
  };
};

describe("useTacticalEditorAreaDrawing", () => {
  it("creates a normalized rectangle and completes the area workflow", () => {
    const { result, clearDrawingTool, showAreaProperties } = renderAreaDrawing();

    act(() => result.current.createRectangleArea({ x: 14, y: 16 }, { x: 10, y: 11 }));

    expect(result.current.draft.drawnAreas).toEqual([expect.objectContaining({
      id: "rectangle-area-1",
      geometry: { kind: "rectangle", x: 10, y: 11, width: 4, height: 5 },
      surface: "none",
      elevation: 0,
      boundary: "none",
    })]);
    expect(result.current.selectedAreaId).toBe("rectangle-area-1");
    expect(result.current.selectedTerrainRegionId).toBeNull();
    expect(showAreaProperties).toHaveBeenCalledTimes(1);
    expect(clearDrawingTool).toHaveBeenCalledTimes(1);
  });

  it("rejects a rectangle without both dimensions", () => {
    const { result, clearDrawingTool, showAreaProperties } = renderAreaDrawing();

    act(() => result.current.createRectangleArea({ x: 10, y: 10 }, { x: 10, y: 14 }));

    expect(result.current.draft.drawnAreas).toEqual([]);
    expect(result.current.placementError).toBe("Drag a rectangle with both width and height.");
    expect(clearDrawingTool).not.toHaveBeenCalled();
    expect(showAreaProperties).not.toHaveBeenCalled();
  });

  it("creates a circle with the next available area ID", () => {
    const draft = { ...emptyDraft(), drawnAreas: [existingArea("circle-area-1")] };
    const { result, showAreaProperties } = renderAreaDrawing(draft);

    act(() => result.current.createCircleArea({ x: 8.2, y: 9.7 }, 3));

    expect(result.current.draft.drawnAreas?.[1]).toMatchObject({
      id: "circle-area-2",
      geometry: { kind: "circle", center: { x: 8.2, y: 9.7 }, radius: 3 },
    });
    expect(result.current.selectedAreaId).toBe("circle-area-2");
    expect(showAreaProperties).toHaveBeenCalledTimes(1);
  });

  it("rejects a circle without a positive radius", () => {
    const { result, clearDrawingTool, showAreaProperties } = renderAreaDrawing();

    act(() => result.current.createCircleArea({ x: 10, y: 10 }, 0));

    expect(result.current.draft.drawnAreas).toEqual([]);
    expect(result.current.placementError).toBe("A circle must have a positive radius.");
    expect(clearDrawingTool).not.toHaveBeenCalled();
    expect(showAreaProperties).not.toHaveBeenCalled();
  });

  it("starts a Pen area and clears the previous selection", () => {
    const { result, clearSelections } = renderAreaDrawing(
      emptyDraft(),
      PEN_AREA_TOOL_ID,
    );

    act(() => result.current.commitPenNode({ x: 10, y: 10 }, { x: 10, y: 10 }));

    expect(result.current.areaDraft).toMatchObject({
      start: { x: 10, y: 10 },
      current: { x: 10, y: 10 },
      segments: [],
      outgoingControl: null,
    });
    expect(clearSelections).toHaveBeenCalledTimes(1);
  });

  it("appends a curved Pen segment and updates its hover point", () => {
    const { result } = renderAreaDrawing(emptyDraft(), PEN_AREA_TOOL_ID);

    act(() => result.current.commitPenNode({ x: 10, y: 10 }, { x: 11, y: 9 }));
    act(() => result.current.commitPenNode({ x: 14, y: 10 }, { x: 15, y: 10 }));
    act(() => result.current.hoverRaisedArea({ x: 16, y: 12 }));

    expect(result.current.areaDraft?.segments).toEqual([expect.objectContaining({
      kind: "cubic",
      from: { x: 10, y: 10 },
      control1: { x: 11, y: 9 },
      control2: { x: 13, y: 10 },
      to: { x: 14, y: 10 },
    })]);
    expect(result.current.areaDraft?.hover).toEqual({ x: 16, y: 12 });
  });

  it("closes and selects a valid Pen area", () => {
    const { result, clearDrawingTool, showAreaProperties } = renderAreaDrawing(
      emptyDraft(),
      PEN_AREA_TOOL_ID,
    );

    act(() => result.current.commitPenNode({ x: 10, y: 10 }, { x: 10, y: 10 }));
    act(() => result.current.commitPenNode({ x: 14, y: 10 }, { x: 14, y: 10 }));
    act(() => result.current.commitPenNode({ x: 14, y: 14 }, { x: 14, y: 14 }));
    act(() => result.current.closePenArea());

    expect(result.current.draft.drawnAreas).toEqual([expect.objectContaining({
      id: "drawn-area-1",
      segments: expect.arrayContaining([expect.objectContaining({ kind: "line" })]),
    })]);
    expect(result.current.areaDraft).toBeNull();
    expect(result.current.selectedAreaId).toBe("drawn-area-1");
    expect(showAreaProperties).toHaveBeenCalledTimes(1);
    expect(clearDrawingTool).toHaveBeenCalledTimes(1);
  });

  it("keeps an unfinished Pen area when closure has too few segments", () => {
    const { result } = renderAreaDrawing(emptyDraft(), PEN_AREA_TOOL_ID);

    act(() => result.current.commitPenNode({ x: 10, y: 10 }, { x: 10, y: 10 }));
    act(() => result.current.commitPenNode({ x: 14, y: 10 }, { x: 14, y: 10 }));
    act(() => result.current.closePenArea());

    expect(result.current.draft.drawnAreas).toEqual([]);
    expect(result.current.areaDraft).not.toBeNull();
    expect(result.current.placementError).toBe("A Pen area needs at least three boundary segments.");
  });

  it("cancels an unfinished Pen area", () => {
    const { result, clearRaisedAreaControlDrag } = renderAreaDrawing(
      emptyDraft(),
      PEN_AREA_TOOL_ID,
    );

    act(() => result.current.commitPenNode({ x: 10, y: 10 }, { x: 10, y: 10 }));
    act(() => result.current.cancelPenArea());

    expect(result.current.areaDraft).toBeNull();
    expect(clearRaisedAreaControlDrag).toHaveBeenCalled();
    expect(result.current.placementError).toBeNull();
  });
});
