/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
  tacticalClosedAreaGeometrySegments,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { WallPortalDrag } from "../tacticalEditorInteractionState";
import { DOOR_TOOL_ID, WALL_IRIS_TOOL_ID } from "../tacticalEditorSupport";
import { useTacticalEditorWallPortals } from "../useTacticalEditorWallPortals";

type OwnerFixture = "straight" | "curved" | "circle" | "area";

const ownerDraft = (owner: OwnerFixture): TacticalScenarioDefinitionFile => {
  const draft: TacticalScenarioDefinitionFile = {
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
  };
  if (owner === "straight") {
    draft.drawnWalls = [{ id: "owner-1", from: { x: 10, y: 10 }, to: { x: 20, y: 10 } }];
  } else if (owner === "curved") {
    draft.drawnWalls = [{
      id: "owner-1",
      from: { x: 10, y: 20 },
      control: { x: 15, y: 16 },
      to: { x: 20, y: 20 },
    }];
  } else if (owner === "circle") {
    draft.drawnTerrainPrimitives = [{
      id: "owner-1",
      shape: "circle",
      center: { x: 30, y: 10 },
      radius: 4,
      terrainType: "wall",
    }];
  } else {
    const geometry = { kind: "rectangle" as const, x: 40, y: 10, width: 6, height: 4 };
    draft.drawnAreas = [{
      id: "owner-1",
      geometry,
      segments: tacticalClosedAreaGeometrySegments(geometry),
      surface: "none",
      elevation: 0,
      boundary: "wall",
    }];
  }
  return draft;
};

const placementPoint: Record<OwnerFixture, { x: number; y: number }> = {
  straight: { x: 15, y: 10 },
  curved: { x: 15, y: 18 },
  circle: { x: 34, y: 10 },
  area: { x: 43, y: 10 },
};

const movedPoint: Record<"straight" | "circle" | "area", { x: number; y: number }> = {
  straight: { x: 18, y: 10 },
  circle: { x: 30, y: 6 },
  area: { x: 46, y: 12 },
};

const portalsIn = (draft: TacticalScenarioDefinitionFile) => [
  ...(draft.drawnWalls ?? []).flatMap((wall) => wall.portals ?? []),
  ...(draft.drawnTerrainPrimitives ?? []).flatMap((circle) => circle.portals ?? []),
  ...(draft.drawnAreas ?? []).flatMap((area) => area.portals ?? []),
];

const renderPortals = (
  owner: OwnerFixture,
  activeDrawingTool: string | null,
) => {
  const setSelectedPlacementId = jest.fn();
  const setSelectedEnemyId = jest.fn();
  const setSelectedWallId = jest.fn();
  const setSelectedAreaId = jest.fn();
  const setSelectedPrimitiveId = jest.fn();
  const setSelectedFire = jest.fn();
  const hook = renderHook(() => {
    const [draft, setDraft] = useState(ownerDraft(owner));
    const [selectedPortalId, setSelectedPortalId] = useState<string | null>(null);
    const [dragWallPortal, setDragWallPortal] = useState<WallPortalDrag | null>(null);
    const [placementError, setPlacementError] = useState<string | null>(null);
    return {
      ...useTacticalEditorWallPortals({
        draft,
        setDraft,
        activeDrawingTool,
        selectedPortalId,
        dragWallPortal,
        setSelectedPlacementId,
        setSelectedEnemyId,
        setSelectedWallId,
        setSelectedAreaId,
        setSelectedPrimitiveId,
        setSelectedPortalId,
        setSelectedFire,
        setDragWallPortal,
        setPlacementError,
      }),
      draft,
      selectedPortalId,
      dragWallPortal,
      placementError,
    };
  });
  return {
    ...hook,
    setSelectedPlacementId,
    setSelectedEnemyId,
    setSelectedWallId,
    setSelectedAreaId,
    setSelectedPrimitiveId,
    setSelectedFire,
  };
};

describe("useTacticalEditorWallPortals", () => {
  it.each([
    ["straight", DOOR_TOOL_ID, "sliding-door", "wall-door-1"],
    ["straight", WALL_IRIS_TOOL_ID, "iris-valve", "wall-iris-valve-1"],
    ["curved", DOOR_TOOL_ID, "sliding-door", "wall-door-1"],
    ["curved", WALL_IRIS_TOOL_ID, "iris-valve", "wall-iris-valve-1"],
    ["circle", DOOR_TOOL_ID, "sliding-door", "wall-door-1"],
    ["circle", WALL_IRIS_TOOL_ID, "iris-valve", "wall-iris-valve-1"],
    ["area", DOOR_TOOL_ID, "sliding-door", "wall-door-1"],
    ["area", WALL_IRIS_TOOL_ID, "iris-valve", "wall-iris-valve-1"],
  ] as const)("places a portal on a %s owner using %s", (owner, tool, kind, id) => {
    const { result } = renderPortals(owner, tool);

    act(() => result.current.placeWallPortal(placementPoint[owner]));

    expect(portalsIn(result.current.draft)).toEqual([expect.objectContaining({ id, kind })]);
    expect(result.current.selectedPortalId).toBe(id);
    expect(result.current.placementError).toBeNull();
  });

  it.each(["straight", "circle", "area"] as const)(
    "moves and restores a portal on a %s owner",
    (owner) => {
      const { result } = renderPortals(owner, DOOR_TOOL_ID);
      act(() => result.current.placeWallPortal(placementPoint[owner]));
      const originalPosition = portalsIn(result.current.draft)[0]?.position;

      act(() => result.current.beginWallPortalDrag("wall-door-1"));
      act(() => result.current.moveWallPortal(movedPoint[owner]));
      expect(portalsIn(result.current.draft)[0]?.position).not.toBe(originalPosition);

      act(() => result.current.cancelWallPortalDrag());
      expect(portalsIn(result.current.draft)[0]?.position).toBe(originalPosition);
      expect(result.current.dragWallPortal).toBeNull();
    },
  );

  it.each(["straight", "circle", "area"] as const)(
    "deletes a selected portal from a %s owner",
    (owner) => {
      const { result } = renderPortals(owner, WALL_IRIS_TOOL_ID);
      act(() => result.current.placeWallPortal(placementPoint[owner]));

      act(() => result.current.deleteSelectedPortal());

      expect(portalsIn(result.current.draft)).toEqual([]);
      expect(result.current.selectedPortalId).toBeNull();
    },
  );
});
