/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import type { TacticalDrawnArea } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import TacticalEditorDrawnAreasLayer, {
  type TacticalEditorDrawnAreasLayerProps,
} from "../TacticalEditorDrawnAreasLayer";

const freeform: TacticalDrawnArea = {
  id: "freeform",
  segments: [
    { kind: "line", from: { x: 1, y: 1 }, to: { x: 5, y: 1 } },
    { kind: "quadratic", from: { x: 5, y: 1 }, control: { x: 7, y: 4 }, to: { x: 5, y: 6 } },
    { kind: "cubic", from: { x: 5, y: 6 }, control1: { x: 3, y: 8 }, control2: { x: 1, y: 7 }, to: { x: 1, y: 1 } },
  ],
  surface: "grass",
  elevation: 2,
  boundary: "wall",
  deployment: true,
};

const circle: TacticalDrawnArea = {
  id: "circle",
  segments: [{ kind: "line", from: { x: 10, y: 2 }, to: { x: 14, y: 2 } }],
  geometry: { kind: "circle", center: { x: 12, y: 4 }, radius: 2 },
  surface: "liquid-hydrogen",
  elevation: 1,
  boundary: "none",
  settings: { filled: false },
};

const rectangle: TacticalDrawnArea = {
  id: "rectangle",
  segments: [{ kind: "line", from: { x: 16, y: 2 }, to: { x: 22, y: 2 } }],
  geometry: { kind: "rectangle", x: 16, y: 2, width: 6, height: 4 },
  surface: "sand",
  elevation: 0,
  boundary: "none",
};

const noSurface: TacticalDrawnArea = {
  id: "none",
  segments: [{ kind: "line", from: { x: 24, y: 2 }, to: { x: 28, y: 2 } }],
  surface: "none",
  elevation: 0,
  boundary: "none",
};

const areas = [freeform, circle, rectangle, noSurface];
const cellsByArea = new Map(areas.map((area, index) => [area, [{ x: index + 1, y: 10 }]]));

const props = (): TacticalEditorDrawnAreasLayerProps => ({
  areas,
  cellsByArea,
  selectedAreaId: null,
  selectedAreaAnchor: null,
  nodeEditActive: false,
  interactionDisabled: false,
  onSelect: jest.fn(),
  onInsertAnchor: jest.fn(),
  onBeginQuadraticControlDrag: jest.fn(),
  onBeginCubicControlDrag: jest.fn(),
  onSelectAnchor: jest.fn(),
  onBeginAnchorDrag: jest.fn(),
  onBeginConstrainedDrag: jest.fn(),
});

const segment = (areaId: string, index = 0) => screen.getByTestId(`drawn-area-${areaId}-segment-${index}`);

