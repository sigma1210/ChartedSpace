/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
  type TacticalDrawnArea,
  type TacticalDrawnRaisedArea,
  type TacticalDrawnTerrainRegion,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type {
  AreaAnchorDrag,
  AreaCubicControlDrag,
  ConstrainedAreaDrag,
} from "../tacticalEditorInteractionState";
import { useTacticalEditorAreas } from "../useTacticalEditorAreas";

const squareSegments = (x = 10, y = 10, size = 4) => [
  { kind: "line" as const, from: { x, y }, to: { x: x + size, y } },
  { kind: "line" as const, from: { x: x + size, y }, to: { x: x + size, y: y + size } },
  { kind: "line" as const, from: { x: x + size, y: y + size }, to: { x, y: y + size } },
  { kind: "line" as const, from: { x, y: y + size }, to: { x, y } },
];

const area = (update: Partial<TacticalDrawnArea> = {}): TacticalDrawnArea => ({
  id: "area-1",
  segments: squareSegments(),
  surface: "grass",
  elevation: 0,
  boundary: "none",
  ...update,
});

const hydrogenRegion = (): TacticalDrawnTerrainRegion => ({
  id: "hydrogen-1",
  kind: "liquid-hydrogen",
  segments: squareSegments(20, 20, 2),
  settings: { filled: false },
});

const draftWith = ({
  areas = [],
  raisedAreas = [],
  regions = [],
}: {
  areas?: TacticalDrawnArea[];
  raisedAreas?: TacticalDrawnRaisedArea[];
  regions?: TacticalDrawnTerrainRegion[];
} = {}): TacticalScenarioDefinitionFile => ({
  ...cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition),
  terrainPlacements: [],
  drawnWalls: [],
  drawnAreas: areas,
  drawnRaisedAreas: raisedAreas,
  drawnTerrainRegions: regions,
  drawnTerrainPrimitives: [],
  naturalTerrainPlacements: [],
  elevationTransitions: [],
  fireCells: [],
  enemyPlacements: [],
});

const renderAreas = ({
  initialDraft,
  initialAreaId = null,
  initialRegionId = null,
  initialAnchor = null,
}: {
  initialDraft: TacticalScenarioDefinitionFile;
  initialAreaId?: string | null;
  initialRegionId?: string | null;
  initialAnchor?: { areaId: string; anchorIndex: number } | null;
}) => {
  const clearRaisedAreaControlDrag = jest.fn();
  const hook = renderHook(() => {
    const [draft, setDraft] = useState(initialDraft);
    const [selectedAreaId, setSelectedAreaId] = useState(initialAreaId);
    const [selectedTerrainRegionId, setSelectedTerrainRegionId] = useState(initialRegionId);
    const [selectedAreaAnchor, setSelectedAreaAnchor] = useState(initialAnchor);
    const [dragAreaAnchor, setDragAreaAnchor] = useState<AreaAnchorDrag | null>(null);
    const [dragAreaCubicControl, setDragAreaCubicControl] = useState<AreaCubicControlDrag | null>(null);
    const [dragConstrainedArea, setDragConstrainedArea] = useState<ConstrainedAreaDrag | null>(null);
    const [placementError, setPlacementError] = useState<string | null>(null);
    return {
      ...useTacticalEditorAreas({
        draft,
        setDraft,
        selectedAreaId,
        selectedTerrainRegionId,
        selectedAreaAnchor,
        dragAreaAnchor,
        dragAreaCubicControl,
        dragConstrainedArea,
        setSelectedAreaId,
        setSelectedTerrainRegionId,
        setSelectedAreaAnchor,
        setDragAreaAnchor,
        setDragAreaCubicControl,
        setDragConstrainedArea,
        clearRaisedAreaControlDrag,
        setPlacementError,
      }),
      draft,
      selectedAreaId,
      selectedTerrainRegionId,
      selectedAreaAnchor,
      dragAreaAnchor,
      dragAreaCubicControl,
      dragConstrainedArea,
      placementError,
    };
  });
  return { ...hook, clearRaisedAreaControlDrag };
};

