/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import TacticalEditorWallsLayer, {
  type TacticalEditorWallsLayerProps,
} from "../TacticalEditorWallsLayer";

const drawnWalls: TacticalEditorWallsLayerProps["drawnWalls"] = [
  { id: "straight", from: { x: 2, y: 2 }, to: { x: 6, y: 2 } },
  { id: "curved", from: { x: 8, y: 2 }, control: { x: 10, y: 5 }, to: { x: 12, y: 2 } },
];

const props = (): TacticalEditorWallsLayerProps => ({
  resolvedWalls: [
    { id: "static", from: { x: 0, y: 0 }, to: { x: 1, y: 0 } },
    { id: "straight", from: { x: 2, y: 2 }, to: { x: 6, y: 2 } },
    { id: "curved:curve:0", from: { x: 8, y: 2 }, to: { x: 9, y: 3 } },
    { id: "circle:wall:0", from: { x: 14, y: 2 }, to: { x: 15, y: 2 } },
  ],
  drawnWalls,
  circlePrimitives: [{ id: "circle", terrainType: "wall", center: { x: 15, y: 3 }, radius: 1 }],
  selectedWallId: "curved",
  interactionDisabled: false,
  onBeginMove: jest.fn(),
  onBeginControlDrag: jest.fn(),
  onBeginEndpointDrag: jest.fn(),
});

describe("TacticalEditorWallsLayer", () => {
  it("renders static walls once and renders straight and curved drawn walls", () => {
    const { container } = render(<svg><TacticalEditorWallsLayer {...props()} /></svg>);

    expect(container.querySelector('line[x1="0"][y1="0"][x2="1"][y2="0"]')).toBeTruthy();
    expect(container.querySelector('line[x1="14"][y1="2"][x2="15"][y2="2"]')).toBeNull();
    expect(screen.getByTestId("drawn-wall-straight").tagName).toBe("line");
    expect(screen.getByTestId("drawn-wall-curved").tagName).toBe("path");
    expect(screen.getByTestId("drawn-wall-curved").getAttribute("d")).toBe("M 8 2 Q 10 5 12 2");
  });

  it("renders selected wall styling, endpoints, and the curve-control handle", () => {
    render(<svg><TacticalEditorWallsLayer {...props()} /></svg>);

    expect(screen.getByTestId("drawn-wall-curved").getAttribute("stroke")).toBe("#fef08a");
    expect(screen.getByTestId("wall-curved-from-handle")).toBeTruthy();
    expect(screen.getByTestId("wall-curved-to-handle")).toBeTruthy();
    expect(screen.getByTestId("wall-curved-control-handle")).toBeTruthy();
    expect(screen.queryByTestId("wall-straight-from-handle")).toBeNull();
  });

  it("dispatches move, endpoint, and curve-control drag starts without bubbling", () => {
    const layerProps = props();
    const onParentPointerDown = jest.fn();
    render(<svg onPointerDown={onParentPointerDown}><TacticalEditorWallsLayer {...layerProps} /></svg>);

    fireEvent.pointerDown(screen.getByTestId("drawn-wall-straight"));
    expect(layerProps.onBeginMove).toHaveBeenCalledWith("straight", expect.anything());

    const endpoint = screen.getByTestId("wall-curved-to-handle");
    const control = screen.getByTestId("wall-curved-control-handle");
    endpoint.setPointerCapture = jest.fn();
    control.setPointerCapture = jest.fn();
    fireEvent.pointerDown(endpoint);
    fireEvent.pointerDown(control);
    expect(layerProps.onBeginEndpointDrag).toHaveBeenCalledWith("curved", "to");
    expect(layerProps.onBeginControlDrag).toHaveBeenCalledWith("curved");
    expect(endpoint.setPointerCapture).toHaveBeenCalledTimes(1);
    expect(control.setPointerCapture).toHaveBeenCalledTimes(1);
    expect(onParentPointerDown).not.toHaveBeenCalled();
  });

  it("disables wall-body movement but keeps selected edit handles active during placement", () => {
    const layerProps = { ...props(), interactionDisabled: true };
    render(<svg><TacticalEditorWallsLayer {...layerProps} /></svg>);

    expect(screen.getByTestId("wall-curved-control-handle")).toBeTruthy();
    expect(screen.getByTestId("drawn-wall-straight").getAttribute("class")).toBeNull();
    fireEvent.pointerDown(screen.getByTestId("drawn-wall-straight"));
    const endpoint = screen.getByTestId("wall-curved-to-handle");
    const control = screen.getByTestId("wall-curved-control-handle");
    endpoint.setPointerCapture = jest.fn();
    control.setPointerCapture = jest.fn();
    fireEvent.pointerDown(endpoint);
    fireEvent.pointerDown(control);
    expect(layerProps.onBeginMove).not.toHaveBeenCalled();
    expect(layerProps.onBeginEndpointDrag).toHaveBeenCalledWith("curved", "to");
    expect(layerProps.onBeginControlDrag).toHaveBeenCalledWith("curved");
  });
});
