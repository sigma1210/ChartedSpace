/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { PluginHudLayer } from "@/components/hud/PluginHudLayer";
import type { TacticalDrawnArea } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import TacticalEditorAreaPropertiesHud from "../TacticalEditorAreaPropertiesHud";

const circleArea: TacticalDrawnArea = {
  id: "area-1",
  segments: [],
  geometry: { kind: "circle", center: { x: 5, y: 5 }, radius: 3 },
  surface: "grass",
  elevation: 1,
  boundary: "none",
};

const renderHud = (overrides: Partial<ComponentProps<
  typeof TacticalEditorAreaPropertiesHud
>> = {}) => {
  const props: ComponentProps<typeof TacticalEditorAreaPropertiesHud> = {
    layout: { visible: true, pinned: false, position: { x: 10, y: 10 } },
    onLayoutChange: jest.fn(),
    area: circleArea,
    nodeEditing: false,
    onUpdate: jest.fn(),
    onDelete: jest.fn(),
    ...overrides,
  };

  render(<PluginHudLayer><TacticalEditorAreaPropertiesHud {...props} /></PluginHudLayer>);
  return props;
};

describe("TacticalEditorAreaPropertiesHud", () => {
  beforeAll(() => {
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  it("shows circle guidance and forwards independent area settings", () => {
    const props = renderHud();

    expect(screen.getByText(/It always remains circular/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Area surface fill"), { target: { value: "sand" } });
    fireEvent.change(screen.getByLabelText("Area elevation level"), { target: { value: "2.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Lower area by half level" }));
    fireEvent.click(screen.getByRole("button", { name: "Raise area by half level" }));
    fireEvent.change(screen.getByLabelText("Area boundary"), { target: { value: "wall" } });
    fireEvent.change(screen.getByLabelText("Area use"), { target: { value: "crew-deployment" } });
    fireEvent.click(screen.getByRole("button", { name: "Delete area" }));

    expect(props.onUpdate).toHaveBeenCalledWith({ surface: "sand" });
    expect(props.onUpdate).toHaveBeenCalledWith({ elevation: 2.5 });
    expect(props.onUpdate).toHaveBeenCalledWith({ elevation: 0.5 });
    expect(props.onUpdate).toHaveBeenCalledWith({ elevation: 1.5 });
    expect(props.onUpdate).toHaveBeenCalledWith({ boundary: "wall" });
    expect(props.onUpdate).toHaveBeenCalledWith({ deployment: true });
    expect(props.onDelete).toHaveBeenCalledTimes(1);
  });

  it("shows node-edit guidance and forwards liquid-hydrogen fill", () => {
    const props = renderHud({
      area: {
        ...circleArea,
        geometry: undefined,
        surface: "liquid-hydrogen",
        settings: { filled: true },
      },
      nodeEditing: true,
    });

    expect(screen.getByText(/Double-click a segment to add a point/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Area liquid hydrogen filled"));

    expect(props.onUpdate).toHaveBeenCalledWith({ settings: { filled: false } });
  });
});