describe("useTacticalEditorAreas", () => {
  it("updates an area and clears its portals when removing the boundary", () => {
    const selected = area({
      boundary: "wall",
      portals: [{ id: "door-1", kind: "sliding-door", position: 2 }],
    });
    const { result } = renderAreas({
      initialDraft: draftWith({ areas: [selected] }),
      initialAreaId: "area-1",
    });

    act(() => result.current.updateSelectedArea({ boundary: "none" }));

    expect(result.current.selectedArea).toMatchObject({ boundary: "none" });
    expect(result.current.selectedArea?.portals).toBeUndefined();
    expect(result.current.placementError).toBeNull();
  });

  it("inserts and selects a new area anchor", () => {
    const { result } = renderAreas({ initialDraft: draftWith({ areas: [area()] }) });

    act(() => result.current.insertCompletedAreaAnchor("area-1", 0, { x: 12, y: 10 }));

    expect(result.current.draft.drawnAreas?.[0]?.segments).toHaveLength(5);
    expect(result.current.selectedAreaAnchor).toEqual({ areaId: "area-1", anchorIndex: 1 });
  });

  it("deletes an area anchor but preserves the minimum three-point outline", () => {
    const { result } = renderAreas({
      initialDraft: draftWith({ areas: [area()] }),
      initialAnchor: { areaId: "area-1", anchorIndex: 1 },
    });

    act(() => result.current.deleteSelectedAreaAnchor());
    expect(result.current.draft.drawnAreas?.[0]?.segments).toHaveLength(3);
    expect(result.current.selectedAreaAnchor).toBeNull();

    const triangle = area({
      segments: [
        { kind: "line", from: { x: 10, y: 10 }, to: { x: 14, y: 10 } },
        { kind: "line", from: { x: 14, y: 10 }, to: { x: 12, y: 14 } },
        { kind: "line", from: { x: 12, y: 14 }, to: { x: 10, y: 10 } },
      ],
    });
    const minimum = renderAreas({
      initialDraft: draftWith({ areas: [triangle] }),
      initialAnchor: { areaId: "area-1", anchorIndex: 1 },
    });
    act(() => minimum.result.current.deleteSelectedAreaAnchor());
    expect(minimum.result.current.draft.drawnAreas?.[0]?.segments).toHaveLength(3);
    expect(minimum.result.current.placementError).toBe("A closed area needs at least three points.");
  });

  it("moves an area anchor and can restore its original position", () => {
    const { result } = renderAreas({ initialDraft: draftWith({ areas: [area()] }) });

    act(() => result.current.beginAreaAnchorDrag("area-1", 0));
    act(() => result.current.moveAreaAnchor({ x: 8, y: 9 }));
    expect(result.current.draft.drawnAreas?.[0]?.segments[0]?.from).toEqual({ x: 8, y: 9 });

    act(() => result.current.cancelAreaAnchorDrag());
    expect(result.current.draft.drawnAreas?.[0]?.segments[0]?.from).toEqual({ x: 10, y: 10 });
    expect(result.current.dragAreaAnchor).toBeNull();
  });

  it("moves a cubic area control and can restore its original position", () => {
    const curved = area({
      segments: [
        {
          kind: "cubic",
          from: { x: 10, y: 10 },
          control1: { x: 11, y: 9 },
          control2: { x: 13, y: 9 },
          to: { x: 14, y: 10 },
        },
        ...squareSegments().slice(1),
      ],
    });
    const { result } = renderAreas({ initialDraft: draftWith({ areas: [curved] }) });

    act(() => result.current.beginAreaCubicControlDrag("area-1", 0, "control1"));
    act(() => result.current.moveAreaCubicControl({ x: 12, y: 8 }));
    expect(result.current.draft.drawnAreas?.[0]?.segments[0]).toMatchObject({
      kind: "cubic",
      control1: { x: 12, y: 8 },
    });

    act(() => result.current.cancelAreaCubicControlDrag());
    expect(result.current.draft.drawnAreas?.[0]?.segments[0]).toMatchObject({
      kind: "cubic",
      control1: { x: 11, y: 9 },
    });
    expect(result.current.dragAreaCubicControl).toBeNull();
  });

  it("resizes a constrained circle and can restore its original geometry", () => {
    const circle = area({
      geometry: { kind: "circle", center: { x: 10, y: 10 }, radius: 5 },
    });
    const { result } = renderAreas({ initialDraft: draftWith({ areas: [circle] }) });

    act(() => result.current.beginConstrainedAreaDrag("area-1", "circle-radius", { x: 15, y: 10 }));
    act(() => result.current.updateConstrainedAreaDrag({ x: 16, y: 10 }));
    expect(result.current.draft.drawnAreas?.[0]?.geometry).toEqual({
      kind: "circle",
      center: { x: 10, y: 10 },
      radius: 6,
    });

    act(() => result.current.cancelConstrainedAreaDrag());
    expect(result.current.draft.drawnAreas?.[0]?.geometry).toEqual({
      kind: "circle",
      center: { x: 10, y: 10 },
      radius: 5,
    });
    expect(result.current.dragConstrainedArea).toBeNull();
  });

  it("resizes a constrained rectangle and rejects a zero-width result", () => {
    const rectangle = area({
      geometry: { kind: "rectangle", x: 10, y: 10, width: 4, height: 4 },
    });
    const { result } = renderAreas({ initialDraft: draftWith({ areas: [rectangle] }) });

    act(() => result.current.beginConstrainedAreaDrag("area-1", "rectangle-bottom-right", { x: 14, y: 14 }));
    act(() => result.current.updateConstrainedAreaDrag({ x: 16, y: 15 }));
    expect(result.current.draft.drawnAreas?.[0]?.geometry).toEqual({
      kind: "rectangle",
      x: 10,
      y: 10,
      width: 6,
      height: 5,
    });

    act(() => result.current.updateConstrainedAreaDrag({ x: 10, y: 12 }));
    expect(result.current.draft.drawnAreas?.[0]?.geometry).toEqual({
      kind: "rectangle",
      x: 10,
      y: 10,
      width: 6,
      height: 5,
    });
    expect(result.current.placementError).toBe("A rectangle must have positive width and height.");
  });

  it("updates and deletes an enclosed liquid-hydrogen region", () => {
    const { result, clearRaisedAreaControlDrag } = renderAreas({
      initialDraft: draftWith({ regions: [hydrogenRegion()] }),
      initialRegionId: "hydrogen-1",
    });

    act(() => result.current.updateSelectedTerrainRegionFilled(true));
    expect(result.current.selectedTerrainRegion?.settings).toEqual({ filled: true });

    act(() => result.current.deleteSelectedTerrainRegion());
    expect(result.current.draft.drawnTerrainRegions).toEqual([]);
    expect(result.current.selectedTerrainRegionId).toBeNull();
    expect(clearRaisedAreaControlDrag).toHaveBeenCalledTimes(1);
  });

  it("deletes the selected area", () => {
    const { result } = renderAreas({
      initialDraft: draftWith({ areas: [area()] }),
      initialAreaId: "area-1",
    });

    act(() => result.current.deleteSelectedArea());

    expect(result.current.draft.drawnAreas).toEqual([]);
    expect(result.current.selectedAreaId).toBeNull();
  });

  it("deletes a selected legacy raised area", () => {
    const raisedArea: TacticalDrawnRaisedArea = {
      id: "legacy-raised-1",
      segments: squareSegments(),
    };
    const { result, clearRaisedAreaControlDrag } = renderAreas({
      initialDraft: draftWith({ raisedAreas: [raisedArea] }),
      initialAreaId: "legacy-raised-1",
    });

    act(() => result.current.deleteSelectedLegacyRaisedArea());

    expect(result.current.draft.drawnRaisedAreas).toEqual([]);
    expect(result.current.selectedAreaId).toBeNull();
    expect(clearRaisedAreaControlDrag).toHaveBeenCalledTimes(1);
  });
});
