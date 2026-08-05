/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { PluginHudLayer } from "@/components/hud/PluginHudLayer";
import type { TacticalEditorLayerGroup } from "../tacticalEditorLayers";
import TacticalEditorLayersHud from "../TacticalEditorLayersHud";

const groups: TacticalEditorLayerGroup[] = [{
  id: "areas",
  label: "Areas",
  objects: [
    {
      key: "area:room-a",
      id: "room-a",
      kind: "area",
      label: "Room A",
      detail: "Interior",
      reorderable: true,
    },
    {
      key: "area:room-b",
      id: "room-b",
      kind: "area",
      label: "Room B",
      detail: "Interior",
      reorderable: true,
    },
  ],
}];

const renderHud = (overrides: Partial<React.ComponentProps<
  typeof TacticalEditorLayersHud
>> = {}) => {
  const props: React.ComponentProps<typeof TacticalEditorLayersHud> = {
    layout: { visible: true, pinned: false, position: { x: 20, y: 30 } },
    onLayoutChange: jest.fn(),
    groups,
    selectedKey: null,
    hiddenKeys: new Set(),
    lockedKeys: new Set(),
    onSelect: jest.fn(),
    onToggleHidden: jest.fn(),
    onToggleLocked: jest.fn(),
    onMove: jest.fn(),
    ...overrides,
  };
  render(<PluginHudLayer><TacticalEditorLayersHud {...props} /></PluginHudLayer>);
  return props;
};

describe("TacticalEditorLayersHud", () => {
  beforeAll(() => {
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  it("forwards pinning and collapsing layout changes", () => {
    const props = renderHud();

    fireEvent.click(screen.getByRole("button", { name: "Pin HUD" }));
    fireEvent.click(screen.getByRole("button", { name: "Collapse Layers" }));

    expect(props.onLayoutChange).toHaveBeenNthCalledWith(1, {
      ...props.layout,
      pinned: true,
    });
    expect(props.onLayoutChange).toHaveBeenNthCalledWith(2, {
      ...props.layout,
      visible: false,
    });
  });

  it("forwards layer selection, visibility, locking, and reordering", () => {
    const props = renderHud();
    const roomA = groups[0].objects[0];

    fireEvent.click(screen.getByRole("button", { name: "Room A" }));
    fireEvent.click(screen.getByRole("button", { name: "Hide Room A" }));
    fireEvent.click(screen.getByRole("button", { name: "Lock Room A" }));
    fireEvent.click(screen.getByRole("button", { name: "Bring Room A forward" }));

    expect(props.onSelect).toHaveBeenCalledWith(roomA);
    expect(props.onToggleHidden).toHaveBeenCalledWith(roomA);
    expect(props.onToggleLocked).toHaveBeenCalledWith(roomA);
    expect(props.onMove).toHaveBeenCalledWith(roomA, 1);
  });
});
