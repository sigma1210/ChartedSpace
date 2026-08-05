/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
  type TacticalScenarioDefinitionFile,
  type TacticalTerrainPrimitiveType,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { CircleDraft, CirclePrimitiveDrag } from "../tacticalEditorInteractionState";
import { CIRCLE_AREA_TOOL_ID, CIRCLE_TOOL_ID } from "../tacticalEditorSupport";
import { useTacticalEditorCirclePrimitives } from "../useTacticalEditorCirclePrimitives";

const primitive = () => ({
  id: "terrain-circle-1",
  shape: "circle" as const,
  center: { x: 10, y: 10 },
  radius: 4,
  terrainType: "wall" as const,
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

const renderCircles = ({
  initialDraft = emptyDraft(),
  activeDrawingTool = CIRCLE_TOOL_ID,
  initialSelectedId = null,
}: {
  initialDraft?: TacticalScenarioDefinitionFile;
  activeDrawingTool?: string | null;
  initialSelectedId?: string | null;
} = {}) => {
  const clearDrawingTool = jest.fn();
  const clearSelections = jest.fn();
  const createCircleArea = jest.fn();
  const showCircleProperties = jest.fn();
  const hook = renderHook(() => {
    const [draft, setDraft] = useState(initialDraft);
    const [circleDraft, setCircleDraft] = useState<CircleDraft | null>(null);
    const [dragCirclePrimitive, setDragCirclePrimitive] = useState<CirclePrimitiveDrag | null>(null);
    const [selectedPrimitiveId, setSelectedPrimitiveId] = useState(initialSelectedId);
    const [creationTerrainType, setCreationTerrainType] = useState<TacticalTerrainPrimitiveType>("wall");
    const [placementError, setPlacementError] = useState<string | null>(null);
    return {
      ...useTacticalEditorCirclePrimitives({
        draft,
        setDraft,
        activeDrawingTool,
        creationTerrainType,
        circleDraft,
        dragCirclePrimitive,
        selectedPrimitiveId,
        setCircleDraft,
        setDragCirclePrimitive,
        setSelectedPrimitiveId,
        setCreationTerrainType,
        clearDrawingTool,
        clearSelections,
        createCircleArea,
        showCircleProperties,
        setPlacementError,
      }),
      draft,
      circleDraft,
      dragCirclePrimitive,
      selectedPrimitiveId,
      creationTerrainType,
      placementError,
    };
  });
  return {
    ...hook,
    clearDrawingTool,
    clearSelections,
    createCircleArea,
    showCircleProperties,
  };
};

describe("useTacticalEditorCirclePrimitives", () => {
  it("starts, previews, and cancels a circle", () => {
    const { result, clearSelections } = renderCircles();

    act(() => result.current.beginCircle({ x: 10, y: 10 }));
    act(() => result.current.updateCircle({ x: 13, y: 14 }));
    expect(result.current.circleDraft).toEqual({ center: { x: 10, y: 10 }, radius: 5 });
    expect(clearSelections).toHaveBeenCalledTimes(1);

    act(() => result.current.cancelCircleDrawing());
    expect(result.current.circleDraft).toBeNull();
  });

  it("creates a legacy circle with the next available ID", () => {
    const initialDraft = { ...emptyDraft(), drawnTerrainPrimitives: [primitive()] };
    const { result, clearDrawingTool } = renderCircles({ initialDraft });

    act(() => result.current.beginCircle({ x: 20, y: 20 }));
    act(() => result.current.finishCircle({ x: 23, y: 20 }));

    expect(result.current.draft.drawnTerrainPrimitives?.[1]).toEqual({
      id: "terrain-circle-2",
      shape: "circle",
      center: { x: 20, y: 20 },
      radius: 3,
      terrainType: "wall",
    });
    expect(result.current.selectedPrimitiveId).toBe("terrain-circle-2");
    expect(clearDrawingTool).toHaveBeenCalledTimes(1);
  });

  it("rejects a legacy circle without a positive radius", () => {
    const { result } = renderCircles();

    act(() => result.current.beginCircle({ x: 10, y: 10 }));
    act(() => result.current.finishCircle({ x: 10, y: 10 }));

    expect(result.current.draft.drawnTerrainPrimitives).toEqual([]);
    expect(result.current.placementError).toBe("A circle must have a positive radius.");
  });

  it("delegates circle-area completion", () => {
    const { result, createCircleArea } = renderCircles({ activeDrawingTool: CIRCLE_AREA_TOOL_ID });

    act(() => result.current.beginCircle({ x: 10, y: 10 }));
    act(() => result.current.finishCircle({ x: 14, y: 10 }));

    expect(createCircleArea).toHaveBeenCalledWith({ x: 10, y: 10 }, 4);
    expect(result.current.draft.drawnTerrainPrimitives).toEqual([]);
  });

  it("selects a circle and restores its terrain type in the HUD", () => {
    const { result, showCircleProperties } = renderCircles({
      initialDraft: { ...emptyDraft(), drawnTerrainPrimitives: [primitive()] },
    });

    act(() => result.current.selectTerrainPrimitive("terrain-circle-1"));

    expect(result.current.selectedPrimitiveId).toBe("terrain-circle-1");
    expect(result.current.creationTerrainType).toBe("wall");
    expect(showCircleProperties).toHaveBeenCalledTimes(1);
  });

  it("moves the center and resizes the selected circle", () => {
    const { result } = renderCircles({
      initialDraft: { ...emptyDraft(), drawnTerrainPrimitives: [primitive()] },
      initialSelectedId: "terrain-circle-1",
    });

    act(() => result.current.beginCirclePrimitiveDrag("terrain-circle-1", "center"));
    act(() => result.current.updateCirclePrimitiveDrag({ x: 15, y: 16 }));
    expect(result.current.selectedPrimitive?.center).toEqual({ x: 15, y: 16 });
    act(() => result.current.finishCirclePrimitiveDrag());

    act(() => result.current.beginCirclePrimitiveDrag("terrain-circle-1", "radius"));
    act(() => result.current.updateCirclePrimitiveDrag({ x: 18, y: 20 }));
    expect(result.current.selectedPrimitive?.radius).toBe(5);
  });

  it("converts a wall circle to liquid hydrogen and removes its portals", () => {
    const circle = {
      ...primitive(),
      portals: [{ id: "door-1", kind: "sliding-door" as const, position: 0.25 }],
    };
    const { result } = renderCircles({
      initialDraft: { ...emptyDraft(), drawnTerrainPrimitives: [circle] },
      initialSelectedId: "terrain-circle-1",
    });

    act(() => result.current.changeLegacyCircleTerrainType("liquid-hydrogen"));

    expect(result.current.selectedPrimitive).toMatchObject({
      terrainType: "liquid-hydrogen",
      settings: { filled: true },
    });
    expect(result.current.selectedPrimitive?.portals).toBeUndefined();
  });

  it("deletes the selected circle", () => {
    const { result } = renderCircles({
      initialDraft: { ...emptyDraft(), drawnTerrainPrimitives: [primitive()] },
      initialSelectedId: "terrain-circle-1",
    });

    act(() => result.current.deleteSelectedPrimitive());

    expect(result.current.draft.drawnTerrainPrimitives).toEqual([]);
    expect(result.current.selectedPrimitiveId).toBeNull();
    expect(result.current.dragCirclePrimitive).toBeNull();
  });
});
