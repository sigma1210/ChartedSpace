/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { PluginHudLayer } from "@/components/hud/PluginHudLayer";
import TacticalEditorLegacyCircleHud from "../TacticalEditorLegacyCircleHud";

const renderHud = (overrides: Partial<ComponentProps<
  typeof TacticalEditorLegacyCircleHud
>> = {}) => {
  const props: ComponentProps<typeof TacticalEditorLegacyCircleHud> = {
    layout: { visible: true, pinned: false, position: { x: 10, y: 10 } },
    onLayoutChange: jest.fn(),
    circle: null,
    creationTerrainType: "wall",
    onChangeTerrainType: jest.fn(),
    onUpdateCircle: jest.fn(),
    onDeleteCircle: jest.fn(),
    ...overrides,
  };

  render(<PluginHudLayer><TacticalEditorLegacyCircleHud {...props} /></PluginHudLayer>);
  return props;
};

describe("TacticalEditorLegacyCircleHud", () => {
  beforeAll(() => {
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  it("selects the terrain type while creating a compatibility circle", () => {
    const props = renderHud({ creationTerrainType: "raised-area" });

    expect(screen.getByText(/This legacy circle will be a raised area/)).toBeTruthy();
    expect(screen.queryByLabelText("Circle radius")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Circle type Wall" }));
    fireEvent.click(screen.getByRole("button", { name: "Circle type Machinery" }));
    fireEvent.click(screen.getByRole("button", { name: "Circle type Liquid H₂" }));

    expect(props.onChangeTerrainType).toHaveBeenNthCalledWith(1, "wall");
    expect(props.onChangeTerrainType).toHaveBeenNthCalledWith(2, "close-machinery");
    expect(props.onChangeTerrainType).toHaveBeenNthCalledWith(3, "liquid-hydrogen");
  });

  it("forwards existing-circle geometry, fill, type, and deletion", () => {
    const props = renderHud({
      circle: {
        id: "circle-1",
        shape: "circle",
        center: { x: 4, y: 6 },
        radius: 2.5,
        terrainType: "liquid-hydrogen",
        settings: { filled: true },
      },
    });

    fireEvent.change(screen.getByLabelText("Circle center x"), { target: { value: "7" } });
    fireEvent.change(screen.getByLabelText("Circle center y"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("Circle radius"), { target: { value: "3.25" } });
    fireEvent.click(screen.getByLabelText("Circle liquid hydrogen filled"));
    fireEvent.click(screen.getByRole("button", { name: "Circle type Wall" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Circle" }));

    expect(props.onUpdateCircle).toHaveBeenCalledWith({ center: { x: 7, y: 6 } });
    expect(props.onUpdateCircle).toHaveBeenCalledWith({ center: { x: 4, y: 8 } });
    expect(props.onUpdateCircle).toHaveBeenCalledWith({ radius: 3.25 });
    expect(props.onUpdateCircle).toHaveBeenCalledWith({ settings: { filled: false } });
    expect(props.onChangeTerrainType).toHaveBeenCalledWith("wall");
    expect(props.onDeleteCircle).toHaveBeenCalledTimes(1);
  });
});
