/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import type { TacticalDrawnRaisedArea } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import TacticalEditorRaisedAreasLayer, {
  type TacticalEditorRaisedAreasLayerProps,
} from "../TacticalEditorRaisedAreasLayer";

const areas: TacticalDrawnRaisedArea[] = [
  {
    id: "lower",
    segments: [{ kind: "line", from: { x: 1, y: 2 }, to: { x: 4, y: 2 } }],
  },
  {
    id: "middle",
    segments: [{
      kind: "quadratic",
      from: { x: 5, y: 2 },
      control: { x: 7, y: 5 },
      to: { x: 9, y: 2 },
    }],
  },
  {
    id: "upper",
    segments: [{
      kind: "cubic",
      from: { x: 10, y: 2 },
      control1: { x: 11, y: 5 },
      control2: { x: 13, y: 5 },
      to: { x: 14, y: 2 },
    }],
  },
];

const props = (): TacticalEditorRaisedAreasLayerProps => ({
  areas,
  levels: { lower: 1, middle: 2, upper: 3 },
  selectedAreaId: null,
  interactionDisabled: false,
  onSelect: jest.fn(),
  onBeginControlDrag: jest.fn(),
});

describe("TacticalEditorRaisedAreasLayer", () => {
  it("renders level-specific outlines and defaults missing levels to one", () => {
    const layerProps = props();
    layerProps.levels = { middle: 2, upper: 3 };
    render(<svg><TacticalEditorRaisedAreasLayer {...layerProps} /></svg>);

    expect(screen.getByTestId("drawn-raised-area-lower-segment-0").getAttribute("stroke")).toBe("#67e8f9");
    expect(screen.getByTestId("drawn-raised-area-middle-segment-0").getAttribute("stroke")).toBe("#22d3ee");
    expect(screen.getByTestId("drawn-raised-area-upper-segment-0").getAttribute("stroke")).toBe("#c084fc");
    expect(screen.getByTestId("drawn-raised-area-lower-segment-0").closest("g")?.getAttribute("data-elevation-level")).toBe("1");
  });

  it("renders quadratic and cubic paths with their existing SVG commands", () => {
    render(<svg><TacticalEditorRaisedAreasLayer {...props()} /></svg>);

    expect(screen.getByTestId("drawn-raised-area-middle-segment-0").getAttribute("d")).toBe("M 5 2 Q 7 5 9 2");
    expect(screen.getByTestId("drawn-raised-area-upper-segment-0").getAttribute("d")).toBe("M 10 2 C 11 5 13 5 14 2");
  });

  it("applies selected styling, label, and quadratic control guides", () => {
    const layerProps = { ...props(), selectedAreaId: "middle" };
    render(<svg><TacticalEditorRaisedAreasLayer {...layerProps} /></svg>);

    const segment = screen.getByTestId("drawn-raised-area-middle-segment-0");
    expect(segment.getAttribute("stroke")).toBe("#fef08a");
    expect(segment.getAttribute("stroke-width")).toBe("0.34");
    expect(screen.getByText("Level 2")).toBeTruthy();
    expect(screen.getByTestId("raised-area-middle-segment-0-control-handle")).toBeTruthy();
    expect(segment.parentElement?.querySelectorAll('line[stroke="#a78bfa"]')).toHaveLength(2);
  });

  it("selects an enabled outline without bubbling and suppresses selection when disabled", () => {
    const layerProps = props();
    const onParentPointerDown = jest.fn();
    const { rerender } = render(<svg onPointerDown={onParentPointerDown}><TacticalEditorRaisedAreasLayer {...layerProps} /></svg>);

    fireEvent.pointerDown(screen.getByTestId("drawn-raised-area-lower-segment-0"));
    expect(layerProps.onSelect).toHaveBeenCalledWith("lower");
    expect(onParentPointerDown).not.toHaveBeenCalled();

    rerender(<svg onPointerDown={onParentPointerDown}><TacticalEditorRaisedAreasLayer {...layerProps} interactionDisabled /></svg>);
    fireEvent.pointerDown(screen.getByTestId("drawn-raised-area-lower-segment-0"));
    expect(layerProps.onSelect).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("drawn-raised-area-lower-segment-0").getAttribute("class")).toBeNull();
  });

  it("starts a selected quadratic control drag without selecting or bubbling", () => {
    const layerProps = { ...props(), selectedAreaId: "middle" };
    const onParentPointerDown = jest.fn();
    render(<svg onPointerDown={onParentPointerDown}><TacticalEditorRaisedAreasLayer {...layerProps} /></svg>);

    const handle = screen.getByTestId("raised-area-middle-segment-0-control-handle");
    handle.setPointerCapture = jest.fn();
    fireEvent.pointerDown(handle, { pointerId: 9 });

    expect(layerProps.onBeginControlDrag).toHaveBeenCalledWith("middle", 0);
    expect(layerProps.onSelect).not.toHaveBeenCalled();
    expect(handle.setPointerCapture).toHaveBeenCalled();
    expect(onParentPointerDown).not.toHaveBeenCalled();
  });
});
