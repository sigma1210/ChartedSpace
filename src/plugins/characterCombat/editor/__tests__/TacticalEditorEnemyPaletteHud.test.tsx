/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { PluginHudLayer } from "@/components/hud/PluginHudLayer";
import TacticalEditorEnemyPaletteHud from "../TacticalEditorEnemyPaletteHud";

const renderHud = (overrides: Partial<ComponentProps<
  typeof TacticalEditorEnemyPaletteHud
>> = {}) => {
  const props: ComponentProps<typeof TacticalEditorEnemyPaletteHud> = {
    layout: { visible: true, pinned: false, position: { x: 10, y: 10 } },
    onLayoutChange: jest.fn(),
    activeEnemyType: null,
    onActivateEnemyType: jest.fn(),
    ...overrides,
  };

  render(<PluginHudLayer><TacticalEditorEnemyPaletteHud {...props} /></PluginHudLayer>);
  return props;
};

describe("TacticalEditorEnemyPaletteHud", () => {
  beforeAll(() => {
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  it("shows enemy equipment and marks the active type", () => {
    renderHud({ activeEnemyType: "gang-leader" });

    expect(screen.getByText("Knife")).toBeTruthy();
    expect(screen.getByText("Body Pistol · Knife")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Gang Member/ }).getAttribute("aria-pressed"))
      .toBe("false");
    expect(screen.getByRole("button", { name: /Gang Leader/ }).getAttribute("aria-pressed"))
      .toBe("true");
  });

  it("forwards both enemy-type selections", () => {
    const props = renderHud();

    fireEvent.click(screen.getByRole("button", { name: /Gang Member/ }));
    fireEvent.click(screen.getByRole("button", { name: /Gang Leader/ }));

    expect(props.onActivateEnemyType).toHaveBeenNthCalledWith(1, "gang-member");
    expect(props.onActivateEnemyType).toHaveBeenNthCalledWith(2, "gang-leader");
  });
});
