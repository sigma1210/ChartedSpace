/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { useTacticalEditorPreviewDragGuards } from "../useTacticalEditorPreviewDragGuards";

const renderDragGuards = (lockedLayerKeys = new Set<string>()) => {
  const callbacks = {
    beginCirclePrimitiveDrag: jest.fn(),
    beginNaturalTerrainDrag: jest.fn(),
    beginRaisedAreaControlDrag: jest.fn(),
    beginAreaAnchorDrag: jest.fn(),
    beginAreaCubicControlDrag: jest.fn(),
    beginConstrainedAreaDrag: jest.fn(),
    beginWallEndpointDrag: jest.fn(),
    beginWallMove: jest.fn(),
    beginWallControlDrag: jest.fn(),
    beginWallPortalDrag: jest.fn(),
    beginPlacementDrag: jest.fn(),
    beginEnemyDrag: jest.fn(),
  };
  return {
    callbacks,
    ...renderHook(() => useTacticalEditorPreviewDragGuards({
      lockedLayerKeys,
      ...callbacks,
    })),
  };
};

describe("useTacticalEditorPreviewDragGuards", () => {
  it("forwards unlocked preview drag starts with their original arguments", () => {
    const { result, callbacks } = renderDragGuards();
    const point = { x: 3, y: 5 };
    const drag = { id: "crate-1", offset: { x: 1, y: 2 } };

    act(() => {
      result.current.previewBeginCirclePrimitiveDrag("circle-1", "radius");
      result.current.previewBeginNaturalTerrainDrag("tree-1", "position", point);
      result.current.previewBeginRaisedAreaControlDrag({ kind: "area", id: "room" }, 2);
      result.current.previewBeginAreaAnchorDrag("room", 3);
      result.current.previewBeginAreaCubicControlDrag("room", 4, "control2");
      result.current.previewBeginConstrainedAreaDrag("room", "circle-radius", point);
      result.current.previewBeginWallEndpointDrag("wall-1", "to");
      result.current.previewBeginWallMove("wall-1", point);
      result.current.previewBeginWallControlDrag("wall-1");
      result.current.previewBeginWallPortalDrag("door-1");
      result.current.previewBeginPlacementDrag(drag);
      result.current.previewBeginEnemyDrag({ ...drag, id: "enemy-1" });
    });

    expect(callbacks.beginCirclePrimitiveDrag).toHaveBeenCalledWith("circle-1", "radius");
    expect(callbacks.beginNaturalTerrainDrag).toHaveBeenCalledWith("tree-1", "position", point);
    expect(callbacks.beginRaisedAreaControlDrag).toHaveBeenCalledWith({ kind: "area", id: "room" }, 2);
    expect(callbacks.beginAreaAnchorDrag).toHaveBeenCalledWith("room", 3);
    expect(callbacks.beginAreaCubicControlDrag).toHaveBeenCalledWith("room", 4, "control2");
    expect(callbacks.beginConstrainedAreaDrag).toHaveBeenCalledWith("room", "circle-radius", point);
    expect(callbacks.beginWallEndpointDrag).toHaveBeenCalledWith("wall-1", "to");
    expect(callbacks.beginWallMove).toHaveBeenCalledWith("wall-1", point);
    expect(callbacks.beginWallControlDrag).toHaveBeenCalledWith("wall-1");
    expect(callbacks.beginWallPortalDrag).toHaveBeenCalledWith("door-1");
    expect(callbacks.beginPlacementDrag).toHaveBeenCalledWith(drag);
    expect(callbacks.beginEnemyDrag).toHaveBeenCalledWith({ ...drag, id: "enemy-1" });
  });

  it("rejects drag starts for locked preview objects", () => {
    const { result, callbacks } = renderDragGuards(new Set([
      "primitive:circle-1",
      "natural-terrain:tree-1",
      "area:room",
      "wall:wall-1",
      "portal:door-1",
      "terrain-placement:crate-1",
      "enemy:enemy-1",
    ]));
    const point = { x: 3, y: 5 };

    act(() => {
      result.current.previewBeginCirclePrimitiveDrag("circle-1", "center");
      result.current.previewBeginNaturalTerrainDrag("tree-1", "radius", point);
      result.current.previewBeginRaisedAreaControlDrag({ kind: "area", id: "room" }, 1);
      result.current.previewBeginAreaAnchorDrag("room", 1);
      result.current.previewBeginAreaCubicControlDrag("room", 1, "control1");
      result.current.previewBeginConstrainedAreaDrag("room", "rectangle-center", point);
      result.current.previewBeginWallEndpointDrag("wall-1", "from");
      result.current.previewBeginWallMove("wall-1", point);
      result.current.previewBeginWallControlDrag("wall-1");
      result.current.previewBeginWallPortalDrag("door-1");
      result.current.previewBeginPlacementDrag({ id: "crate-1", offset: point });
      result.current.previewBeginEnemyDrag({ id: "enemy-1", offset: point });
    });

    Object.values(callbacks).forEach((callback) => expect(callback).not.toHaveBeenCalled());
  });

  it.each([
    ["area:room", { kind: "area", id: "room" }],
    ["raised-area:platform", { kind: "raised", id: "platform" }],
    ["terrain-region:sand", { kind: "terrain-region", id: "sand" }],
  ] as const)("maps locked area control owner %s to its layer", (key, owner) => {
    const { result, callbacks } = renderDragGuards(new Set([key]));

    act(() => result.current.previewBeginRaisedAreaControlDrag(owner, 2));

    expect(callbacks.beginRaisedAreaControlDrag).not.toHaveBeenCalled();
  });

  it("allows draft area control dragging regardless of locked layers", () => {
    const { result, callbacks } = renderDragGuards(new Set(["area:room"]));

    act(() => result.current.previewBeginRaisedAreaControlDrag({ kind: "draft" }, 2));

    expect(callbacks.beginRaisedAreaControlDrag).toHaveBeenCalledWith({ kind: "draft" }, 2);
  });
});
