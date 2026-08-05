/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import TacticalEditorNaturalTerrainLayer, {
  type TacticalEditorNaturalTerrainLayerProps,
} from "../TacticalEditorNaturalTerrainLayer";

const placements: TacticalEditorNaturalTerrainLayerProps["placements"] = [
  { id: "tree", kind: "tree", position: { x: 2, y: 2 }, radius: 1.5 },
  { id: "bush", kind: "bush", position: { x: 6, y: 2 }, radius: 1 },
  { id: "rock", kind: "rock", position: { x: 10, y: 2 }, radius: 0.75 },
];

const props = (): TacticalEditorNaturalTerrainLayerProps => ({
  placements,
  map: { width: 20, height: 12 },
  selectedNaturalTerrainId: "bush",
  interactionDisabled: false,
  onBeginPositionDrag: jest.fn(),
  onBeginRadiusDrag: jest.fn(),
});

const primaryCircle = (id: string) => screen.getByTestId(`natural-terrain-${id}`).querySelector("circle");

describe("TacticalEditorNaturalTerrainLayer", () => {
  it("renders distinct tree, bush, and rock markers", () => {
    render(<svg><TacticalEditorNaturalTerrainLayer {...props()} /></svg>);

    expect(primaryCircle("tree")?.getAttribute("fill")).toBe("#166534");
    expect(screen.getByTestId("natural-terrain-tree").querySelector('rect[fill="#78350f"]')).toBeTruthy();
    expect(screen.getByTestId("natural-terrain-tree").textContent).toContain("T");
    expect(primaryCircle("bush")?.getAttribute("fill")).toBe("#4d7c0f");
    expect(screen.getByTestId("natural-terrain-bush").textContent).toContain("B");
    expect(primaryCircle("rock")?.getAttribute("fill")).toBe("#57534e");
    expect(screen.getByTestId("natural-terrain-rock").textContent).toContain("R");
  });

  it("renders the selected footprint and radius handle", () => {
    render(<svg><TacticalEditorNaturalTerrainLayer {...props()} /></svg>);

    expect(screen.getAllByTestId(/^natural-terrain-bush-footprint-/).length).toBeGreaterThan(1);
    expect(screen.queryByTestId(/^natural-terrain-tree-footprint-/)).toBeNull();
    expect(screen.getByTestId("natural-terrain-bush-radius-handle")).toBeTruthy();
    expect(primaryCircle("bush")?.getAttribute("stroke")).toBe("#fef08a");
  });

  it("starts position and radius drags without bubbling", () => {
    const layerProps = props();
    const onParentPointerDown = jest.fn();
    render(<svg onPointerDown={onParentPointerDown}><TacticalEditorNaturalTerrainLayer {...layerProps} /></svg>);

    const tree = primaryCircle("tree")!;
    tree.setPointerCapture = jest.fn();
    fireEvent.pointerDown(tree);
    expect(layerProps.onBeginPositionDrag).toHaveBeenCalledWith("tree", expect.anything());

    const radiusHandle = screen.getByTestId("natural-terrain-bush-radius-handle");
    radiusHandle.setPointerCapture = jest.fn();
    fireEvent.pointerDown(radiusHandle);
    expect(layerProps.onBeginRadiusDrag).toHaveBeenCalledWith("bush");
    expect(tree.setPointerCapture).toHaveBeenCalledTimes(1);
    expect(radiusHandle.setPointerCapture).toHaveBeenCalledTimes(1);
    expect(onParentPointerDown).not.toHaveBeenCalled();
  });

  it("keeps the selected footprint visible but disables drag starts during placement", () => {
    const layerProps = { ...props(), interactionDisabled: true };
    render(<svg><TacticalEditorNaturalTerrainLayer {...layerProps} /></svg>);

    expect(screen.getAllByTestId(/^natural-terrain-bush-footprint-/).length).toBeGreaterThan(1);
    expect(primaryCircle("tree")?.getAttribute("class")).toBeNull();
    fireEvent.pointerDown(primaryCircle("tree")!);
    fireEvent.pointerDown(screen.getByTestId("natural-terrain-bush-radius-handle"));
    expect(layerProps.onBeginPositionDrag).not.toHaveBeenCalled();
    expect(layerProps.onBeginRadiusDrag).not.toHaveBeenCalled();
  });
});
