/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import TacticalEditorElevationLayer, {
  type TacticalEditorElevationLayerProps,
} from "../TacticalEditorElevationLayer";

const edge = {
  key: "edge:1",
  lower: { x: 2, y: 2 },
  upper: { x: 2, y: 3 },
  lowerLevel: 0,
  upperLevel: 1,
  edge: { from: { x: 2, y: 3 }, to: { x: 3, y: 3 } },
  center: { x: 2.5, y: 3 },
};

const props = (): TacticalEditorElevationLayerProps => ({
  terrain: {
    elevationAccessCells: [{ x: 0, y: 0 }],
    elevationTransitions: [
      { id: "stairs", kind: "stairs", lower: { x: 1, y: 1 }, upper: { x: 1, y: 2 }, path: [], lowerLevel: 0, upperLevel: 1 },
      { id: "ladder", kind: "ladder", lower: { x: 2, y: 1 }, upper: { x: 3, y: 1 }, path: [], lowerLevel: 0, upperLevel: 1 },
      { id: "ramp", kind: "ramp", lower: { x: 4, y: 1 }, upper: { x: 4, y: 2 }, path: [], lowerLevel: 0, upperLevel: 1 },
    ],
  },
  selectedElevationTransitionId: "ladder",
  interactionDisabled: false,
  elevationTransitionKind: null,
  elevationEdgeCandidates: [],
  elevationEdgePreview: null,
  ladderMountPreview: null,
  rampPreview: null,
  onSelectTransition: jest.fn(),
});

const renderLayer = (layerProps: TacticalEditorElevationLayerProps, onParentPointerDown = jest.fn()) => ({
  onParentPointerDown,
  ...render(<svg onPointerDown={onParentPointerDown}><TacticalEditorElevationLayer {...layerProps} /></svg>),
});

describe("TacticalEditorElevationLayer", () => {
  it("renders elevation access cells and existing stairs, ladders, and ramps", () => {
    const layerProps = props();
    const { container, onParentPointerDown } = renderLayer(layerProps);

    expect(container.querySelector('rect[x="0.08"][y="0.08"]')?.getAttribute("fill")).toBe("#cbd5e1");
    expect(screen.getByTestId("elevation-transition-stairs").tagName).toBe("rect");
    expect(screen.getByTestId("elevation-transition-ladder").querySelector("line")?.getAttribute("stroke")).toBe("#fef08a");
    expect(screen.getByTestId("elevation-transition-ramp").querySelector("path")).toBeTruthy();

    fireEvent.pointerDown(screen.getByTestId("elevation-transition-stairs"));
    expect(layerProps.onSelectTransition).toHaveBeenCalledWith("stairs");
    expect(onParentPointerDown).not.toHaveBeenCalled();
  });

  it("does not select transitions while another placement interaction is active", () => {
    const layerProps = { ...props(), interactionDisabled: true };
    renderLayer(layerProps);

    const stairs = screen.getByTestId("elevation-transition-stairs");
    fireEvent.pointerDown(stairs);
    expect(layerProps.onSelectTransition).not.toHaveBeenCalled();
    expect(stairs.getAttribute("class")).toBeNull();
  });

  it("renders valid edges plus stairs and ladder placement previews", () => {
    const layerProps = {
      ...props(),
      terrain: { elevationAccessCells: [], elevationTransitions: [] },
      elevationTransitionKind: "stairs" as const,
      elevationEdgeCandidates: [edge],
      elevationEdgePreview: edge,
    };
    const { rerender } = renderLayer(layerProps);

    expect(screen.getByTestId("valid-elevation-edge-edge:1").getAttribute("stroke")).toBe("#fef08a");
    expect(screen.getByTestId("stairs-placement-preview")).toBeTruthy();

    rerender(<svg><TacticalEditorElevationLayer
      {...layerProps}
      elevationTransitionKind="ladder"
      ladderMountPreview={{
        mount: { position: { x: 2.5, y: 3 }, tangent: { x: 1, y: 0 }, outwardNormal: { x: 0, y: 1 } },
        error: null,
      }}
    /></svg>);
    expect(screen.getByTestId("ladder-placement-preview").textContent).toContain("L");
  });

  it("renders ramp paths and placement status", () => {
    const layerProps = {
      ...props(),
      terrain: { elevationAccessCells: [], elevationTransitions: [] },
      elevationTransitionKind: "ramp" as const,
      elevationEdgeCandidates: [edge],
      elevationEdgePreview: edge,
      rampPreview: {
        edge,
        lower: edge.lower,
        upper: edge.upper,
        path: [{ x: 2, y: 2 }, { x: 2, y: 3 }],
        valid: true,
        error: null,
      },
    };
    renderLayer(layerProps);

    expect(screen.getByTestId("ramp-placement-preview").querySelector("rect")).toBeTruthy();
    expect(screen.getByTestId("ramp-placement-preview-status").textContent).toBe("Click to place ramp");
  });
});