describe("TacticalEditorDrawnAreasLayer", () => {
  it("renders surface cells, boundary styling, and area metadata", () => {
    render(<svg><TacticalEditorDrawnAreasLayer {...props()} /></svg>);

    const area = screen.getByTestId("drawn-area-freeform");
    expect(area.getAttribute("data-elevation-level")).toBe("2");
    expect(area.getAttribute("data-boundary")).toBe("wall");
    expect(area.getAttribute("data-deployment")).toBe("crew");
    expect(area.querySelector("rect")?.getAttribute("fill")).toBe("#3f7d20");
    expect(segment("freeform").getAttribute("stroke")).toBe("#e2e8f0");
    expect(segment("freeform").getAttribute("stroke-width")).toBe("0.32");
    expect(screen.getByTestId("drawn-area-none").querySelector("rect")).toBeNull();
  });

  it("preserves empty hydrogen fill and selected labels", () => {
    render(<svg><TacticalEditorDrawnAreasLayer {...props()} selectedAreaId="circle" /></svg>);

    expect(screen.getByTestId("drawn-area-circle").querySelector("rect")?.getAttribute("fill-opacity")).toBe("0.08");
    expect(segment("circle").getAttribute("stroke")).toBe("#fef08a");
    expect(screen.getByText("liquid-hydrogen · level 1 · none")).toBeTruthy();
  });

  it("selects enabled outlines without bubbling and suppresses disabled selection", () => {
    const layerProps = props();
    const onParentPointerDown = jest.fn();
    const { rerender } = render(<svg onPointerDown={onParentPointerDown}><TacticalEditorDrawnAreasLayer {...layerProps} /></svg>);

    fireEvent.pointerDown(segment("freeform"));
    expect(layerProps.onSelect).toHaveBeenCalledWith("freeform");
    expect(onParentPointerDown).not.toHaveBeenCalled();

    rerender(<svg onPointerDown={onParentPointerDown}><TacticalEditorDrawnAreasLayer {...layerProps} interactionDisabled /></svg>);
    fireEvent.pointerDown(segment("freeform"));
    expect(layerProps.onSelect).toHaveBeenCalledTimes(1);
    expect(segment("freeform").getAttribute("class")).toBeNull();
  });

  it("requests anchor insertion only for selected freeform areas in node-edit mode", () => {
    const layerProps = { ...props(), selectedAreaId: "freeform", nodeEditActive: true };
    const { rerender } = render(<svg><TacticalEditorDrawnAreasLayer {...layerProps} /></svg>);

    fireEvent.doubleClick(segment("freeform", 0));
    expect(layerProps.onInsertAnchor).toHaveBeenCalledWith("freeform", 0, expect.anything());

    rerender(<svg><TacticalEditorDrawnAreasLayer {...layerProps} selectedAreaId="circle" /></svg>);
    fireEvent.doubleClick(segment("circle"));
    expect(layerProps.onInsertAnchor).toHaveBeenCalledTimes(1);
  });

  it("dispatches quadratic and cubic control drags without bubbling", () => {
    const layerProps = { ...props(), selectedAreaId: "freeform" };
    const onParentPointerDown = jest.fn();
    render(<svg onPointerDown={onParentPointerDown}><TacticalEditorDrawnAreasLayer {...layerProps} /></svg>);

    const quadratic = screen.getByTestId("drawn-area-freeform-segment-1-control-handle");
    const cubic = screen.getByTestId("drawn-area-freeform-segment-2-control2-handle");
    quadratic.setPointerCapture = jest.fn();
    cubic.setPointerCapture = jest.fn();
    fireEvent.pointerDown(quadratic);
    fireEvent.pointerDown(cubic);

    expect(layerProps.onBeginQuadraticControlDrag).toHaveBeenCalledWith("freeform", 1);
    expect(layerProps.onBeginCubicControlDrag).toHaveBeenCalledWith("freeform", 2, "control2");
    expect(onParentPointerDown).not.toHaveBeenCalled();
  });

  it("renders and dispatches freeform anchor controls", () => {
    const layerProps = {
      ...props(),
      selectedAreaId: "freeform",
      selectedAreaAnchor: { areaId: "freeform", anchorIndex: 1 },
      nodeEditActive: true,
    };
    render(<svg><TacticalEditorDrawnAreasLayer {...layerProps} /></svg>);

    expect(screen.getAllByTestId(/^drawn-area-freeform-anchor-/)).toHaveLength(3);
    const anchor = screen.getByTestId("drawn-area-freeform-anchor-1");
    expect(anchor.getAttribute("fill")).toBe("#f59e0b");
    anchor.setPointerCapture = jest.fn();
    fireEvent.pointerDown(anchor);
    expect(layerProps.onSelectAnchor).toHaveBeenCalledWith({ areaId: "freeform", anchorIndex: 1 });
    expect(layerProps.onBeginAnchorDrag).toHaveBeenCalledWith("freeform", 1);
  });

  it("dispatches circle center and radius drags with their map points", () => {
    const layerProps = { ...props(), selectedAreaId: "circle" };
    render(<svg><TacticalEditorDrawnAreasLayer {...layerProps} /></svg>);

    const center = screen.getByTestId("drawn-area-circle-circle-center-handle");
    const radius = screen.getByTestId("drawn-area-circle-circle-radius-handle");
    center.setPointerCapture = jest.fn();
    radius.setPointerCapture = jest.fn();
    fireEvent.pointerDown(center);
    fireEvent.pointerDown(radius);
    expect(layerProps.onBeginConstrainedDrag).toHaveBeenNthCalledWith(1, "circle", "circle-center", { x: 12, y: 4 });
    expect(layerProps.onBeginConstrainedDrag).toHaveBeenNthCalledWith(2, "circle", "circle-radius", { x: 14, y: 4 });
  });

  it("dispatches rectangle center and corner drags with their map points", () => {
    const layerProps = { ...props(), selectedAreaId: "rectangle" };
    render(<svg><TacticalEditorDrawnAreasLayer {...layerProps} /></svg>);

    const center = screen.getByTestId("drawn-area-rectangle-rectangle-center-handle");
    const corner = screen.getByTestId("drawn-area-rectangle-rectangle-bottom-right-handle");
    center.setPointerCapture = jest.fn();
    corner.setPointerCapture = jest.fn();
    fireEvent.pointerDown(center);
    fireEvent.pointerDown(corner);
    expect(layerProps.onBeginConstrainedDrag).toHaveBeenNthCalledWith(1, "rectangle", "rectangle-center", { x: 19, y: 4 });
    expect(layerProps.onBeginConstrainedDrag).toHaveBeenNthCalledWith(2, "rectangle", "rectangle-bottom-right", { x: 22, y: 6 });
    expect(screen.getAllByTestId(/^drawn-area-rectangle-rectangle-.*-handle$/)).toHaveLength(5);
  });
});
