/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { PluginHudLayer } from "@/components/hud/PluginHudLayer";
import TacticalEditorToolsHud from "../TacticalEditorToolsHud";

const renderHud = (overrides: Partial<ComponentProps<typeof TacticalEditorToolsHud>> = {}) => {
  const props: ComponentProps<typeof TacticalEditorToolsHud> = {
    layout: { visible: true, pinned: false, position: { x: 10, y: 10 } },
    onLayoutChange: jest.fn(),
    primaryTool: "select",
    placementKind: null,
    enemyToolActive: false,
    openToolGroup: null,
    canRotateSelection: false,
    tracingTemplateVisible: false,
    layersVisible: false,
    enemyPaletteVisible: false,
    drawingPrecisionControl: <div>Precision control</div>,
    mapWidth: 72,
    mapHeight: 48,
    selectedLiquidHydrogenFilled: null,
    penDraftSegmentCount: null,
    rampDrawing: false,
    onActivatePrimaryTool: jest.fn(),
    onToggleToolGroup: jest.fn(),
    onActivateDrawingTool: jest.fn(),
    onRotateSelection: jest.fn(),
    onOpenTracingTemplate: jest.fn(),
    onOpenLayers: jest.fn(),
    onOpenEnemyPalette: jest.fn(),
    onUpdateMapDimension: jest.fn(),
    onUpdateLiquidHydrogenFilled: jest.fn(),
    onFinishPenArea: jest.fn(),
    onCancelPenArea: jest.fn(),
    onCancelRamp: jest.fn(),
    ...overrides,
  };

  render(<PluginHudLayer><TacticalEditorToolsHud {...props} /></PluginHudLayer>);
  return props;
};

describe("TacticalEditorToolsHud", () => {
  beforeAll(() => {
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  it("opens the Enemy Palette from the Interactions submenu", () => {
    const props = renderHud({ openToolGroup: "interactions" });

    fireEvent.click(screen.getByRole("button", { name: "Open Enemy Palette" }));

    expect(props.onOpenEnemyPalette).toHaveBeenCalledTimes(1);
  });

  it("forwards primary tools, group tools, and the existing HUD launchers", () => {
    const props = renderHud({ openToolGroup: "areas" });

    fireEvent.click(screen.getByRole("button", { name: "Select tool" }));
    fireEvent.click(screen.getByRole("button", { name: "Node edit tool" }));
    fireEvent.click(screen.getByRole("button", { name: "Hand tool" }));
    fireEvent.click(screen.getByRole("button", { name: "Open Boundaries tools" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose Rectangle area tool" }));
    fireEvent.click(screen.getByRole("button", { name: "Open tracing template" }));
    fireEvent.click(screen.getByRole("button", { name: "Open layers" }));

    expect(props.onActivatePrimaryTool).toHaveBeenNthCalledWith(1, "select");
    expect(props.onActivatePrimaryTool).toHaveBeenNthCalledWith(2, "node");
    expect(props.onActivatePrimaryTool).toHaveBeenNthCalledWith(3, "hand");
    expect(props.onToggleToolGroup).toHaveBeenCalledWith("boundaries");
    expect(props.onActivateDrawingTool).toHaveBeenCalledWith("scenario-rectangle-area");
    expect(props.onOpenTracingTemplate).toHaveBeenCalledTimes(1);
    expect(props.onOpenLayers).toHaveBeenCalledTimes(1);
  });

  it("forwards drawing settings and contextual placement controls", () => {
    const props = renderHud({
      openToolGroup: "drawing-settings",
      canRotateSelection: true,
      selectedLiquidHydrogenFilled: true,
    });

    expect(screen.getByText("Precision control")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Map width"), { target: { value: "80" } });
    fireEvent.change(screen.getByLabelText("Map height"), { target: { value: "60" } });
    fireEvent.click(screen.getByRole("button", { name: "Rotate selected item 90 degrees" }));
    fireEvent.click(screen.getByLabelText("Filled with liquid hydrogen"));

    expect(props.onUpdateMapDimension).toHaveBeenCalledWith("width", "80");
    expect(props.onUpdateMapDimension).toHaveBeenCalledWith("height", "60");
    expect(props.onRotateSelection).toHaveBeenCalledTimes(1);
    expect(props.onUpdateLiquidHydrogenFilled).toHaveBeenCalledWith(false);
  });

  it("always renders Rotate and disables it when the selection cannot rotate", () => {
    renderHud();

    const rotate = screen.getByRole("button", { name: "Rotate selected item 90 degrees" }) as HTMLButtonElement;
    expect(rotate.disabled).toBe(true);
  });

  it("forwards Pen and ramp cancellation controls", () => {
    const props = renderHud({ penDraftSegmentCount: 2, rampDrawing: true });

    fireEvent.click(screen.getByRole("button", { name: "Finish area" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel outline" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel ramp" }));

    expect(props.onFinishPenArea).toHaveBeenCalledTimes(1);
    expect(props.onCancelPenArea).toHaveBeenCalledTimes(1);
    expect(props.onCancelRamp).toHaveBeenCalledTimes(1);
  });
});
