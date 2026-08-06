/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import type { TacticalDrawnTerrainRegion } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import TacticalEditorTerrainRegionsLayer, {
  type TacticalEditorTerrainRegionsLayerProps,
} from "../TacticalEditorTerrainRegionsLayer";

const line = [{ kind: "line" as const, from: { x: 1, y: 1 }, to: { x: 4, y: 1 } }];
const regions: TacticalDrawnTerrainRegion[] = [
  { id: "machinery", kind: "close-machinery", segments: line },
  { id: "hydrogen", kind: "liquid-hydrogen", settings: { filled: false }, segments: line },
  { id: "grass", kind: "grass", segments: line },
  { id: "sand", kind: "sand", segments: line },
  { id: "water", kind: "water", segments: line },
  {
    id: "curve",
    kind: "grass",
    segments: [{ kind: "quadratic", from: { x: 2, y: 3 }, control: { x: 4, y: 6 }, to: { x: 6, y: 3 } }],
  },
  {
    id: "cubic",
    kind: "water",
    segments: [{ kind: "cubic", from: { x: 7, y: 3 }, control1: { x: 8, y: 6 }, control2: { x: 10, y: 6 }, to: { x: 11, y: 3 } }],
  },
];

const cellsByRegion = new Map(regions.map((region, index) => [region, [{ x: index, y: 8 }]]));

const props = (): TacticalEditorTerrainRegionsLayerProps => ({
  regions,
  cellsByRegion,
  selectedRegionId: null,
  interactionDisabled: false,
  onSelect: jest.fn(),
  onBeginControlDrag: jest.fn(),
});

const cell = (id: string) => screen.getByTestId(`drawn-terrain-region-${id}`).querySelector("rect")!;
const segment = (id: string) => screen.getByTestId(`drawn-terrain-region-${id}-segment-0`);

describe("TacticalEditorTerrainRegionsLayer", () => {
  it("renders the existing fill and outline colors for every terrain kind", () => {
    render(<svg><TacticalEditorTerrainRegionsLayer {...props()} /></svg>);

    expect(["machinery", cell("machinery").getAttribute("fill"), segment("machinery").getAttribute("stroke")]).toEqual(["machinery", "#b45309", "#fbbf24"]);
    expect(["hydrogen", cell("hydrogen").getAttribute("fill"), segment("hydrogen").getAttribute("stroke")]).toEqual(["hydrogen", "#0284c7", "#7dd3fc"]);
    expect(["grass", cell("grass").getAttribute("fill"), segment("grass").getAttribute("stroke")]).toEqual(["grass", "#3f7d20", "#65a30d"]);
    expect(["sand", cell("sand").getAttribute("fill"), segment("sand").getAttribute("stroke")]).toEqual(["sand", "#c2a15a", "#f2d28b"]);
    expect(["water", cell("water").getAttribute("fill"), segment("water").getAttribute("stroke")]).toEqual(["water", "#2563a8", "#60a5fa"]);
  });

  it("renders flat surfaces edge-to-edge and inset hazardous-region cells", () => {
    render(<svg><TacticalEditorTerrainRegionsLayer {...props()} /></svg>);

    expect(cell("grass").getAttribute("width")).toBe("1");
    expect(cell("grass").getAttribute("stroke-width")).toBe("0");
    expect(cell("machinery").getAttribute("width")).toBe("0.92");
    expect(cell("machinery").getAttribute("stroke-width")).toBe("0.04");
  });

  it("distinguishes empty and filled liquid hydrogen", () => {
    const layerProps = { ...props(), selectedRegionId: "hydrogen" };
    const { rerender } = render(<svg><TacticalEditorTerrainRegionsLayer {...layerProps} /></svg>);

    expect(cell("hydrogen").getAttribute("fill-opacity")).toBe("0.08");
    expect(screen.getByText("Liquid hydrogen · empty")).toBeTruthy();

    const filledRegions = regions.map((region) => region.id === "hydrogen"
      ? { ...region, settings: { filled: true } } as TacticalDrawnTerrainRegion
      : region);
    const filledCells = new Map(filledRegions.map((region, index) => [region, [{ x: index, y: 8 }]]));
    rerender(<svg><TacticalEditorTerrainRegionsLayer {...layerProps} regions={filledRegions} cellsByRegion={filledCells} /></svg>);
    expect(cell("hydrogen").getAttribute("fill-opacity")).toBe("0.28");
    expect(screen.getByText("Liquid hydrogen · filled")).toBeTruthy();
  });

  it("renders quadratic and cubic paths with selected curve controls", () => {
    render(<svg><TacticalEditorTerrainRegionsLayer {...props()} selectedRegionId="curve" /></svg>);

    expect(segment("curve").getAttribute("d")).toBe("M 2 3 Q 4 6 6 3");
    expect(segment("curve").getAttribute("stroke")).toBe("#fef08a");
    expect(screen.getByTestId("terrain-region-curve-segment-0-control-handle")).toBeTruthy();
    expect(segment("curve").parentElement?.querySelectorAll('line[stroke="#a78bfa"]')).toHaveLength(2);
    expect(segment("cubic").getAttribute("d")).toBe("M 7 3 C 8 6 10 6 11 3");
  });

  it("selects enabled outlines and suppresses selection while interactions are disabled", () => {
    const layerProps = props();
    const onParentPointerDown = jest.fn();
    const { rerender } = render(<svg onPointerDown={onParentPointerDown}><TacticalEditorTerrainRegionsLayer {...layerProps} /></svg>);

    fireEvent.pointerDown(segment("sand"));
    expect(layerProps.onSelect).toHaveBeenCalledWith("sand");
    expect(onParentPointerDown).not.toHaveBeenCalled();

    rerender(<svg onPointerDown={onParentPointerDown}><TacticalEditorTerrainRegionsLayer {...layerProps} interactionDisabled /></svg>);
    fireEvent.pointerDown(segment("sand"));
    expect(layerProps.onSelect).toHaveBeenCalledTimes(1);
    expect(segment("sand").getAttribute("class")).toBeNull();
  });

  it("starts a selected quadratic control drag without selecting or bubbling", () => {
    const layerProps = { ...props(), selectedRegionId: "curve" };
    const onParentPointerDown = jest.fn();
    render(<svg onPointerDown={onParentPointerDown}><TacticalEditorTerrainRegionsLayer {...layerProps} /></svg>);

    const handle = screen.getByTestId("terrain-region-curve-segment-0-control-handle");
    handle.setPointerCapture = jest.fn();
    fireEvent.pointerDown(handle, { pointerId: 4 });

    expect(layerProps.onBeginControlDrag).toHaveBeenCalledWith("curve", 0);
    expect(layerProps.onSelect).not.toHaveBeenCalled();
    expect(handle.setPointerCapture).toHaveBeenCalled();
    expect(onParentPointerDown).not.toHaveBeenCalled();
  });
});
