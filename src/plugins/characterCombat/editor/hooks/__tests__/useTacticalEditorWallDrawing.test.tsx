/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { EditorWallDraft } from "../../lib/tacticalEditorInteractionState";
import { CURVED_WALL_TOOL_ID, WALL_TOOL_ID } from "../../lib/tacticalEditorSupport";
import { useTacticalEditorWallDrawing } from "../useTacticalEditorWallDrawing";

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

const renderWallDrawing = ({
  initialDraft = emptyDraft(),
  activeDrawingTool = WALL_TOOL_ID,
}: {
  initialDraft?: TacticalScenarioDefinitionFile;
  activeDrawingTool?: string | null;
} = {}) => {
  const clearOtherSelections = jest.fn();
  const showWallProperties = jest.fn();
  const hook = renderHook(() => {
    const [draft, setDraft] = useState(initialDraft);
    const [wallDraft, setWallDraft] = useState<EditorWallDraft | null>(null);
    const [selectedWallId, setSelectedWallId] = useState<string | null>("old-wall");
    const [placementError, setPlacementError] = useState<string | null>(null);
    return {
      ...useTacticalEditorWallDrawing({
        draft,
        setDraft,
        activeDrawingTool,
        wallDraft,
        setWallDraft,
        setSelectedWallId,
        clearOtherSelections,
        showWallProperties,
        setPlacementError,
      }),
      draft,
      wallDraft,
      selectedWallId,
      placementError,
    };
  });
  return { ...hook, clearOtherSelections, showWallProperties };
};

describe("useTacticalEditorWallDrawing", () => {
  it("starts a straight wall and clears the previous selection", () => {
    const { result, clearOtherSelections } = renderWallDrawing();

    act(() => result.current.beginWall({ x: 4, y: 5 }));

    expect(result.current.wallDraft).toEqual({
      from: { x: 4, y: 5 },
      to: { x: 4, y: 5 },
      curved: false,
      awaitingEnd: false,
    });
    expect(result.current.selectedWallId).toBeNull();
    expect(clearOtherSelections).toHaveBeenCalledTimes(1);
  });

  it("updates the wall preview", () => {
    const { result } = renderWallDrawing();

    act(() => result.current.beginWall({ x: 4, y: 5 }));
    act(() => result.current.updateWall({ x: 9, y: 8 }));

    expect(result.current.wallDraft?.to).toEqual({ x: 9, y: 8 });
  });

  it("completes a straight wall with the next available ID", () => {
    const draft = {
      ...emptyDraft(),
      drawnWalls: [{
        id: "drawn-wall-1",
        from: { x: 20, y: 20 },
        to: { x: 24, y: 20 },
      }],
    };
    const { result, showWallProperties } = renderWallDrawing({ initialDraft: draft });

    act(() => result.current.beginWall({ x: 4, y: 5 }));
    act(() => result.current.finishWall({ x: 9, y: 8 }));

    expect(result.current.draft.drawnWalls?.[1]).toEqual({
      id: "drawn-wall-2",
      from: { x: 4, y: 5 },
      to: { x: 9, y: 8 },
    });
    expect(result.current.wallDraft).toBeNull();
    expect(result.current.selectedWallId).toBe("drawn-wall-2");
    expect(showWallProperties).toHaveBeenCalledTimes(1);
  });

  it("creates a curved wall with a midpoint control", () => {
    const { result } = renderWallDrawing({ activeDrawingTool: CURVED_WALL_TOOL_ID });

    act(() => result.current.beginWall({ x: 2, y: 4 }));
    act(() => result.current.finishWall({ x: 10, y: 8 }));

    expect(result.current.draft.drawnWalls).toEqual([{
      id: "drawn-wall-1",
      from: { x: 2, y: 4 },
      to: { x: 10, y: 8 },
      control: { x: 6, y: 6 },
    }]);
  });

  it("waits for a distinct end point and rejects a zero-length completion", () => {
    const { result } = renderWallDrawing();

    act(() => result.current.beginWall({ x: 4, y: 5 }));
    act(() => result.current.finishWallInteraction({ x: 4, y: 5 }));
    expect(result.current.wallDraft?.awaitingEnd).toBe(true);
    expect(result.current.placementError).toBeNull();

    act(() => result.current.finishWall({ x: 4, y: 5 }));
    expect(result.current.draft.drawnWalls).toEqual([]);
    expect(result.current.wallDraft).toBeNull();
    expect(result.current.placementError).toBe("A wall must have different start and end points.");
  });

  it("cancels an unfinished wall", () => {
    const { result } = renderWallDrawing();

    act(() => result.current.beginWall({ x: 4, y: 5 }));
    act(() => result.current.cancelWall());

    expect(result.current.wallDraft).toBeNull();
    expect(result.current.draft.drawnWalls).toEqual([]);
  });
});
