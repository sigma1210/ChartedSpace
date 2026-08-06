/** @jest-environment jsdom */

import type { RaisedAreaDraft } from "@/plugins/characterCombat/editor/lib/tacticalEditorInteractionState";
import {
  tacticalEditorLocalMapPoint,
  tacticalEditorMapPointer,
  tacticalEditorMapVertex,
  tacticalEditorRectangleEndPoint,
} from "../tacticalEditorPointerCoordinates";

const map = { width: 20, height: 12 };

const areaDraft: RaisedAreaDraft = {
  target: "area",
  start: { x: 5.25, y: 4.25 },
  current: { x: 8, y: 4 },
  hover: { x: 8, y: 6 },
  segments: [],
  outgoingControl: null,
};

describe("tactical editor pointer coordinates", () => {
  it("converts client coordinates through the SVG screen matrix", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const inverse = jest.fn(() => ({ transform: "inverse" }));
    svg.getScreenCTM = jest.fn(() => ({ inverse }) as unknown as DOMMatrix);
    svg.createSVGPoint = jest.fn(() => {
      const point = {
        x: 0,
        y: 0,
        matrixTransform: jest.fn(() => ({ x: 12, y: 8 })),
      };
      return point as unknown as DOMPoint;
    });

    expect(tacticalEditorLocalMapPoint({ currentTarget: svg, clientX: 120, clientY: 80 })).toEqual({ x: 12, y: 8 });
    const createdPoint = (svg.createSVGPoint as jest.Mock).mock.results[0].value as { x: number; y: number; matrixTransform: jest.Mock };
    expect(createdPoint.x).toBe(120);
    expect(createdPoint.y).toBe(80);
    expect(inverse).toHaveBeenCalledTimes(1);
    expect(createdPoint.matrixTransform).toHaveBeenCalledWith({ transform: "inverse" });
  });

  it("returns null when no SVG transform is available", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.getScreenCTM = jest.fn(() => null);

    expect(tacticalEditorLocalMapPoint({ currentTarget: svg, clientX: 10, clientY: 10 })).toBeNull();
  });

  it.each([
    { point: { x: 2.5, y: 3.1 }, rotation: 0 },
    { point: { x: 2.9, y: 3.5 }, rotation: 90 },
    { point: { x: 2.5, y: 3.9 }, rotation: 180 },
    { point: { x: 2.1, y: 3.5 }, rotation: 270 },
  ])("selects the nearest $rotation-degree cell edge", ({ point, rotation }) => {
    expect(tacticalEditorMapPointer(point)).toEqual({
      x: 2,
      y: 3,
      edgeRotation: rotation,
      mapX: point.x,
      mapY: point.y,
    });
  });

  it("snaps map vertices with the selected precision", () => {
    expect(tacticalEditorMapVertex({ x: 2.4, y: 3.6 }, {
      raisedAreaDraft: null,
      areaToolActive: false,
      snapMode: "grid",
      map,
    })).toEqual({ x: 2, y: 4 });
    expect(tacticalEditorMapVertex({ x: 2.4, y: 3.6 }, {
      raisedAreaDraft: null,
      areaToolActive: false,
      snapMode: "half-grid",
      map,
    })).toEqual({ x: 2.5, y: 3.5 });
  });

  it("closes an active pen area to its exact start point inside the closure radius", () => {
    expect(tacticalEditorMapVertex({ x: 5.5, y: 4.4 }, {
      raisedAreaDraft: areaDraft,
      areaToolActive: true,
      snapMode: "grid",
      map,
    })).toEqual(areaDraft.start);
    expect(tacticalEditorMapVertex({ x: 5.5, y: 4.4 }, {
      raisedAreaDraft: areaDraft,
      areaToolActive: false,
      snapMode: "grid",
      map,
    })).toEqual({ x: 6, y: 4 });
  });

  it("returns the original rectangle endpoint when square constraint is inactive", () => {
    const point = { x: 8, y: 7 };

    expect(tacticalEditorRectangleEndPoint({ x: 5, y: 5 }, point, false, map)).toBe(point);
  });

  it("constrains rectangle endpoints to squares in either direction", () => {
    expect(tacticalEditorRectangleEndPoint({ x: 5, y: 5 }, { x: 8, y: 7 }, true, map)).toEqual({ x: 8, y: 8 });
    expect(tacticalEditorRectangleEndPoint({ x: 5, y: 5 }, { x: 2, y: 4 }, true, map)).toEqual({ x: 2, y: 2 });
  });

  it("clamps constrained rectangle endpoints to map boundaries", () => {
    expect(tacticalEditorRectangleEndPoint({ x: 1, y: 1 }, { x: -5, y: 0 }, true, map)).toEqual({ x: 0, y: 0 });
    expect(tacticalEditorRectangleEndPoint({ x: 19, y: 11 }, { x: 25, y: 15 }, true, map)).toEqual({ x: 20, y: 12 });
  });
});
