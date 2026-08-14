/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { PluginHudLayer } from "@/components/hud/PluginHudLayer";
import TacticalEditorWallPropertiesHud from "../TacticalEditorWallPropertiesHud";

describe("TacticalEditorWallPropertiesHud", () => {
  beforeAll(() => {
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  it("edits the wall level and explains that portals inherit it", () => {
    const onUpdate = jest.fn();
    const onDelete = jest.fn();
    render(<PluginHudLayer><TacticalEditorWallPropertiesHud
      layout={{ visible: true, pinned: false, position: { x: 10, y: 10 } }}
      onLayoutChange={jest.fn()}
      wall={{
        id: "wall-1",
        from: { x: 1, y: 1 },
        to: { x: 5, y: 1 },
        elevation: 1,
        portals: [{ id: "door-1", kind: "sliding-door", position: 0.5 }],
      }}
      onUpdate={onUpdate}
      onDelete={onDelete}
    /></PluginHudLayer>);

    expect(screen.getByText(/every door and iris valve/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Wall elevation level"), { target: { value: "2.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Lower wall by half level" }));
    fireEvent.click(screen.getByRole("button", { name: "Raise wall by half level" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete wall" }));

    expect(onUpdate).toHaveBeenCalledWith({ elevation: 2.5 });
    expect(onUpdate).toHaveBeenCalledWith({ elevation: 0.5 });
    expect(onUpdate).toHaveBeenCalledWith({ elevation: 1.5 });
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("defaults legacy walls to level zero and ignores non-half-level input", () => {
    const onUpdate = jest.fn();
    render(<PluginHudLayer><TacticalEditorWallPropertiesHud
      layout={{ visible: true, pinned: false, position: { x: 10, y: 10 } }}
      onLayoutChange={jest.fn()}
      wall={{ id: "legacy-wall", from: { x: 1, y: 1 }, to: { x: 5, y: 1 } }}
      onUpdate={onUpdate}
      onDelete={jest.fn()}
    /></PluginHudLayer>);

    const level = screen.getByLabelText("Wall elevation level") as HTMLInputElement;
    expect(level.value).toBe("0");
    fireEvent.change(level, { target: { value: "0.3" } });
    fireEvent.blur(level);

    expect(onUpdate).not.toHaveBeenCalled();
    expect(level.value).toBe("0");
  });
});
