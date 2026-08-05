/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { PluginHudLayer } from "@/components/hud/PluginHudLayer";
import TacticalEditorEnemyHud from "../TacticalEditorEnemyHud";

const renderHud = (overrides: Partial<ComponentProps<typeof TacticalEditorEnemyHud>> = {}) => {
  const props: ComponentProps<typeof TacticalEditorEnemyHud> = {
    layout: { visible: true, pinned: false, position: { x: 10, y: 10 } },
    onLayoutChange: jest.fn(),
    enemy: {
      id: "enemy-1",
      type: "gang-leader",
      name: "Red Jack",
      position: { x: 8, y: 12 },
      facing: "east",
      avatarPath: "/generated/avatars/enemy.png",
    },
    locked: false,
    onUnlock: jest.fn(),
    onRename: jest.fn(),
    onRotate: jest.fn(),
    onDelete: jest.fn(),
    ...overrides,
  };

  render(<PluginHudLayer><TacticalEditorEnemyHud {...props} /></PluginHudLayer>);
  return props;
};

describe("TacticalEditorEnemyHud", () => {
  beforeAll(() => {
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  it("shows enemy details and forwards editing actions", () => {
    const props = renderHud();

    expect(screen.getByText("Gang Leader")).toBeTruthy();
    expect(screen.getByText("Body Pistol · Knife")).toBeTruthy();
    expect(screen.getByText("Square 8, 12")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Rotate enemy 90 degrees" }).textContent)
      .toContain("Facing East · Rotate 90°");

    fireEvent.change(screen.getByLabelText("Enemy name"), {
      target: { value: "Red Jane" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Rotate enemy 90 degrees" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete enemy" }));

    expect(props.onRename).toHaveBeenCalledWith("Red Jane");
    expect(props.onRotate).toHaveBeenCalledTimes(1);
    expect(props.onDelete).toHaveBeenCalledTimes(1);
  });

  it("prevents editing a locked enemy and forwards unlock", () => {
    const props = renderHud({ locked: true });

    expect((screen.getByLabelText("Enemy name") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("button", {
      name: "Rotate enemy 90 degrees",
    }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Delete enemy" }) as HTMLButtonElement).disabled)
      .toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Unlock enemy" }));

    expect(props.onUnlock).toHaveBeenCalledTimes(1);
  });
});
