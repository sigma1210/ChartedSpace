/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { TacticalEditorLayersPanel } from "../TacticalEditorLayersPanel";
import type { TacticalEditorLayerGroup } from "../../lib/tacticalEditorLayers";

const groups: TacticalEditorLayerGroup[] = [{
  id: "areas",
  label: "Areas",
  objects: [{
    key: "terrain-region:sand-court",
    id: "sand-court",
    kind: "terrain-region",
    label: "Sand court",
    detail: "Sand · 4 segments",
    reorderable: true,
  }],
}];

describe("TacticalEditorLayersPanel", () => {
  it("synchronizes selection and exposes visibility, locking, and ordering controls", () => {
    const onSelect = jest.fn();
    const onToggleHidden = jest.fn();
    const onToggleLocked = jest.fn();
    const onMove = jest.fn();
    render(<TacticalEditorLayersPanel
      groups={groups}
      selectedKey={null}
      hiddenKeys={new Set()}
      lockedKeys={new Set()}
      onSelect={onSelect}
      onToggleHidden={onToggleHidden}
      onToggleLocked={onToggleLocked}
      onMove={onMove}
    />);

    fireEvent.click(screen.getByRole("button", { name: "Sand court" }));
    fireEvent.click(screen.getByRole("button", { name: "Hide Sand court" }));
    fireEvent.click(screen.getByRole("button", { name: "Lock Sand court" }));

    expect(onSelect).toHaveBeenCalledWith(groups[0].objects[0]);
    expect(onToggleHidden).toHaveBeenCalledWith(groups[0].objects[0]);
    expect(onToggleLocked).toHaveBeenCalledWith(groups[0].objects[0]);
    expect((screen.getByRole("button", { name: "Send Sand court backward" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Bring Sand court forward" }) as HTMLButtonElement).disabled).toBe(true);
    expect(onMove).not.toHaveBeenCalled();
  });

  it("collapses and restores a layer group", () => {
    render(<TacticalEditorLayersPanel
      groups={groups}
      selectedKey={null}
      hiddenKeys={new Set()}
      lockedKeys={new Set()}
      onSelect={jest.fn()}
      onToggleHidden={jest.fn()}
      onToggleLocked={jest.fn()}
      onMove={jest.fn()}
    />);

    const toggle = screen.getByRole("button", { name: "▾ Areas 1" });
    fireEvent.click(toggle);
    expect(screen.queryByRole("button", { name: "Sand court" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "▸ Areas 1" }));
    expect(screen.getByRole("button", { name: "Sand court" })).toBeTruthy();
  });

  it("uses visibly different symbols for unlocked and locked states", () => {
    const props = {
      groups,
      selectedKey: null,
      hiddenKeys: new Set<string>(),
      onSelect: jest.fn(),
      onToggleHidden: jest.fn(),
      onToggleLocked: jest.fn(),
      onMove: jest.fn(),
    };
    const { container, rerender } = render(<TacticalEditorLayersPanel {...props} lockedKeys={new Set()} />);

    expect(container.querySelector(".lucide-lock-open")).toBeTruthy();
    expect(container.querySelector(".lucide-lock-keyhole")).toBeNull();

    rerender(<TacticalEditorLayersPanel {...props} lockedKeys={new Set([groups[0].objects[0].key])} />);
    expect(container.querySelector(".lucide-lock-keyhole")).toBeTruthy();
    expect(container.querySelector(".lucide-lock-open")).toBeNull();
  });
});
