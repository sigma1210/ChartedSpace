/** @jest-environment jsdom */

import { renderHook } from "@testing-library/react";
import {
  tacticalClosedAreaGeometrySegments,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import {
  DOOR_TOOL_ID,
  FIRE_TOOL_ID,
  TREE_TOOL_ID,
  WALL_IRIS_TOOL_ID,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";
import { useTacticalEditorToolPreviews } from "../useTacticalEditorToolPreviews";

const definition = (overrides: Partial<TacticalScenarioDefinitionFile> = {}): TacticalScenarioDefinitionFile => ({
  schemaVersion: 1,
  id: "preview-test",
  title: "Preview test",
  briefing: "",
  objective: "",
  map: { width: 30, height: 20 },
  terrainPlacements: [],
  fireCells: [],
  smokeCells: [],
  ...overrides,
});

const hover = (x: number, y: number) => ({ x, y, mapX: x + 0.5, mapY: y + 0.5, edgeRotation: 0 as const });

describe("useTacticalEditorToolPreviews", () => {
  it("returns no previews without an active tool", () => {
    const { result } = renderHook(() => useTacticalEditorToolPreviews({
      definition: definition(),
      placementKind: null,
      placementHover: hover(2, 2),
      portalHover: { x: 2, y: 2 },
    }));

    expect(result.current).toEqual({ placementPreview: null, portalPreview: null });
  });

  it("validates open, occupied, and out-of-bounds fire cells", () => {
    const scenario = definition({ fireCells: [{ x: 3, y: 4 }] });
    const { result, rerender } = renderHook(({ point }) => useTacticalEditorToolPreviews({
      definition: scenario,
      placementKind: FIRE_TOOL_ID,
      placementHover: point,
      portalHover: null,
    }), { initialProps: { point: hover(2, 4) } });

    expect(result.current.placementPreview).toMatchObject({ kind: "fire", valid: true });
    rerender({ point: hover(3, 4) });
    expect(result.current.placementPreview).toMatchObject({ kind: "fire", valid: false });
    rerender({ point: hover(30, 4) });
    expect(result.current.placementPreview).toMatchObject({ kind: "fire", valid: false });
  });

  it("validates natural terrain and rejects trees overlapping enemies", () => {
    const open = definition();
    const blocked = definition({
      enemyPlacements: [{
        id: "guard",
        type: "gang-member",
        name: "Guard",
        position: { x: 6, y: 6 },
        avatarPath: "/guard.png",
      }],
    });
    const { result, rerender } = renderHook(({ scenario }) => useTacticalEditorToolPreviews({
      definition: scenario,
      placementKind: TREE_TOOL_ID,
      placementHover: hover(6, 6),
      portalHover: null,
    }), { initialProps: { scenario: open } });

    expect(result.current.placementPreview).toMatchObject({ kind: "natural", valid: true, placement: { kind: "tree" } });
    rerender({ scenario: blocked });
    expect(result.current.placementPreview).toMatchObject({ kind: "natural", valid: false, placement: { position: { x: 6, y: 6 } } });
  });

  it("returns valid and invalid catalog terrain previews", () => {
    const scenario = definition();
    const { result, rerender } = renderHook(({ point }) => useTacticalEditorToolPreviews({
      definition: scenario,
      placementKind: "console-1x1",
      placementHover: point,
      portalHover: null,
    }), { initialProps: { point: hover(4, 4) } });

    expect(result.current.placementPreview).toMatchObject({ kind: "terrain", valid: true, origin: { x: 4, y: 4 } });
    rerender({ point: hover(30, 20) });
    expect(result.current.placementPreview).toMatchObject({ kind: "terrain", valid: false });
  });

  it("validates sliding-door previews on straight walls", () => {
    const scenario = definition({
      drawnWalls: [{ id: "wall", from: { x: 2, y: 2 }, to: { x: 8, y: 2 } }],
    });
    const { result } = renderHook(() => useTacticalEditorToolPreviews({
      definition: scenario,
      placementKind: DOOR_TOOL_ID,
      placementHover: null,
      portalHover: { x: 5, y: 2 },
    }));

    expect(result.current.portalPreview).toMatchObject({ wallId: "wall", kind: "sliding-door", valid: true });
    expect(result.current.placementPreview).toBeNull();
  });

  it("validates iris-valve previews on circular walls", () => {
    const scenario = definition({
      drawnTerrainPrimitives: [{
        id: "circle",
        shape: "circle",
        center: { x: 10, y: 10 },
        radius: 3,
        terrainType: "wall",
      }],
    });
    const { result } = renderHook(() => useTacticalEditorToolPreviews({
      definition: scenario,
      placementKind: WALL_IRIS_TOOL_ID,
      placementHover: null,
      portalHover: { x: 13, y: 10 },
    }));

    expect(result.current.portalPreview).toMatchObject({ wallId: "circle", kind: "iris-valve", valid: true });
  });

  it("validates sliding-door previews on drawn-area boundary walls", () => {
    const geometry = { kind: "rectangle" as const, x: 15, y: 5, width: 6, height: 4 };
    const scenario = definition({
      drawnAreas: [{
        id: "room",
        geometry,
        segments: tacticalClosedAreaGeometrySegments(geometry),
        surface: "none",
        elevation: 0,
        boundary: "wall",
      }],
    });
    const { result } = renderHook(() => useTacticalEditorToolPreviews({
      definition: scenario,
      placementKind: DOOR_TOOL_ID,
      placementHover: null,
      portalHover: { x: 18, y: 5 },
    }));

    expect(result.current.portalPreview).toMatchObject({ wallId: "room", kind: "sliding-door", valid: true });
  });
});
