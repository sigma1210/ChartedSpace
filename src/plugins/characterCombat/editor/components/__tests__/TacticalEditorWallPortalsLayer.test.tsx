/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import TacticalEditorWallPortalsLayer, {
  type TacticalEditorWallPortalsLayerProps,
} from "../TacticalEditorWallPortalsLayer";

const props = (): TacticalEditorWallPortalsLayerProps => ({
  doors: [
    { id: "generated", from: { x: 0, y: 0 }, to: { x: 1, y: 0 }, open: false, portalType: "sliding-door" },
    { id: "wall-door", from: { x: 2, y: 0 }, to: { x: 3, y: 0 }, open: false, portalType: "sliding-door" },
    { id: "area-iris", from: { x: 4, y: 0 }, to: { x: 5, y: 0 }, open: false, portalType: "iris-valve" },
    { id: "circle-iris", from: { x: 6, y: 0 }, to: { x: 7, y: 0 }, open: false, portalType: "iris-valve" },
  ],
  drawnWalls: [{
    id: "wall",
    from: { x: 0, y: 0 },
    to: { x: 4, y: 0 },
    portals: [{ id: "wall-door", kind: "sliding-door", position: 0.5 }],
  }],
  drawnAreas: [{
    id: "area",
    segments: [],
    surface: "none",
    elevation: 0,
    boundary: "wall",
    portals: [{ id: "area-iris", kind: "iris-valve", position: 0.5 }],
  }],
  circlePrimitives: [{
    id: "circle",
    shape: "circle",
    center: { x: 6, y: 2 },
    radius: 2,
    terrainType: "wall",
    portals: [{ id: "circle-iris", kind: "iris-valve", position: 0.5 }],
  }],
  selectedPortalId: "area-iris",
  interactionDisabled: false,
  onBeginPortalDrag: jest.fn(),
});

describe("TacticalEditorWallPortalsLayer", () => {
  it("renders generated and editable sliding doors while marking only editable portals", () => {
    const { container } = render(<svg><TacticalEditorWallPortalsLayer {...props()} /></svg>);

    expect(container.querySelector('line[x1="0"][x2="1"]')).toBeTruthy();
    expect(screen.getByTestId("wall-portal-wall-door").tagName).toBe("line");
    expect(screen.getByTestId("wall-portal-wall-door").getAttribute("class")).toBe("cursor-move");
    expect(container.querySelector('[data-testid="wall-portal-generated"]')).toBeNull();
  });

  it("renders editable area and circle iris valves with selected styling", () => {
    render(<svg><TacticalEditorWallPortalsLayer {...props()} /></svg>);

    const areaIris = screen.getByTestId("wall-portal-area-iris");
    expect(areaIris.querySelectorAll("line")).toHaveLength(3);
    expect(areaIris.querySelector("circle")?.getAttribute("stroke")).toBe("#fef08a");
    expect(screen.getByTestId("wall-portal-circle-iris").querySelector("circle")).toBeTruthy();
  });

  it("starts editable door and iris drags without bubbling", () => {
    const layerProps = props();
    const onParentPointerDown = jest.fn();
    render(<svg onPointerDown={onParentPointerDown}><TacticalEditorWallPortalsLayer {...layerProps} /></svg>);

    const door = screen.getByTestId("wall-portal-wall-door");
    const iris = screen.getByTestId("wall-portal-area-iris");
    door.setPointerCapture = jest.fn();
    iris.setPointerCapture = jest.fn();
    fireEvent.pointerDown(door);
    fireEvent.pointerDown(iris);
    expect(layerProps.onBeginPortalDrag).toHaveBeenNthCalledWith(1, "wall-door");
    expect(layerProps.onBeginPortalDrag).toHaveBeenNthCalledWith(2, "area-iris");
    expect(door.setPointerCapture).toHaveBeenCalledTimes(1);
    expect(iris.setPointerCapture).toHaveBeenCalledTimes(1);
    expect(onParentPointerDown).not.toHaveBeenCalled();
  });

  it("keeps portals visible but disables editable portal dragging during placement", () => {
    const layerProps = { ...props(), interactionDisabled: true };
    render(<svg><TacticalEditorWallPortalsLayer {...layerProps} /></svg>);

    const door = screen.getByTestId("wall-portal-wall-door");
    const iris = screen.getByTestId("wall-portal-area-iris");
    expect(door.getAttribute("class")).toBeNull();
    expect(iris.getAttribute("class")).toBeNull();
    fireEvent.pointerDown(door);
    fireEvent.pointerDown(iris);
    expect(layerProps.onBeginPortalDrag).not.toHaveBeenCalled();
  });
});
