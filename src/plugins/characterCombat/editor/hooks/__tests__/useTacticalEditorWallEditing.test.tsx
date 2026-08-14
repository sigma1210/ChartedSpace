/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type {
  WallControlDrag,
  WallEndpointDrag,
  WallMoveDrag,
} from "../../lib/tacticalEditorInteractionState";
import { useTacticalEditorWallEditing } from "../useTacticalEditorWallEditing";

const wall = () => ({
  id: "wall-1",
  from: { x: 10, y: 10 },
  to: { x: 16, y: 10 },
  control: { x: 13, y: 8 },
});

const draftWithWall = (): TacticalScenarioDefinitionFile => ({
  ...cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition),
  terrainPlacements: [],
  drawnWalls: [wall()],
  drawnAreas: [],
  drawnRaisedAreas: [],
  drawnTerrainRegions: [],
  drawnTerrainPrimitives: [],
  naturalTerrainPlacements: [],
  elevationTransitions: [],
  fireCells: [],
  enemyPlacements: [],
});

const renderWallEditing = (initialSelectedWallId: string | null = "wall-1") => renderHook(() => {
  const [draft, setDraft] = useState(draftWithWall());
  const [selectedWallId, setSelectedWallId] = useState(initialSelectedWallId);
  const [selectedPortalId, setSelectedPortalId] = useState<string | null>("portal-1");
  const [dragWallEndpoint, setDragWallEndpoint] = useState<WallEndpointDrag | null>(null);
  const [dragWallMove, setDragWallMove] = useState<WallMoveDrag | null>(null);
  const [dragWallControl, setDragWallControl] = useState<WallControlDrag | null>(null);
  const [placementError, setPlacementError] = useState<string | null>(null);
  return {
    ...useTacticalEditorWallEditing({
      draft,
      setDraft,
      selectedWallId,
      dragWallEndpoint,
      dragWallMove,
      dragWallControl,
      setSelectedWallId,
      setSelectedPortalId,
      setDragWallEndpoint,
      setDragWallMove,
      setDragWallControl,
      setPlacementError,
    }),
    draft,
    selectedWallId,
    selectedPortalId,
    dragWallEndpoint,
    dragWallMove,
    dragWallControl,
    placementError,
  };
});

describe("useTacticalEditorWallEditing", () => {
  it("resizes an endpoint and restores it when cancelled", () => {
    const { result } = renderWallEditing();

    act(() => result.current.beginWallEndpointDrag("wall-1", "to"));
    act(() => result.current.resizeWallEndpoint({ x: 18, y: 12 }));
    expect(result.current.selectedWall?.to).toEqual({ x: 18, y: 12 });

    act(() => result.current.cancelWallEndpointDrag());
    expect(result.current.selectedWall?.to).toEqual({ x: 16, y: 10 });
    expect(result.current.dragWallEndpoint).toBeNull();
  });

  it("rejects an endpoint that collapses the wall", () => {
    const { result } = renderWallEditing();

    act(() => result.current.beginWallEndpointDrag("wall-1", "to"));
    act(() => result.current.resizeWallEndpoint({ x: 10, y: 10 }));

    expect(result.current.selectedWall?.to).toEqual({ x: 16, y: 10 });
    expect(result.current.placementError).toBeTruthy();
  });

  it("moves a curved wall and its control point, then restores all geometry", () => {
    const { result } = renderWallEditing();

    act(() => result.current.beginWallMove("wall-1", { x: 10, y: 10 }));
    expect(result.current.selectedPortalId).toBeNull();
    act(() => result.current.moveWall({ x: 13, y: 14 }));
    expect(result.current.selectedWall).toMatchObject({
      from: { x: 13, y: 14 },
      to: { x: 19, y: 14 },
      control: { x: 16, y: 12 },
    });

    act(() => result.current.cancelWallMove());
    expect(result.current.selectedWall).toMatchObject(wall());
    expect(result.current.dragWallMove).toBeNull();
  });

  it("reshapes a curved wall and retains the control after finishing", () => {
    const { result } = renderWallEditing();

    act(() => result.current.beginWallControlDrag("wall-1"));
    act(() => result.current.reshapeWallControl({ x: 14, y: 6 }));
    act(() => result.current.finishWallControlDrag());

    expect(result.current.selectedWall?.control).toEqual({ x: 14, y: 6 });
    expect(result.current.dragWallControl).toBeNull();
  });

  it("updates the selected wall elevation independently of overlapping terrain", () => {
    const { result } = renderWallEditing();

    act(() => result.current.updateSelectedWall({ elevation: 1.5 }));

    expect(result.current.selectedWall?.elevation).toBe(1.5);
  });

  it("restores the original curve control when cancelled", () => {
    const { result } = renderWallEditing();

    act(() => result.current.beginWallControlDrag("wall-1"));
    act(() => result.current.reshapeWallControl({ x: 14, y: 6 }));
    act(() => result.current.cancelWallControlDrag());

    expect(result.current.selectedWall?.control).toEqual({ x: 13, y: 8 });
    expect(result.current.dragWallControl).toBeNull();
  });

  it("deletes the selected wall and clears wall drag state", () => {
    const { result } = renderWallEditing();

    act(() => result.current.beginWallEndpointDrag("wall-1", "to"));
    act(() => result.current.deleteSelectedWall());

    expect(result.current.draft.drawnWalls).toEqual([]);
    expect(result.current.selectedWallId).toBeNull();
    expect(result.current.dragWallEndpoint).toBeNull();
    expect(result.current.dragWallMove).toBeNull();
    expect(result.current.dragWallControl).toBeNull();
  });
});
