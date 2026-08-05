/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import TacticalEditorLegacyCircleLayer, {
  type TacticalEditorLegacyCircleLayerProps,
} from "../TacticalEditorLegacyCircleLayer";

const primitives: TacticalEditorLegacyCircleLayerProps["primitives"] = [
  { id: "wall", terrainType: "wall", center: { x: 2, y: 2 }, radius: 1 },
  { id: "raised", terrainType: "raised-area", center: { x: 5, y: 2 }, radius: 1.5 },
  { id: "machinery", terrainType: "close-machinery", center: { x: 9, y: 2 }, radius: 2 },
];

const props = (): TacticalEditorLegacyCircleLayerProps => ({
  primitives,
  selectedPrimitiveId: "machinery",
  interactionDisabled: false,
  onSelectPrimitive: jest.fn(),
  onBeginDrag: jest.fn(),
});

const primaryCircle = (id: string) => screen.getByTestId(`terrain-circle-${id}`).querySelector("circle");

describe("TacticalEditorLegacyCircleLayer", () => {
  it("renders legacy wall, raised-area, and machinery circle styles", () => {
    render(<svg><TacticalEditorLegacyCircleLayer {...props()} /></svg>);

    expect(primaryCircle("wall")?.getAttribute("fill-opacity")).toBe("0");
    expect(primaryCircle("wall")?.getAttribute("stroke")).toBe("#cbd5e1");
    expect(primaryCircle("raised")?.getAttribute("fill")).toBe("#22d3ee");
    expect(primaryCircle("raised")?.getAttribute("fill-opacity")).toBe("0.12");
    expect(primaryCircle("machinery")?.getAttribute("fill")).toBe("#b45309");
    expect(primaryCircle("machinery")?.getAttribute("stroke")).toBe("#fef08a");
  });

  it("selects circles and starts center and radius drags without bubbling", () => {
    const layerProps = props();
    const onParentPointerDown = jest.fn();
    render(<svg onPointerDown={onParentPointerDown}><TacticalEditorLegacyCircleLayer {...layerProps} /></svg>);

    fireEvent.pointerDown(primaryCircle("wall")!);
    expect(layerProps.onSelectPrimitive).toHaveBeenCalledWith("wall");
    expect(onParentPointerDown).not.toHaveBeenCalled();

    const centerHandle = screen.getByTestId("terrain-circle-machinery-center-handle");
    const radiusHandle = screen.getByTestId("terrain-circle-machinery-radius-handle");
    centerHandle.setPointerCapture = jest.fn();
    radiusHandle.setPointerCapture = jest.fn();
    fireEvent.pointerDown(centerHandle, { pointerId: 11 });
    fireEvent.pointerDown(radiusHandle, { pointerId: 12 });
    expect(layerProps.onBeginDrag).toHaveBeenNthCalledWith(1, "machinery", "center");
    expect(layerProps.onBeginDrag).toHaveBeenNthCalledWith(2, "machinery", "radius");
    expect(centerHandle.setPointerCapture).toHaveBeenCalledTimes(1);
    expect(radiusHandle.setPointerCapture).toHaveBeenCalledTimes(1);
  });

  it("keeps selected handles visible but disables circle and handle interactions during placement", () => {
    const layerProps = { ...props(), interactionDisabled: true };
    render(<svg><TacticalEditorLegacyCircleLayer {...layerProps} /></svg>);

    expect(screen.getByTestId("terrain-circle-machinery-center-handle")).toBeTruthy();
    expect(primaryCircle("wall")?.getAttribute("class")).toBeNull();
    fireEvent.pointerDown(primaryCircle("wall")!);
    fireEvent.pointerDown(screen.getByTestId("terrain-circle-machinery-radius-handle"));
    expect(layerProps.onSelectPrimitive).not.toHaveBeenCalled();
    expect(layerProps.onBeginDrag).not.toHaveBeenCalled();
  });
});
